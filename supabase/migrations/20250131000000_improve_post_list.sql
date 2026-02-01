-- ============================================
-- 投稿一覧・検索機能の改善
-- ============================================

-- ============================================
-- 1. 既存の関数を削除（シグネチャ変更のため）
-- ============================================
DROP FUNCTION IF EXISTS public.get_recovery_posts(
  INTEGER[],
  TEXT[],
  problem_category_enum,
  INTEGER,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER
);

-- ============================================
-- 2. cursor pagination対応（offset paginationの改善）
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_posts(
  p_region_ids INTEGER[] DEFAULT NULL,
  p_tag_names TEXT[] DEFAULT NULL,
  p_problem_category problem_category_enum DEFAULT NULL,
  p_phase_at_post INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'new',
  p_limit INTEGER DEFAULT 20,
  -- offset pagination（後方互換性のため残す）
  p_offset INTEGER DEFAULT NULL,
  -- cursor pagination（将来対応用）
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
  -- 表示制御用（フェーズ階級システム）
  is_summary_only BOOLEAN,
  -- cursor pagination用
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
      -- cursor pagination（優先）
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
    -- Lv1ユーザーはLv3投稿の全文を見られない（要約のみ）
    CASE
      WHEN p_user_phase_level IS NULL THEN FALSE -- 匿名ユーザーはLv1扱いだが、デフォルトは全文表示
      WHEN p_user_phase_level = 1 AND ap.phase_at_post = 3 THEN TRUE -- Lv1ユーザーはLv3投稿の要約のみ
      ELSE FALSE -- Lv2以上は全文表示
    END AS is_summary_only,
    -- cursor pagination用（次のページ用のカーソル）
    -- 各レコードに同じカーソル情報を返す（クライアント側で最後のレコードのカーソルを使用）
    -- 実際のnext_cursorはクライアント側で最後のレコードのcreated_atとidを使用
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
  LIMIT p_limit
  OFFSET COALESCE(p_offset, 0);
$$;

-- RPC関数のコメント更新
COMMENT ON FUNCTION public.get_recovery_posts IS '投稿一覧・検索用RPC関数。N+1を起こさない設計で、関連データを一括取得。cursor pagination対応（将来拡張用）。フィルタ条件は全てオプショナル。';
