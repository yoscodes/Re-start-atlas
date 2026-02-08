-- ============================================
-- 失敗理由の軽い構造化（v1）
-- failed_reason_type と failed_reason_detail を追加
-- 既存データは壊さない（移行コストゼロ）
-- ============================================

-- ============================================
-- 1. failed_reason_type カラムの追加（超軽量）
-- ============================================
ALTER TABLE public.recovery_steps 
ADD COLUMN IF NOT EXISTS failed_reason_type TEXT;

-- ============================================
-- 2. failed_reason_detail カラムの追加（既存 failed_reason を移行）
-- ============================================
ALTER TABLE public.recovery_steps 
ADD COLUMN IF NOT EXISTS failed_reason_detail TEXT;

-- 既存の failed_reason のデータを failed_reason_detail にコピー
UPDATE public.recovery_steps 
SET failed_reason_detail = failed_reason 
WHERE failed_reason IS NOT NULL 
  AND failed_reason_detail IS NULL;

-- ============================================
-- 3. インデックスの追加（失敗理由タイプの検索用）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recovery_steps_failed_reason_type 
ON public.recovery_steps(failed_reason_type) 
WHERE is_failure = TRUE AND failed_reason_type IS NOT NULL;

-- ============================================
-- 4. コメントの追加
-- ============================================
COMMENT ON COLUMN public.recovery_steps.failed_reason_type IS '失敗理由のタイプ（軽い構造化用）。ENUMではなくTEXTで、選択肢は4〜5個のみ。
例: "情報不足", "焦り", "環境依存", "自己判断"
分析用であって、分類ではない。';

COMMENT ON COLUMN public.recovery_steps.failed_reason_detail IS '失敗理由の詳細（自由記述）。既存の failed_reason から移行。
**正の一次データ（今後の基準）**。v2以降はこちらを優先的に使用する。
typeは薄く、detailが主役。';

-- ============================================
-- 5. 既存の failed_reason カラムは残す（legacy / 表示互換用）
-- ============================================
-- 役割の明確化:
-- - failed_reason: legacy / 表示互換用（既存データの後方互換性のため）
-- - failed_reason_detail: 正の一次データ（今後の基準）
-- 
-- UI表示の優先順位: failed_reason_detail > failed_reason
-- 新規作成時は failed_reason_detail を使用し、failed_reason は使用しない。
-- 
-- 将来的に削除する場合は、アプリケーション側で failed_reason_detail を使用していることを確認してから
-- ============================================
