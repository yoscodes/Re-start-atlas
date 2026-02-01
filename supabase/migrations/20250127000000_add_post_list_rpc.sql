-- ============================================
-- 投稿一覧・検索用RPC関数の追加
-- ============================================

-- ============================================
-- RPC関数: get_recovery_posts（投稿一覧・検索）
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_posts(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'new',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  problem_category problem_category_enum,
  phase_at_post INTEGER,
  started_at DATE,
  current_status TEXT,
  region_names TEXT[],
  tag_names TEXT[],
  step_count BIGINT,
  failed_step_count BIGINT,
  created_at TIMESTAMPTZ,
  age_at_that_time INTEGER,
  debt_amount INTEGER,
  unemployed_months INTEGER,
  recovery_months INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    rp.id,
    rp.title,
    rp.summary,
    rp.problem_category,
    rp.phase_at_post,
    rp.started_at,
    rp.current_status,
    -- 地域名の配列（都道府県名を取得）
    COALESCE(
      array_agg(DISTINCT r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS region_names,
    -- タグ名の配列
    COALESCE(
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS tag_names,
    -- ステップ数
    COUNT(DISTINCT rs.id) AS step_count,
    -- 失敗ステップ数
    COUNT(DISTINCT rs.id) FILTER (WHERE rs.is_failure = TRUE) AS failed_step_count,
    rp.created_at,
    -- 検索特化フィールド
    rp.age_at_that_time,
    rp.debt_amount,
    rp.unemployed_months,
    rp.recovery_months
  FROM public.recovery_posts rp
  LEFT JOIN public.post_regions pr ON pr.post_id = rp.id
  LEFT JOIN public.regions r ON r.id = pr.region_id
  LEFT JOIN public.post_tags pt ON pt.post_id = rp.id
  LEFT JOIN public.tags t ON t.id = pt.tag_id
  LEFT JOIN public.recovery_steps rs ON rs.post_id = rp.id
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
      OR pr.region_id = ANY(p_region_ids)
    )
    AND (
      p_tag_names IS NULL
      OR t.name = ANY(p_tag_names)
    )
  GROUP BY rp.id
  ORDER BY
    CASE 
      WHEN p_sort = 'new' THEN rp.created_at 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'old' THEN rp.created_at 
      ELSE NULL 
    END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- RPC関数のコメント
COMMENT ON FUNCTION public.get_recovery_posts IS '投稿一覧・検索用RPC関数。N+1を起こさない設計で、関連データを一括取得。フィルタ条件は全てオプショナル。';
