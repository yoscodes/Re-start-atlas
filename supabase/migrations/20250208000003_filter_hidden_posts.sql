-- ============================================
-- 非公開投稿の表示制御
-- 一般閲覧者: is_hidden = false のみ表示
-- 投稿者本人: is_hidden = true でも閲覧可（警告文表示用）
-- ============================================

-- ============================================
-- 1. get_recovery_posts_count: is_hidden = false のみ
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
    AND rp.status = 'published'
    AND rp.is_hidden = false
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

-- ============================================
-- 2. get_recovery_posts: is_hidden = false のみ
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_posts(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'new',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_user_phase_level INTEGER DEFAULT NULL
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
  recovery_months INTEGER,
  is_summary_only BOOLEAN,
  next_cursor_created_at TIMESTAMPTZ,
  next_cursor_id UUID,
  comment_count BIGINT,
  reaction_count BIGINT,
  author_display_name TEXT,
  author_phase_level INTEGER,
  author_credit_score INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  WITH filtered_posts AS (
    SELECT
      rp.id, rp.title, rp.summary, rp.problem_category, rp.phase_at_post,
      rp.started_at, rp.current_status, rp.created_at,
      rp.age_at_that_time, rp.debt_amount, rp.unemployed_months, rp.recovery_months,
      rp.user_id
    FROM public.recovery_posts rp
    WHERE
      rp.deleted_at IS NULL
      AND rp.status = 'published'
      AND rp.is_hidden = false
      AND (p_problem_category IS NULL OR rp.problem_category = p_problem_category)
      AND (p_phase_at_post IS NULL OR rp.phase_at_post = p_phase_at_post)
      AND (
        p_keyword IS NULL
        OR rp.title ILIKE '%' || p_keyword || '%'
        OR rp.summary ILIKE '%' || p_keyword || '%'
      )
      AND (
        p_cursor_created_at IS NULL
        OR (
          CASE
            WHEN p_sort = 'new' THEN (rp.created_at, rp.id) < (p_cursor_created_at, p_cursor_id)
            WHEN p_sort = 'old' THEN (rp.created_at, rp.id) > (p_cursor_created_at, p_cursor_id)
            ELSE TRUE
          END
        )
      )
      AND (
        p_region_ids IS NULL
        OR EXISTS (SELECT 1 FROM public.post_regions pr WHERE pr.post_id = rp.id AND pr.region_id = ANY(p_region_ids))
      )
      AND (
        p_tag_names IS NULL
        OR EXISTS (
          SELECT 1 FROM public.post_tags pt
          JOIN public.tags t ON t.id = pt.tag_id
          WHERE pt.post_id = rp.id AND t.name = ANY(p_tag_names)
        )
      )
  ),
  aggregated_posts AS (
    SELECT
      fp.*,
      COALESCE(array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL), ARRAY[]::TEXT[]) AS region_names,
      COALESCE(array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::TEXT[]) AS tag_names,
      COUNT(DISTINCT rs.id) AS step_count,
      COUNT(DISTINCT rs.id) FILTER (WHERE rs.is_failure = TRUE) AS failed_step_count,
      COUNT(DISTINCT c.id) AS comment_count,
      COUNT(DISTINCT rct.id) AS reaction_count
    FROM filtered_posts fp
    LEFT JOIN public.post_regions pr ON pr.post_id = fp.id
    LEFT JOIN public.regions r ON r.id = pr.region_id
    LEFT JOIN public.post_tags pt ON pt.post_id = fp.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    LEFT JOIN public.recovery_steps rs ON rs.post_id = fp.id
    LEFT JOIN public.comments c ON c.post_id = fp.id
    LEFT JOIN public.reactions rct ON rct.post_id = fp.id
    GROUP BY fp.id, fp.title, fp.summary, fp.problem_category, fp.phase_at_post,
             fp.started_at, fp.current_status, fp.created_at,
             fp.age_at_that_time, fp.debt_amount, fp.unemployed_months, fp.recovery_months,
             fp.user_id
  )
  SELECT
    ap.id, ap.title, ap.summary, ap.problem_category, ap.phase_at_post,
    ap.started_at, ap.current_status, ap.region_names, ap.tag_names,
    ap.step_count, ap.failed_step_count, ap.created_at,
    ap.age_at_that_time, ap.debt_amount, ap.unemployed_months, ap.recovery_months,
    CASE WHEN p_user_phase_level IS NULL THEN FALSE WHEN p_user_phase_level = 1 AND ap.phase_at_post = 3 THEN TRUE ELSE FALSE END AS is_summary_only,
    ap.created_at AS next_cursor_created_at, ap.id AS next_cursor_id,
    ap.comment_count, ap.reaction_count,
    COALESCE(u.display_name, '匿名ユーザー') AS author_display_name,
    u.phase_level AS author_phase_level,
    COALESCE(public.calculate_credit_score(ap.user_id), 0) AS author_credit_score
  FROM aggregated_posts ap
  LEFT JOIN public.users u ON u.id = ap.user_id
  ORDER BY
    CASE WHEN p_sort = 'new' THEN ap.created_at ELSE NULL END DESC NULLS LAST,
    CASE WHEN p_sort = 'old' THEN ap.created_at ELSE NULL END ASC NULLS LAST,
    ap.id DESC
  LIMIT p_limit
  OFFSET COALESCE(p_offset, 0);
