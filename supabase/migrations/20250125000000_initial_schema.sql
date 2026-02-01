-- ============================================
-- Restart Atlas 初期スキーマ（MVP）
-- 設計思想: 投稿が主役、匿名前提、拡張可能
-- ============================================

-- ============================================
-- ① users（匿名ユーザー）
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phase_level INTEGER NOT NULL DEFAULT 1 CHECK (phase_level >= 1 AND phase_level <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_phase_level ON public.users(phase_level);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- コメント
COMMENT ON TABLE public.users IS '匿名ユーザー（プロフィールは極限まで薄く）';
COMMENT ON COLUMN public.users.display_name IS '表示名（NULL可）。未設定の場合はUI側で「匿名ユーザーXXXX」と表示';
COMMENT ON COLUMN public.users.phase_level IS '自己申告のフェーズレベル（1〜3）。Lv3ユーザーは将来メンター化可能';

-- ============================================
-- ② recovery_posts（核）
-- ============================================
-- 問題カテゴリのENUM型定義（長期運用を考慮）
CREATE TYPE problem_category_enum AS ENUM (
  'debt',
  'unemployed',
  'dropout',
  'addiction',
  'relationship'
);

CREATE TABLE IF NOT EXISTS public.recovery_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem_category problem_category_enum NOT NULL,
  phase_at_post INTEGER NOT NULL CHECK (phase_at_post >= 1 AND phase_at_post <= 3),
  started_at DATE,
  recovered_at DATE,
  current_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- created_atのimmutable前提を明文化
COMMENT ON COLUMN public.recovery_posts.created_at IS '作成日時（UTC、immutable）。重要: このカラムは更新されない前提でcursor paginationが設計されている。更新でcreated_atが変わるとカーソルが破綻する。';

-- インデックス（検索性最優先）
CREATE INDEX IF NOT EXISTS idx_recovery_posts_user_id ON public.recovery_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_posts_problem_category ON public.recovery_posts(problem_category);
CREATE INDEX IF NOT EXISTS idx_recovery_posts_phase_at_post ON public.recovery_posts(phase_at_post);
CREATE INDEX IF NOT EXISTS idx_recovery_posts_started_at ON public.recovery_posts(started_at);
CREATE INDEX IF NOT EXISTS idx_recovery_posts_recovered_at ON public.recovery_posts(recovered_at);
CREATE INDEX IF NOT EXISTS idx_recovery_posts_created_at ON public.recovery_posts(created_at DESC);

-- 複合インデックス（一覧ページの8割のクエリがこれに対応、SEOページで特に効く）
CREATE INDEX IF NOT EXISTS idx_posts_category_phase_created ON public.recovery_posts(problem_category, phase_at_post, created_at DESC);

-- 全文検索用（将来の拡張）
-- 注意: 日本語全文検索を使用する場合は、Supabaseでpgroonga拡張機能を有効化するか、
-- または'simple'を使用してください: to_tsvector('simple', title)
-- エラーが発生する場合は、この2行をコメントアウトしてください
-- 現在はコメントアウト中（Supabaseのデフォルト設定では日本語全文検索が利用できないため）
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_title_gin ON public.recovery_posts USING gin(to_tsvector('japanese', title));
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_summary_gin ON public.recovery_posts USING gin(to_tsvector('japanese', summary));

-- 代替案: 'simple'を使用する場合（日本語の精度は下がりますが、エラーは発生しません）
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_title_gin ON public.recovery_posts USING gin(to_tsvector('simple', title));
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_summary_gin ON public.recovery_posts USING gin(to_tsvector('simple', summary));

-- コメント
COMMENT ON TABLE public.recovery_posts IS '回復投稿（核となるテーブル）';
COMMENT ON COLUMN public.recovery_posts.problem_category IS '問題カテゴリ（1投稿1テーマ）';
COMMENT ON COLUMN public.recovery_posts.phase_at_post IS '投稿時の状態（1〜3）';
COMMENT ON COLUMN public.recovery_posts.started_at IS '詰み始めた時期';
COMMENT ON COLUMN public.recovery_posts.recovered_at IS '回復した時期（nullable）';

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recovery_posts_updated_at
  BEFORE UPDATE ON public.recovery_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ③ recovery_steps（回復プロセス）
-- ============================================
CREATE TABLE IF NOT EXISTS public.recovery_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order >= 1),
  content TEXT NOT NULL,
  is_failure BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_recovery_steps_post_id ON public.recovery_steps(post_id);
