-- ============================================
-- 「失敗した行動」を一次データにする
-- failed_reasonカラムを追加して「やってはいけない地雷マップ」を実現
-- ============================================

-- ============================================
-- 1. failed_reasonカラムの追加
-- ============================================
ALTER TABLE public.recovery_steps 
ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- ============================================
-- 2. インデックスの追加（失敗行動の検索用）
-- ============================================

-- 失敗行動の検索用インデックス（is_failure = true かつ failed_reason IS NOT NULL）
CREATE INDEX IF NOT EXISTS idx_recovery_steps_failed_reason 
ON public.recovery_steps(failed_reason) 
WHERE is_failure = TRUE AND failed_reason IS NOT NULL;

-- ============================================
-- 3. コメントの追加
-- ============================================
COMMENT ON COLUMN public.recovery_steps.failed_reason IS '失敗した理由（なぜ失敗したのか）。「やってはいけない地雷マップ」として機能する。

将来の改善（v2）:
- TEXTの自由度が高すぎるため、表記ゆれ・同義語地獄が発生する可能性がある
- 改善案: failed_reason_category ENUM + failed_reason_detail TEXT
- 「分析したくなった瞬間」が実装タイミング';