$$;

-- ============================================
-- 3. get_recovery_post_detail: 投稿者本人は非公開でも閲覧可
-- ============================================
DROP FUNCTION IF EXISTS public.get_recovery_post_detail(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_recovery_post_detail(
  p_post_id UUID,
  p_user_phase_level INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  problem_category problem_category_enum,
  phase_at_post INTEGER,
  started_at DATE,
  recovered_at DATE,
  current_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  age_at_that_time INTEGER,
  debt_amount INTEGER,
  unemployed_months INTEGER,
  recovery_months INTEGER,
  region_names TEXT[],
  tag_names TEXT[],
  is_summary_only BOOLEAN,
  initial_misconception TEXT,
  status TEXT,
  is_hidden BOOLEAN,
  steps JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH post_data AS (
    SELECT
      rp.id, rp.title, rp.summary, rp.problem_category, rp.phase_at_post,
      rp.started_at, rp.recovered_at, rp.current_status, rp.created_at, rp.updated_at,
      rp.age_at_that_time, rp.debt_amount, rp.unemployed_months, rp.recovery_months,
      rp.initial_misconception, rp.status, rp.is_hidden,
      COALESCE(array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL), ARRAY[]::TEXT[]) AS region_names,
      COALESCE(array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::TEXT[]) AS tag_names,
      CASE WHEN p_user_phase_level = 1 AND rp.phase_at_post = 3 THEN TRUE ELSE FALSE END AS is_summary_only
    FROM public.recovery_posts rp
    LEFT JOIN public.post_regions pr ON pr.post_id = rp.id
    LEFT JOIN public.regions r ON r.id = pr.region_id
    LEFT JOIN public.post_tags pt ON pt.post_id = rp.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    WHERE rp.id = p_post_id
      AND rp.deleted_at IS NULL
      AND (
        rp.status = 'published' OR (rp.status = 'draft' AND rp.user_id = auth.uid())
      )
      AND (
        rp.is_hidden = false OR rp.user_id = auth.uid()
      )
    GROUP BY rp.id
  ),
  steps_data AS (
    SELECT rs.post_id,
      jsonb_agg(
        jsonb_build_object(
          'order', rs.step_order, 'content', rs.content, 'isFailure', rs.is_failure,
          'failedReasonType', rs.failed_reason_type, 'failedReasonDetail', rs.failed_reason_detail, 'failedReason', rs.failed_reason
        )
        ORDER BY rs.step_order ASC, rs.id ASC
      ) AS steps
    FROM public.recovery_steps rs
    WHERE rs.post_id = p_post_id
    GROUP BY rs.post_id
  )
  SELECT
    pd.id, pd.title, pd.summary, pd.problem_category, pd.phase_at_post,
    pd.started_at, pd.recovered_at, pd.current_status, pd.created_at, pd.updated_at,
    pd.age_at_that_time, pd.debt_amount, pd.unemployed_months, pd.recovery_months,
    pd.region_names, pd.tag_names, pd.is_summary_only, pd.initial_misconception, pd.status, pd.is_hidden,
    COALESCE(sd.steps, '[]'::JSONB) AS steps
  FROM post_data pd
  LEFT JOIN steps_data sd ON sd.post_id = pd.id;
$$;

COMMENT ON FUNCTION public.get_recovery_post_detail IS '投稿詳細取得用RPC関数。投稿者本人は非公開でも閲覧可（警告文表示用）。';