CREATE INDEX IF NOT EXISTS idx_recovery_steps_is_failure ON public.recovery_steps(is_failure);
CREATE INDEX IF NOT EXISTS idx_recovery_steps_post_order ON public.recovery_steps(post_id, step_order);

-- ユニーク制約（1投稿内で順序が重複しない）
CREATE UNIQUE INDEX IF NOT EXISTS idx_recovery_steps_post_order_unique ON public.recovery_steps(post_id, step_order);

-- コメント
COMMENT ON TABLE public.recovery_steps IS '回復プロセス（やったことを分離）';
COMMENT ON COLUMN public.recovery_steps.is_failure IS '失敗行動か？将来「やるなランキング」が作れる';

-- ============================================
-- ④ regions（全国網羅の要）
-- ============================================
CREATE TABLE IF NOT EXISTS public.regions (
  id SERIAL PRIMARY KEY,
  prefecture TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prefecture, city)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_regions_prefecture ON public.regions(prefecture);
CREATE INDEX IF NOT EXISTS idx_regions_city ON public.regions(city);

-- コメント
COMMENT ON TABLE public.regions IS '地域マスタ（SEO最強要素）';
COMMENT ON COLUMN public.regions.city IS '最初は都道府県のみでもOK';

-- ============================================
-- ⑤ post_regions（投稿と地域の関連）
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_regions (
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  region_id INTEGER NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, region_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_post_regions_post_id ON public.post_regions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_regions_region_id ON public.post_regions(region_id);

-- ============================================
-- ⑥ tags（横断検索）
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);

-- コメント
COMMENT ON TABLE public.tags IS 'タグマスタ（例: 25歳、借金300万、実家暮らし、IT転職）。注意: #はDBに保存せず、表示時に付与する';
COMMENT ON COLUMN public.tags.name IS 'タグ名（#なし）。表示時に#を付与して「#25歳」のように表示';

-- ============================================
-- ⑦ post_tags（投稿とタグの関連）
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON public.post_tags(tag_id);

-- ============================================
-- ⑧ comments（共感装置）
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- コメント
COMMENT ON TABLE public.comments IS 'コメント（共感装置）。Lv3ユーザーのコメントは将来強調表示可能';

-- ============================================
-- ⑨ reactions（応援・信用）
-- ============================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('empathy', 'respect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON public.reactions(type);

-- コメント
COMMENT ON TABLE public.reactions IS 'リアクション（いいね禁止。感情を限定するのが重要）';

-- ============================================
-- RLS（Row Level Security）ポリシー
-- ============================================

-- usersテーブルのRLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- users: 全員が閲覧可能、本人のみ更新可能
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- recovery_postsテーブルのRLS
ALTER TABLE public.recovery_posts ENABLE ROW LEVEL SECURITY;

-- recovery_posts: 全員が閲覧可能、本人のみ作成・更新・削除可能
CREATE POLICY "recovery_posts_select_all" ON public.recovery_posts
  FOR SELECT USING (true);

CREATE POLICY "recovery_posts_insert_own" ON public.recovery_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recovery_posts_update_own" ON public.recovery_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "recovery_posts_delete_own" ON public.recovery_posts
  FOR DELETE USING (auth.uid() = user_id);

-- recovery_stepsテーブルのRLS
ALTER TABLE public.recovery_steps ENABLE ROW LEVEL SECURITY;

-- recovery_steps: 全員が閲覧可能、投稿の所有者のみ作成・更新・削除可能
CREATE POLICY "recovery_steps_select_all" ON public.recovery_steps
  FOR SELECT USING (true);

CREATE POLICY "recovery_steps_insert_own_post" ON public.recovery_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = recovery_steps.post_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "recovery_steps_update_own_post" ON public.recovery_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = recovery_steps.post_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "recovery_steps_delete_own_post" ON public.recovery_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = recovery_steps.post_id
      AND user_id = auth.uid()
    )
  );

