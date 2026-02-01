-- ============================================
-- 追加改善: cursor専用RPCとCHECK制約
-- ============================================

-- ============================================
-- 1. cursor専用RPC関数（v2、技術的負債を増やさない）
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_posts_v2_cursor(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'new',
  p_limit INTEGER DEFAULT 20,
  -- cursor pagination（必須）
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  -- フェーズ表示制御（API直叩き対策）
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
  next_cursor_id UUID
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
      rp.recovery_months
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
      -- cursor pagination（必須）
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
      -- 地域フィルタ
      AND (
        p_region_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM public.post_regions pr
          WHERE pr.post_id = rp.id AND pr.region_id = ANY(p_region_ids)
        )
      )
      -- タグフィルタ
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
      -- 地域名の配列（並び順を保証）
      COALESCE(
        array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS region_names,
      -- タグ名の配列（並び順を保証）
      COALESCE(
        array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS tag_names,
      -- ステップ数
      COUNT(DISTINCT rs.id) AS step_count,
      -- 失敗ステップ数
      COUNT(DISTINCT rs.id) FILTER (WHERE rs.is_failure = TRUE) AS failed_step_count
    FROM filtered_posts fp
    LEFT JOIN public.post_regions pr ON pr.post_id = fp.id
    LEFT JOIN public.regions r ON r.id = pr.region_id
    LEFT JOIN public.post_tags pt ON pt.post_id = fp.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    LEFT JOIN public.recovery_steps rs ON rs.post_id = fp.id
    GROUP BY fp.id, fp.title, fp.summary, fp.problem_category, fp.phase_at_post, 
             fp.started_at, fp.current_status, fp.created_at, 
             fp.age_at_that_time, fp.debt_amount, fp.unemployed_months, fp.recovery_months
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
    -- 表示制御（フェーズ階級システム・API直叩き対策）
    CASE
      WHEN p_user_phase_level IS NULL THEN FALSE
      WHEN p_user_phase_level = 1 AND ap.phase_at_post = 3 THEN TRUE
      ELSE FALSE
    END AS is_summary_only,
    -- cursor pagination用
    ap.created_at AS next_cursor_created_at,
    ap.id AS next_cursor_id
  FROM aggregated_posts ap
  ORDER BY
    CASE 
      WHEN p_sort = 'new' THEN ap.created_at 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'old' THEN ap.created_at 
      ELSE NULL 
    END ASC NULLS LAST,
    ap.id DESC -- 同created_atの場合の安定化
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_recovery_posts_v2_cursor IS '投稿一覧・検索用RPC関数（cursor pagination専用v2）。offset/limitとcursorが混在しない設計。created_atはUTC & immutable前提（更新でcreated_atが変わらない前提）。';

-- ============================================
-- 2. created_atのUTC & immutable前提を明文化
-- ============================================
COMMENT ON COLUMN public.recovery_posts.created_at IS '作成日時（UTC、immutable）。重要: このカラムは更新されない前提でcursor paginationが設計されている。更新でcreated_atが変わるとカーソルが破綻する。';

-- ============================================
-- 3. CHECK制約の追加（単位事故防止）
-- ============================================

-- 借金額のCHECK制約（0〜100,000万円 = 10億円まで）
ALTER TABLE public.recovery_posts
DROP CONSTRAINT IF EXISTS check_debt_amount_range;

ALTER TABLE public.recovery_posts
ADD CONSTRAINT check_debt_amount_range
CHECK (debt_amount IS NULL OR (debt_amount >= 0 AND debt_amount <= 100000));

COMMENT ON CONSTRAINT check_debt_amount_range ON public.recovery_posts IS '借金額の範囲チェック（万円単位）。0〜100,000万円（10億円）まで。例: 300万円の場合は300を保存';

-- 無職期間のCHECK制約（0〜600ヶ月 = 50年まで）
ALTER TABLE public.recovery_posts
DROP CONSTRAINT IF EXISTS check_unemployed_months_range;

ALTER TABLE public.recovery_posts
ADD CONSTRAINT check_unemployed_months_range
CHECK (unemployed_months IS NULL OR (unemployed_months >= 0 AND unemployed_months <= 600));

COMMENT ON CONSTRAINT check_unemployed_months_range ON public.recovery_posts IS '無職期間の範囲チェック（月単位）。0〜600ヶ月（50年）まで。例: 1年間の場合は12を保存';

-- 回復期間のCHECK制約（0〜600ヶ月 = 50年まで）
ALTER TABLE public.recovery_posts
DROP CONSTRAINT IF EXISTS check_recovery_months_range;

ALTER TABLE public.recovery_posts
ADD CONSTRAINT check_recovery_months_range
CHECK (recovery_months IS NULL OR (recovery_months >= 0 AND recovery_months <= 600));

COMMENT ON CONSTRAINT check_recovery_months_range ON public.recovery_posts IS '回復期間の範囲チェック（月単位）。0〜600ヶ月（50年）まで。例: 2年間の場合は24を保存';

-- 年齢のCHECK制約（0〜150歳まで）
ALTER TABLE public.recovery_posts
DROP CONSTRAINT IF EXISTS check_age_at_that_time_range;

ALTER TABLE public.recovery_posts
ADD CONSTRAINT check_age_at_that_time_range
CHECK (age_at_that_time IS NULL OR (age_at_that_time >= 0 AND age_at_that_time <= 150));

COMMENT ON CONSTRAINT check_age_at_that_time_range ON public.recovery_posts IS 'その時の年齢の範囲チェック。0〜150歳まで';
