-- ============================================
-- 投稿詳細取得用RPC関数
-- 7ブロック構成の詳細ページ用に全データを一括取得
-- ============================================

CREATE OR REPLACE FUNCTION public.get_recovery_post_detail(
  p_post_id UUID,
  p_user_phase_level INTEGER DEFAULT NULL
)
RETURNS TABLE (
  -- 投稿基本情報
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
  -- 検索特化フィールド
  age_at_that_time INTEGER,
  debt_amount INTEGER,
  unemployed_months INTEGER,
  recovery_months INTEGER,
  -- 地域・タグ
  region_names TEXT[],
  tag_names TEXT[],
  -- 表示制御
  is_summary_only BOOLEAN,
  -- ステップ（JSONB配列として返す）
  steps JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH post_data AS (
    SELECT
      rp.id,
      rp.title,
      rp.summary,
      rp.problem_category,
      rp.phase_at_post,
      rp.started_at,
      rp.recovered_at,
      rp.current_status,
      rp.created_at,
      rp.updated_at,
      rp.age_at_that_time,
      rp.debt_amount,
      rp.unemployed_months,
      rp.recovery_months,
      -- 地域名
      COALESCE(
        array_agg(DISTINCT r.prefecture ORDER BY r.prefecture) FILTER (WHERE r.prefecture IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS region_names,
      -- タグ名
      COALESCE(
        array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS tag_names,
      -- フェーズ制御（Lv1ユーザーがLv3投稿を見る場合）
      CASE 
        WHEN p_user_phase_level = 1 AND rp.phase_at_post = 3 THEN TRUE 
        ELSE FALSE 
      END AS is_summary_only
    FROM public.recovery_posts rp
    LEFT JOIN public.post_regions pr ON pr.post_id = rp.id
    LEFT JOIN public.regions r ON r.id = pr.region_id
    LEFT JOIN public.post_tags pt ON pt.post_id = rp.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    WHERE rp.id = p_post_id
      AND rp.deleted_at IS NULL
    GROUP BY rp.id
  ),
  steps_data AS (
    SELECT
      rs.post_id,
      jsonb_agg(
        jsonb_build_object(
          'order', rs.step_order,
          'content', rs.content,
          'isFailure', rs.is_failure,
          'failedReason', rs.failed_reason
        )
        ORDER BY rs.step_order ASC, rs.id ASC
      ) AS steps
    FROM public.recovery_steps rs
    WHERE rs.post_id = p_post_id
    GROUP BY rs.post_id
  )
  SELECT
    pd.id,
    pd.title,
    pd.summary,
    pd.problem_category,
    pd.phase_at_post,
    pd.started_at,
    pd.recovered_at,
    pd.current_status,
    pd.created_at,
    pd.updated_at,
    pd.age_at_that_time,
    pd.debt_amount,
    pd.unemployed_months,
    pd.recovery_months,
    pd.region_names,
    pd.tag_names,
    pd.is_summary_only,
    COALESCE(sd.steps, '[]'::JSONB) AS steps
  FROM post_data pd
  LEFT JOIN steps_data sd ON sd.post_id = pd.id;
$$;

COMMENT ON FUNCTION public.get_recovery_post_detail IS '投稿詳細取得用RPC関数。7ブロック構成の詳細ページ用に全データを一括取得。フェーズ制御対応。';
