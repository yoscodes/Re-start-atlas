-- ============================================
-- 信用スコア v1: 実績ベースの上下関係
-- ============================================

-- ============================================
-- 1. user_statsテーブルの作成
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  published_posts_count INTEGER NOT NULL DEFAULT 0,
  reactions_received INTEGER NOT NULL DEFAULT 0,
  recovery_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_stats_published_posts_count 
ON public.user_stats(published_posts_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_reactions_received 
ON public.user_stats(reactions_received DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_recovery_completed 
ON public.user_stats(recovery_completed);

-- コメント
COMMENT ON TABLE public.user_stats IS 'ユーザー統計（信用スコア計算用）';
COMMENT ON COLUMN public.user_stats.published_posts_count IS '投稿数（実績ベース）';
COMMENT ON COLUMN public.user_stats.reactions_received IS '受け取ったリアクション数（共感・尊敬）';
COMMENT ON COLUMN public.user_stats.recovery_completed IS '回復完了フラグ（フェーズ3に到達したか）';

-- ============================================
-- 2. 初期データの投入（既存ユーザー用）
-- ============================================
INSERT INTO public.user_stats (user_id, published_posts_count, reactions_received, recovery_completed)
SELECT 
  u.id,
  COALESCE(COUNT(DISTINCT rp.id), 0) as published_posts_count,
  COALESCE(COUNT(DISTINCT r.id), 0) as reactions_received,
  EXISTS(
    SELECT 1 FROM public.recovery_posts rp2
    WHERE rp2.user_id = u.id AND rp2.phase_at_post = 3
  ) as recovery_completed
FROM public.users u
LEFT JOIN public.recovery_posts rp ON rp.user_id = u.id AND rp.deleted_at IS NULL
LEFT JOIN public.reactions r ON r.post_id = rp.id
GROUP BY u.id
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. 信用スコア計算関数
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
      (us.published_posts_count * 10) + -- 投稿1件 = 10ポイント
      (us.reactions_received * 5) +     -- リアクション1件 = 5ポイント
      (CASE WHEN us.recovery_completed THEN 100 ELSE 0 END), -- 回復完了 = 100ポイント
      0
    )::INTEGER
  FROM public.user_stats us
  WHERE us.user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.calculate_credit_score IS '信用スコアを計算する（投稿数×10 + リアクション数×5 + 回復完了×100）';

-- ============================================
-- 4. 統計更新用のヘルパー関数
-- ============================================
CREATE OR REPLACE FUNCTION public.update_user_stats_posts(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, published_posts_count, updated_at)
  VALUES (
    p_user_id,
    1,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    published_posts_count = public.user_stats.published_posts_count + 1,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_user_stats_posts(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET
    published_posts_count = GREATEST(published_posts_count - 1, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_stats_reactions(
  p_post_id UUID,
  p_increment INTEGER -- 1 or -1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 投稿の所有者を取得
  SELECT user_id INTO v_user_id
  FROM public.recovery_posts
  WHERE id = p_post_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 統計を更新
  INSERT INTO public.user_stats (user_id, reactions_received, updated_at)
  VALUES (
    v_user_id,
    p_increment,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    reactions_received = GREATEST(reactions_received + p_increment, 0),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_stats_recovery_completed(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- フェーズ3の投稿があるかチェック
  IF EXISTS(
    SELECT 1 FROM public.recovery_posts
    WHERE user_id = p_user_id 
      AND phase_at_post = 3
      AND deleted_at IS NULL
  ) THEN
    UPDATE public.user_stats
    SET
      recovery_completed = TRUE,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- ============================================
-- 5. トリガー: 投稿作成時に統計を更新
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_user_stats_on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 投稿数を増やす
  PERFORM public.update_user_stats_posts(NEW.user_id);
  
  -- フェーズ3の投稿なら回復完了フラグを更新
  IF NEW.phase_at_post = 3 THEN
    PERFORM public.update_user_stats_recovery_completed(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_stats_on_post_insert
  AFTER INSERT ON public.recovery_posts
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.trigger_update_user_stats_on_post_insert();

-- ============================================
-- 6. トリガー: 投稿更新時に統計を更新（フェーズ変更時）
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_user_stats_on_post_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- フェーズが3になった場合、回復完了フラグを更新
  IF NEW.phase_at_post = 3 AND OLD.phase_at_post != 3 AND NEW.deleted_at IS NULL THEN
    PERFORM public.update_user_stats_recovery_completed(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_stats_on_post_update
  AFTER UPDATE ON public.recovery_posts
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.trigger_update_user_stats_on_post_update();

-- ============================================
-- 7. トリガー: 投稿削除時に統計を更新
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_user_stats_on_post_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 投稿数を減らす
  PERFORM public.decrement_user_stats_posts(OLD.user_id);
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER update_user_stats_on_post_delete
  AFTER UPDATE ON public.recovery_posts
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_user_stats_on_post_delete();

-- ============================================
-- 8. トリガー: リアクション作成時に統計を更新
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_user_stats_on_reaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- リアクション数を増やす
  PERFORM public.update_user_stats_reactions(NEW.post_id, 1);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_stats_on_reaction_insert
  AFTER INSERT ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_stats_on_reaction_insert();

-- ============================================
-- 9. トリガー: リアクション削除時に統計を更新
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_user_stats_on_reaction_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- リアクション数を減らす
  PERFORM public.update_user_stats_reactions(OLD.post_id, -1);
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER update_user_stats_on_reaction_delete
  AFTER DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_stats_on_reaction_delete();

-- ============================================
-- 10. ユーザー作成時に統計レコードを自動作成
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_create_user_stats_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_user_stats_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_user_stats_on_user_insert();

-- ============================================
-- 11. RLSポリシー
-- ============================================
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "user_stats_select_all" ON public.user_stats
  FOR SELECT USING (true);

-- 更新はシステムのみ（トリガー経由）