-- regionsテーブルのRLS（読み取り専用）
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions_select_all" ON public.regions
  FOR SELECT USING (true);

-- post_regionsテーブルのRLS
ALTER TABLE public.post_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_regions_select_all" ON public.post_regions
  FOR SELECT USING (true);

CREATE POLICY "post_regions_insert_own_post" ON public.post_regions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = post_regions.post_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "post_regions_delete_own_post" ON public.post_regions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = post_regions.post_id
      AND user_id = auth.uid()
    )
  );

-- tagsテーブルのRLS（読み取り専用）
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_all" ON public.tags
  FOR SELECT USING (true);

-- post_tagsテーブルのRLS
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_tags_select_all" ON public.post_tags
  FOR SELECT USING (true);

CREATE POLICY "post_tags_insert_own_post" ON public.post_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = post_tags.post_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "post_tags_delete_own_post" ON public.post_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recovery_posts
      WHERE id = post_tags.post_id
      AND user_id = auth.uid()
    )
  );

-- commentsテーブルのRLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- comments: 全員が閲覧可能、ログインユーザーが作成可能、本人のみ削除可能
CREATE POLICY "comments_select_all" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_authenticated" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- reactionsテーブルのRLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- reactions: 全員が閲覧可能、ログインユーザーが作成可能、本人のみ削除可能
CREATE POLICY "reactions_select_all" ON public.reactions
  FOR SELECT USING (true);

