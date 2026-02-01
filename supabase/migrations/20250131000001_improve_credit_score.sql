-- ============================================
-- 信用スコア v1.5: 設定テーブル化と再計算機能
-- ============================================

-- ============================================
-- 1. 信用スコア設定テーブル（調整可能にする）
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_score_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- シングルトン
  post_weight INTEGER NOT NULL DEFAULT 10,
  reaction_weight INTEGER NOT NULL DEFAULT 5,
  recovery_bonus INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初期データ投入
INSERT INTO public.credit_score_settings (id, post_weight, reaction_weight, recovery_bonus)
VALUES (1, 10, 5, 100)
ON CONFLICT (id) DO NOTHING;

-- コメント
COMMENT ON TABLE public.credit_score_settings IS '信用スコア計算設定（調整可能）。シングルトン。';
COMMENT ON COLUMN public.credit_score_settings.post_weight IS '投稿1件あたりのポイント';
COMMENT ON COLUMN public.credit_score_settings.reaction_weight IS 'リアクション1件あたりのポイント';
COMMENT ON COLUMN public.credit_score_settings.recovery_bonus IS '回復完了時のボーナスポイント';

-- ============================================
-- 2. 信用スコア計算関数を設定テーブル参照に変更
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_credit_score(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COALESCE(
      (us.published_posts_count * css.post_weight) +
      (us.reactions_received * css.reaction_weight) +
      (CASE WHEN us.recovery_completed THEN css.recovery_bonus ELSE 0 END),
      0
    )::INTEGER
  FROM public.user_stats us
  CROSS JOIN public.credit_score_settings css
  WHERE us.user_id = p_user_id
    AND css.id = 1;
$$;

COMMENT ON FUNCTION public.calculate_credit_score IS '信用スコアを計算する（設定テーブル参照）。調整可能。';

-- ============================================
-- 3. 統計再計算関数（トリガー地獄対策）
-- ============================================
CREATE OR REPLACE FUNCTION public.rebuild_user_stats(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  published_posts_count INTEGER,
  reactions_received INTEGER,
  recovery_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_published_posts_count INTEGER;
  v_reactions_received INTEGER;
  v_recovery_completed BOOLEAN;
BEGIN
  -- 投稿数を再計算
  SELECT COUNT(*) INTO v_published_posts_count
  FROM public.recovery_posts
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- リアクション数を再計算
  SELECT COUNT(*) INTO v_reactions_received
  FROM public.reactions r
  JOIN public.recovery_posts rp ON rp.id = r.post_id
  WHERE rp.user_id = p_user_id AND rp.deleted_at IS NULL;

  -- 回復完了フラグを再計算
  SELECT EXISTS(
    SELECT 1 FROM public.recovery_posts
    WHERE user_id = p_user_id 
      AND phase_at_post = 3
      AND deleted_at IS NULL
  ) INTO v_recovery_completed;

  -- 統計を更新または作成
  INSERT INTO public.user_stats (
    user_id,
    published_posts_count,
    reactions_received,
    recovery_completed,
    updated_at
  )
  VALUES (
    p_user_id,
    v_published_posts_count,
    v_reactions_received,
    v_recovery_completed,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    published_posts_count = v_published_posts_count,
    reactions_received = v_reactions_received,
    recovery_completed = v_recovery_completed,
    updated_at = NOW();

  -- 戻り値
  RETURN QUERY
  SELECT 
    p_user_id,
    v_published_posts_count,
    v_reactions_received,
    v_recovery_completed;
END;
$$;

COMMENT ON FUNCTION public.rebuild_user_stats IS 'ユーザー統計を再計算する（トリガー地獄対策）。壊れたら再計算できる保険。';

-- ============================================
-- 4. 全ユーザーの統計を再計算する関数（管理者用）
-- ============================================
CREATE OR REPLACE FUNCTION public.rebuild_all_user_stats()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_user_id IN SELECT id FROM public.users
  LOOP
    PERFORM public.rebuild_user_stats(v_user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.rebuild_all_user_stats IS '全ユーザーの統計を再計算する（管理者用）。大量データ時は注意。';

-- ============================================
-- 5. RLSポリシー（設定テーブルは読み取り専用）
-- ============================================
ALTER TABLE public.credit_score_settings ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "credit_score_settings_select_all" ON public.credit_score_settings
  FOR SELECT USING (true);

-- 更新は管理者のみ（RLSポリシー未設定のため、デフォルトで拒否）
