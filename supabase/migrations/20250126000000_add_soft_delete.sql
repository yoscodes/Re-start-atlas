-- ============================================
-- 投稿削除（論理削除）機能の追加
-- ============================================

-- ============================================
-- 1. deleted_atカラムの追加
-- ============================================
ALTER TABLE public.recovery_posts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- インデックス追加（削除されていない投稿の検索を高速化）
CREATE INDEX IF NOT EXISTS idx_recovery_posts_deleted_at 
ON public.recovery_posts(deleted_at) 
WHERE deleted_at IS NULL;

-- コメント
COMMENT ON COLUMN public.recovery_posts.deleted_at IS '論理削除日時（NULLの場合は削除されていない）';

-- ============================================
-- 2. RLSポリシーの更新（deleted_at IS NULL条件を追加）
-- ============================================

-- 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "recovery_posts_select_all" ON public.recovery_posts;

-- 新しいSELECTポリシー（削除されていない投稿のみ表示）
CREATE POLICY "recovery_posts_select_not_deleted" ON public.recovery_posts
  FOR SELECT USING (deleted_at IS NULL);

-- ============================================
-- 3. RPC関数: 投稿削除（論理削除）
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_recovery_post(
  p_post_id UUID
)
RETURNS TABLE (
  post_id UUID,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
BEGIN
  -- 権限チェック: 投稿の所有者のみ削除可能
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id 
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、削除権限がありません',
      errcode = 'P2001';
  END IF;

  -- 論理削除（deleted_atを設定）
  UPDATE public.recovery_posts
  SET deleted_at = NOW()
  WHERE id = p_post_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  RETURNING deleted_at INTO v_deleted_at;

  -- 削除が実行されなかった場合（既に削除されているなど）
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、既に削除されています',
      errcode = 'P2001';
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT p_post_id, v_deleted_at;
END;
$$;

-- RPC関数のコメント
COMMENT ON FUNCTION public.delete_recovery_post IS '回復投稿を論理削除する。失敗時はロールバック。戻り値: post_id, deleted_at';

-- ============================================
-- 4. RPC関数: 投稿復元（オプション機能）
-- ============================================
CREATE OR REPLACE FUNCTION public.restore_recovery_post(
  p_post_id UUID
)
RETURNS TABLE (
  post_id UUID,
  restored_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restored_at TIMESTAMPTZ;
BEGIN
  -- 権限チェック: 投稿の所有者のみ復元可能
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id 
      AND user_id = auth.uid()
      AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、復元権限がありません',
      errcode = 'P2001';
  END IF;

  -- 復元（deleted_atをNULLに設定）
  UPDATE public.recovery_posts
  SET deleted_at = NULL
  WHERE id = p_post_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL
  RETURNING NOW() INTO v_restored_at;

  -- 復元が実行されなかった場合
  IF v_restored_at IS NULL THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、既に復元されています',
      errcode = 'P2001';
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT p_post_id, v_restored_at;
END;
$$;

-- RPC関数のコメント
COMMENT ON FUNCTION public.restore_recovery_post IS '削除された回復投稿を復元する。失敗時はロールバック。戻り値: post_id, restored_at';
