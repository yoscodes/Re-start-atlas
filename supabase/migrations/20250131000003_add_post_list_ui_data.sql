-- ============================================
-- 一覧UI用データ追加（コメント数・リアクション数・投稿者情報）
-- ============================================

-- ============================================
-- 1. 既存の関数を削除（戻り値の型変更のため）
-- ============================================
DROP FUNCTION IF EXISTS public.get_recovery_posts(
  INTEGER[],
  TEXT[],
  problem_category_enum,
  INTEGER,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  INTEGER
);

-- ============================================
-- 2. get_recovery_posts関数にUI用データを追加
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
  -- UI用データ追加
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
      rp.id,
      rp.title,
      rp.summary,
      rp.problem_category,
      rp.phase_at_post,
      rp.started_at,
      rp.current_status,
      rp.created_at,
      rp.age_at_that_time,
      rp.debt_amount,
      rp.unemployed_months,
      rp.recovery_months,
      rp.user_id
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
        p_cursor_created_at IS NULL
        OR (
          CASE 
            WHEN p_sort = 'new' THEN 
              (rp.created_at, rp.id) < (p_cursor_created_at, p_cursor_id)
            WHEN p_sort = 'old' THEN 
              (rp.created_at, rp.id) > (p_cursor_created_at, p_cursor_id)
            ELSE TRUE
          END
        )
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
      )
  ),
  aggregated_posts AS (
    SELECT
      fp.*,
      COALESCE(
        array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS region_names,
      COALESCE(
        array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS tag_names,
      COUNT(DISTINCT rs.id) AS step_count,
      COUNT(DISTINCT rs.id) FILTER (WHERE rs.is_failure = TRUE) AS failed_step_count,
      -- UI用データ
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
    ap.id,
    ap.title,
    ap.summary,
    ap.problem_category,
    ap.phase_at_post,
    ap.started_at,
    ap.current_status,
    ap.region_names,
    ap.tag_names,
    ap.step_count,
    ap.failed_step_count,
    ap.created_at,
    ap.age_at_that_time,
    ap.debt_amount,
    ap.unemployed_months,
    ap.recovery_months,
    CASE
      WHEN p_user_phase_level IS NULL THEN FALSE
      WHEN p_user_phase_level = 1 AND ap.phase_at_post = 3 THEN TRUE
      ELSE FALSE
    END AS is_summary_only,
    ap.created_at AS next_cursor_created_at,
    ap.id AS next_cursor_id,
    -- UI用データ
    ap.comment_count,
    ap.reaction_count,
    COALESCE(u.display_name, '匿名ユーザー') AS author_display_name,
    u.phase_level AS author_phase_level,
    COALESCE(public.calculate_credit_score(ap.user_id), 0) AS author_credit_score
  FROM aggregated_posts ap
  LEFT JOIN public.users u ON u.id = ap.user_id
  ORDER BY
    CASE 
      WHEN p_sort = 'new' THEN ap.created_at 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'old' THEN ap.created_at 
      ELSE NULL 
    END ASC NULLS LAST,
    ap.id DESC
  LIMIT p_limit
  OFFSET COALESCE(p_offset, 0);
$$;

-- ============================================
-- 3. get_recovery_posts_v2_cursor関数にもUI用データを追加
-- ============================================
DROP FUNCTION IF EXISTS public.get_recovery_posts_v2_cursor(
  INTEGER[],
  TEXT[],
  problem_category_enum,
  INTEGER,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  INTEGER
);

CREATE OR REPLACE FUNCTION public.get_recovery_posts_v2_cursor(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'new',
  p_limit INTEGER DEFAULT 20,
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
  -- UI用データ追加
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
      rp.id,
      rp.title,
      rp.summary,
      rp.problem_category,
      rp.phase_at_post,
      rp.started_at,
      rp.current_status,
      rp.created_at,
      rp.age_at_that_time,
      rp.debt_amount,
      rp.unemployed_months,
      rp.recovery_months,
      rp.user_id
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
        p_cursor_created_at IS NULL
        OR (
          CASE 
            WHEN p_sort = 'new' THEN 
              (rp.created_at, rp.id) < (p_cursor_created_at, p_cursor_id)
            WHEN p_sort = 'old' THEN 
              (rp.created_at, rp.id) > (p_cursor_created_at, p_cursor_id)
            ELSE TRUE
          END
        )
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
      )
  ),
  aggregated_posts AS (
    SELECT
      fp.*,
      COALESCE(
        array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS region_names,
      COALESCE(
        array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS tag_names,
      COUNT(DISTINCT rs.id) AS step_count,
      COUNT(DISTINCT rs.id) FILTER (WHERE rs.is_failure = TRUE) AS failed_step_count,
      -- UI用データ
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
    ap.id,
    ap.title,
    ap.summary,
    ap.problem_category,
    ap.phase_at_post,
    ap.started_at,
    ap.current_status,
    ap.region_names,
    ap.tag_names,
    ap.step_count,
    ap.failed_step_count,
    ap.created_at,
    ap.age_at_that_time,
    ap.debt_amount,
    ap.unemployed_months,
    ap.recovery_months,
    CASE
      WHEN p_user_phase_level IS NULL THEN FALSE
      WHEN p_user_phase_level = 1 AND ap.phase_at_post = 3 THEN TRUE
      ELSE FALSE
    END AS is_summary_only,
    ap.created_at AS next_cursor_created_at,
    ap.id AS next_cursor_id,
    -- UI用データ
    ap.comment_count,
    ap.reaction_count,
    COALESCE(u.display_name, '匿名ユーザー') AS author_display_name,
    u.phase_level AS author_phase_level,
    COALESCE(public.calculate_credit_score(ap.user_id), 0) AS author_credit_score
  FROM aggregated_posts ap
  LEFT JOIN public.users u ON u.id = ap.user_id
  ORDER BY
    CASE 
      WHEN p_sort = 'new' THEN ap.created_at 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'old' THEN ap.created_at 
      ELSE NULL 
    END ASC NULLS LAST,
    ap.id DESC
  LIMIT p_limit;
$$;
