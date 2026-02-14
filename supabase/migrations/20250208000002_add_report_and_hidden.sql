-- ============================================
-- 通報・非公開フラグ機能
-- 思想: ユーザー主導の非公開切り替えはNG。管理者・システム主導の閲覧制限のみ。
-- ============================================

-- ============================================
-- 1. 通報テーブル（post_reports）
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.recovery_posts(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- 匿名通報も可
  reason TEXT NOT NULL CHECK (reason IN ('harassment', 'hate', 'personal_info', 'spam', 'other')),
  note TEXT, -- 任意・短文のみ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_user_id ON public.post_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON public.post_reports(created_at DESC);

COMMENT ON TABLE public.post_reports IS '投稿通報（匿名通報も可）';
COMMENT ON COLUMN public.post_reports.reporter_user_id IS 'NULL=匿名通報。思想的に匿名も許可する。';
COMMENT ON COLUMN public.post_reports.note IS '任意・短文のみ。感情的に書かせない。';

-- RLS: 全員が通報可能（匿名も可）
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_reports_insert_all" ON public.post_reports
  FOR INSERT
  WITH CHECK (true); -- 誰でも通報可能

CREATE POLICY "post_reports_select_own" ON public.post_reports
  FOR SELECT
  USING (reporter_user_id = auth.uid() OR reporter_user_id IS NULL); -- 自分の通報のみ閲覧可（匿名は閲覧不可）

-- ============================================
-- 2. 非公開フラグ（recovery_posts に追加）
-- ============================================
ALTER TABLE public.recovery_posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.recovery_posts
ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

ALTER TABLE public.recovery_posts
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recovery_posts_is_hidden
ON public.recovery_posts(is_hidden)
WHERE is_hidden = true;

COMMENT ON COLUMN public.recovery_posts.is_hidden IS '非公開フラグ（管理者・システム主導のみ。ユーザーUIからは操作不可）';
COMMENT ON COLUMN public.recovery_posts.hidden_reason IS '非公開理由（内部用）';
COMMENT ON COLUMN public.recovery_posts.hidden_at IS '非公開日時';

-- ============================================
-- 3. 通報用RPC関数
-- ============================================
CREATE OR REPLACE FUNCTION public.report_recovery_post(
  p_post_id UUID,
  p_reason TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  report_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- バリデーション: 理由のチェック
  IF p_reason NOT IN ('harassment', 'hate', 'personal_info', 'spam', 'other') THEN
    RAISE EXCEPTION USING
      message = '通報理由が不正です',
      errcode = 'P4001';
  END IF;

  -- 投稿の存在確認（削除済み・非公開でも通報は可能）
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つかりませんでした',
      errcode = 'P4002';
  END IF;

  -- 通報の作成（reporter_user_id は auth.uid() - ログインしていない場合は NULL = 匿名通報）
  INSERT INTO public.post_reports (
    post_id,
    reporter_user_id,
    reason,
    note
  ) VALUES (
    p_post_id,
    auth.uid(), -- ログインしていない場合は NULL（匿名通報）
    p_reason,
    NULLIF(TRIM(p_note), '')
  )
  RETURNING id, created_at INTO v_report_id, v_created_at;

  RETURN QUERY SELECT v_report_id, v_created_at;
END;
$$;

COMMENT ON FUNCTION public.report_recovery_post IS '投稿通報用RPC関数。匿名通報も可。';
