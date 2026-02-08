-- ============================================
-- よくある失敗の傾向（非数値）RPC関数
-- 目的: 「あ、これ多いんだ」と気づかせる（数を出さない）
-- ============================================

-- ============================================
-- RPC関数: get_common_failed_reasons
-- ============================================
CREATE OR REPLACE FUNCTION public.get_common_failed_reasons(
  p_problem_category problem_category_enum,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  failed_reason_type TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT rs.failed_reason_type
  FROM public.recovery_steps rs
  INNER JOIN public.recovery_posts rp ON rs.post_id = rp.id
  WHERE
    rs.is_failure = TRUE
    AND rs.failed_reason_type IS NOT NULL
    AND rs.failed_reason_type != ''
    AND rp.problem_category = p_problem_category
    AND rp.deleted_at IS NULL
  GROUP BY rs.failed_reason_type
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_common_failed_reasons IS 'よくある失敗の傾向（非数値）を取得するRPC関数。カテゴリ別に多い順で最大3つまで返す。数値は返さない（比較・競争を生まないため）。';
