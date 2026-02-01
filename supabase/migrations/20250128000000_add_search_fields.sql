-- ============================================
-- 投稿モデルに検索特化フィールドを追加
-- SEOで勝てる検索クエリを増やすため
-- ============================================

-- ============================================
-- 1. カラムの追加
-- ============================================
ALTER TABLE public.recovery_posts 
ADD COLUMN IF NOT EXISTS age_at_that_time INTEGER;

ALTER TABLE public.recovery_posts 
ADD COLUMN IF NOT EXISTS debt_amount INTEGER;

ALTER TABLE public.recovery_posts 
ADD COLUMN IF NOT EXISTS unemployed_months INTEGER;

ALTER TABLE public.recovery_posts 
ADD COLUMN IF NOT EXISTS recovery_months INTEGER;

-- ============================================
-- 2. インデックスの追加（検索性能向上）
-- ============================================

-- 年齢での検索用
CREATE INDEX IF NOT EXISTS idx_recovery_posts_age_at_that_time 
ON public.recovery_posts(age_at_that_time) 
WHERE age_at_that_time IS NOT NULL;

-- 借金額での検索用（借金カテゴリの投稿で特に有効）
CREATE INDEX IF NOT EXISTS idx_recovery_posts_debt_amount 
ON public.recovery_posts(debt_amount) 
WHERE debt_amount IS NOT NULL;

-- 無職期間での検索用（失業カテゴリの投稿で特に有効）
CREATE INDEX IF NOT EXISTS idx_recovery_posts_unemployed_months 
ON public.recovery_posts(unemployed_months) 
WHERE unemployed_months IS NOT NULL;

-- 回復期間での検索用
CREATE INDEX IF NOT EXISTS idx_recovery_posts_recovery_months 
ON public.recovery_posts(recovery_months) 
WHERE recovery_months IS NOT NULL;

-- 複合インデックス（カテゴリ + 年齢 + 借金額）
CREATE INDEX IF NOT EXISTS idx_posts_category_age_debt 
ON public.recovery_posts(problem_category, age_at_that_time, debt_amount) 
WHERE problem_category = 'debt' AND age_at_that_time IS NOT NULL AND debt_amount IS NOT NULL;

-- 複合インデックス（カテゴリ + 無職期間）
CREATE INDEX IF NOT EXISTS idx_posts_category_unemployed_months 
ON public.recovery_posts(problem_category, unemployed_months) 
WHERE problem_category = 'unemployed' AND unemployed_months IS NOT NULL;

-- ============================================
-- 3. コメントの追加（単位を明示）
-- ============================================
COMMENT ON COLUMN public.recovery_posts.age_at_that_time IS 'その時の年齢（SEO検索用）';
COMMENT ON COLUMN public.recovery_posts.debt_amount IS '借金額（万円単位、SEO検索用）。注意: 万円単位で保存すること。例: 300万円の場合は300を保存';
COMMENT ON COLUMN public.recovery_posts.unemployed_months IS '無職期間（月単位、SEO検索用）。例: 1年間の場合は12を保存';
COMMENT ON COLUMN public.recovery_posts.recovery_months IS '回復期間（月単位、SEO検索用）。例: 2年間の場合は24を保存';

-- ============================================
-- 4. RPC関数の更新（create_recovery_post）
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
  p_tag_names TEXT[],
  p_age_at_that_time INTEGER DEFAULT NULL,
  p_debt_amount INTEGER DEFAULT NULL,
  p_unemployed_months INTEGER DEFAULT NULL,
  p_recovery_months INTEGER DEFAULT NULL
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
  v_post_created_at TIMESTAMPTZ;
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

  -- 親投稿の作成（動的SQLにすることで RETURNS TABLE の created_at と衝突しない）
  EXECUTE format(
    'INSERT INTO public.recovery_posts (
      user_id,
      title,
      summary,
      problem_category,
      phase_at_post,
      started_at,
      recovered_at,
      current_status,
      age_at_that_time,
      debt_amount,
      unemployed_months,
      recovery_months
    ) VALUES (
      %L,
      %L, %L, %L::problem_category_enum, %s, %L, %L, %L, %s, %s, %s, %s
    )
    RETURNING id, created_at',
    auth.uid(),
    p_title, p_summary, p_problem_category, p_phase_at_post, p_started_at, p_recovered_at,
    p_current_status, p_age_at_that_time, p_debt_amount, p_unemployed_months, p_recovery_months
  ) INTO v_post_id, v_post_created_at;

  -- ステップの作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure,
      failed_reason
    ) VALUES (
      v_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReason', '') -- 空文字列はNULLに変換
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
  RETURN QUERY SELECT v_post_id, v_post_created_at;
END;
$$;

-- ============================================
-- 5. RPC関数の更新（update_recovery_post）
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
  p_tag_names TEXT[],
  p_age_at_that_time INTEGER DEFAULT NULL,
  p_debt_amount INTEGER DEFAULT NULL,
  p_unemployed_months INTEGER DEFAULT NULL,
  p_recovery_months INTEGER DEFAULT NULL
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

  -- 投稿の更新（検索特化フィールドを含む）
  UPDATE public.recovery_posts
  SET
    title = p_title,
    summary = p_summary,
    problem_category = p_problem_category,
    phase_at_post = p_phase_at_post,
    started_at = p_started_at,
    recovered_at = p_recovered_at,
    current_status = p_current_status,
    age_at_that_time = p_age_at_that_time,
    debt_amount = p_debt_amount,
    unemployed_months = p_unemployed_months,
    recovery_months = p_recovery_months,
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
      is_failure,
      failed_reason
    ) VALUES (
      p_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReason', '') -- 空文字列はNULLに変換
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

  -- 新しいタグを作成と関連付け（#なしで保存）
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