CREATE POLICY "reactions_insert_authenticated" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 初期データ（regions: 都道府県のみ）
-- ============================================
INSERT INTO public.regions (prefecture, city) VALUES
  ('北海道', NULL),
  ('青森県', NULL),
  ('岩手県', NULL),
  ('宮城県', NULL),
  ('秋田県', NULL),
  ('山形県', NULL),
  ('福島県', NULL),
  ('茨城県', NULL),
  ('栃木県', NULL),
  ('群馬県', NULL),
  ('埼玉県', NULL),
  ('千葉県', NULL),
  ('東京都', NULL),
  ('神奈川県', NULL),
  ('新潟県', NULL),
  ('富山県', NULL),
  ('石川県', NULL),
  ('福井県', NULL),
  ('山梨県', NULL),
  ('長野県', NULL),
  ('岐阜県', NULL),
  ('静岡県', NULL),
  ('愛知県', NULL),
  ('三重県', NULL),
  ('滋賀県', NULL),
  ('京都府', NULL),
  ('大阪府', NULL),
  ('兵庫県', NULL),
  ('奈良県', NULL),
  ('和歌山県', NULL),
  ('鳥取県', NULL),
  ('島根県', NULL),
  ('岡山県', NULL),
  ('広島県', NULL),
  ('山口県', NULL),
  ('徳島県', NULL),
  ('香川県', NULL),
  ('愛媛県', NULL),
  ('高知県', NULL),
  ('福岡県', NULL),
  ('佐賀県', NULL),
  ('長崎県', NULL),
  ('熊本県', NULL),
  ('大分県', NULL),
  ('宮崎県', NULL),
  ('鹿児島県', NULL),
  ('沖縄県', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- RPC関数: 投稿作成（トランザクション処理）
-- ============================================
CREATE OR REPLACE FUNCTION public.create_recovery_post(
  p_title TEXT,
  p_summary TEXT,
  p_problem_category problem_category_enum,
  p_phase_at_post INTEGER,
  p_started_at DATE,
  p_recovered_at DATE,
  p_current_status TEXT,
  p_steps JSONB,
  p_region_ids INTEGER[],
  p_tag_names TEXT[]
)
RETURNS TABLE (
  post_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id UUID;
  v_created_at TIMESTAMPTZ;
  v_tag_id UUID;
  v_tag_name TEXT;
  v_step JSONB;
  v_step_order INTEGER;
BEGIN
  -- バリデーション: ステップが最低1つ必要
  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING
      message = 'ステップは最低1つ必要です',
      errcode = 'P1001';
  END IF;

  -- バリデーション: ステップ順序のチェック
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  -- 親投稿の作成
  INSERT INTO public.recovery_posts (
    user_id,
    title,
    summary,
    problem_category,
    phase_at_post,
    started_at,
    recovered_at,
    current_status
  ) VALUES (
    auth.uid(),
    p_title,
    p_summary,
    p_problem_category,
    p_phase_at_post,
    p_started_at,
    p_recovered_at,
    p_current_status
  )
  RETURNING id, created_at INTO v_post_id, v_created_at;

  -- ステップの作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure
    ) VALUES (
      v_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE)
    );
  END LOOP;

  -- 地域の関連付け
  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT v_post_id, unnest(p_region_ids);
  END IF;

  -- タグの作成と関連付け（#なしで保存）
  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      -- タグが存在しない場合は作成（#を除去して保存）
      INSERT INTO public.tags (name)
      VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;

      -- タグIDを取得
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);

      -- 投稿とタグを関連付け
      INSERT INTO public.post_tags (post_id, tag_id)
      VALUES (v_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT v_post_id, v_created_at;
END;
$$;

-- RPC関数のコメント
COMMENT ON FUNCTION public.create_recovery_post IS '回復投稿をトランザクションで作成する。失敗時は全ロールバック。戻り値: post_id, created_at';

-- ============================================
-- RPC関数: 投稿更新（トランザクション処理）
-- ============================================
CREATE OR REPLACE FUNCTION public.update_recovery_post(
  p_post_id UUID,
  p_title TEXT,
  p_summary TEXT,
  p_problem_category problem_category_enum,
  p_phase_at_post INTEGER,
  p_started_at DATE,
  p_recovered_at DATE,
  p_current_status TEXT,
  p_steps JSONB,
  p_region_ids INTEGER[],
  p_tag_names TEXT[]
)
RETURNS TABLE (
  post_id UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ;
  v_tag_id UUID;
  v_tag_name TEXT;
  v_step JSONB;
  v_step_order INTEGER;
BEGIN
  -- バリデーション: 投稿の所有者チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、編集権限がありません',
      errcode = 'P2001';
  END IF;

  -- バリデーション: ステップが最低1つ必要
  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING
      message = 'ステップは最低1つ必要です',
      errcode = 'P1001';
  END IF;

  -- バリデーション: ステップ順序のチェック
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  -- 投稿の更新
  UPDATE public.recovery_posts
  SET
    title = p_title,
    summary = p_summary,
    problem_category = p_problem_category,
    phase_at_post = p_phase_at_post,
    started_at = p_started_at,
    recovered_at = p_recovered_at,
    current_status = p_current_status,
    updated_at = NOW()
  WHERE id = p_post_id AND user_id = auth.uid()
  RETURNING updated_at INTO v_updated_at;

  -- 既存のステップを削除
  DELETE FROM public.recovery_steps WHERE post_id = p_post_id;

  -- 新しいステップを作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure
    ) VALUES (
      p_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE)
    );
  END LOOP;

  -- 既存の地域関連を削除
  DELETE FROM public.post_regions WHERE post_id = p_post_id;

  -- 新しい地域関連を作成
  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT p_post_id, unnest(p_region_ids);
  END IF;

  -- 既存のタグ関連を削除
  DELETE FROM public.post_tags WHERE post_id = p_post_id;

  -- 新しいタグ関連を作成
  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      -- タグが存在しない場合は作成（#を除去して保存）
      INSERT INTO public.tags (name)
      VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;

      -- タグIDを取得
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);

      -- 投稿とタグを関連付け
      INSERT INTO public.post_tags (post_id, tag_id)
      VALUES (p_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT p_post_id, v_updated_at;
END;
$$;

-- RPC関数のコメント
COMMENT ON FUNCTION public.update_recovery_post IS '回復投稿をトランザクションで更新する。失敗時は全ロールバック。戻り値: post_id, updated_at';
