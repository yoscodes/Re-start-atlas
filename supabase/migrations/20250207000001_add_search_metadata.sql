-- ============================================
-- 検索メタデータ機能の追加
-- 1. 条件一致投稿数を取得するRPC関数
-- 2. 検索条件の意味づけテキスト生成用のヘルパー関数
-- ============================================

-- ============================================
-- 1. 条件一致投稿数を取得するRPC関数
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_posts_count(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.recovery_posts rp
  WHERE
    rp.deleted_at IS NULL
    AND (p_problem_category IS NULL OR rp.problem_category = p_problem_category)
    AND (p_phase_at_post IS NULL OR rp.phase_at_post = p_phase_at_post)
    AND (
      p_keyword IS NULL
      OR rp.title ILIKE '%' || p_keyword || '%'
      OR rp.summary ILIKE '%' || p_keyword || '%'
    )
    AND (
      p_region_ids IS NULL
      OR EXISTS (
        SELECT 1 FROM public.post_regions pr
        WHERE pr.post_id = rp.id AND pr.region_id = ANY(p_region_ids)
      )
    )
    AND (
      p_tag_names IS NULL
      OR EXISTS (
        SELECT 1 FROM public.post_tags pt
        JOIN public.tags t ON t.id = pt.tag_id
        WHERE pt.post_id = rp.id AND t.name = ANY(p_tag_names)
      )
    );
$$;

COMMENT ON FUNCTION public.get_recovery_posts_count IS '検索条件に一致する投稿の総数を取得するRPC関数。検索メタデータ表示用。';
