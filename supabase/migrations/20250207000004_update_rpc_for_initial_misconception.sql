-- ============================================
-- RPC関数の更新: initial_misconception対応
-- ============================================

-- ============================================
-- 1. create_recovery_post の更新
-- ============================================
-- パラメータが追加されるため、一度DROPしてから再作成（安全のため）
DROP FUNCTION IF EXISTS public.create_recovery_post(
  TEXT, TEXT, problem_category_enum, INTEGER, DATE, DATE, TEXT, JSONB, INTEGER[], TEXT[], INTEGER, INTEGER, INTEGER, INTEGER
);

CREATE OR REPLACE FUNCTION public.create_recovery_post(
  p_title TEXT,
  p_summary TEXT,
  p_problem_category problem_category_enum,
  p_phase_at_post INTEGER,
  p_started_at DATE,
  p_recovered_at DATE,
  p_current_status TEXT,
  p_steps JSONB,
  p_region_ids INTEGER[],
  p_tag_names TEXT[],
  p_age_at_that_time INTEGER DEFAULT NULL,
  p_debt_amount INTEGER DEFAULT NULL,
  p_unemployed_months INTEGER DEFAULT NULL,
  p_recovery_months INTEGER DEFAULT NULL,
  p_initial_misconception TEXT DEFAULT NULL
)
RETURNS TABLE (
  post_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id UUID;
  v_post_created_at TIMESTAMPTZ;
  v_tag_id UUID;
  v_tag_name TEXT;
  v_step JSONB;
  v_step_order INTEGER;
BEGIN
  -- バリデーション: ステップが最低1つ必要
  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING
      message = 'ステップは最低1つ必要です',
      errcode = 'P1001';
  END IF;

  -- バリデーション: ステップ順序のチェック
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  -- 親投稿の作成（動的SQLにすることで RETURNS TABLE の created_at と衝突しない）
  EXECUTE format(
    'INSERT INTO public.recovery_posts (
      user_id,
      title,
      summary,
      problem_category,
      phase_at_post,
      started_at,
      recovered_at,
      current_status,
      age_at_that_time,
      debt_amount,
      unemployed_months,
      recovery_months,
      initial_misconception
    ) VALUES (
      %L,
      %L, %L, %L::problem_category_enum, %s, %L, %L, %L, %s, %s, %s, %s, %L
    )
    RETURNING id, created_at',
    auth.uid(),
    p_title, p_summary, p_problem_category, p_phase_at_post, p_started_at, p_recovered_at,
    p_current_status, p_age_at_that_time, p_debt_amount, p_unemployed_months, p_recovery_months,
    p_initial_misconception
  ) INTO v_post_id, v_post_created_at;

  -- ステップの作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure,
      failed_reason_type,
      failed_reason_detail,
      failed_reason
    ) VALUES (
      v_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReasonType', ''),
      NULLIF(v_step->>'failedReasonDetail', ''),
      NULLIF(v_step->>'failedReason', '') -- 後方互換性のため
    );
  END LOOP;

  -- 地域の関連付け
  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT v_post_id, unnest(p_region_ids);
  END IF;

  -- タグの作成と関連付け（#なしで保存）
  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      -- タグが存在しない場合は作成（#を除去して保存）
      INSERT INTO public.tags (name)
      VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;

      -- タグIDを取得
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);

      -- 投稿とタグを関連付け
      INSERT INTO public.post_tags (post_id, tag_id)
      VALUES (v_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT v_post_id, v_post_created_at;
END;
$$;

-- ============================================
-- 2. update_recovery_post の更新
-- ============================================
-- パラメータが追加されるため、一度DROPしてから再作成（安全のため）
DROP FUNCTION IF EXISTS public.update_recovery_post(
  UUID, TEXT, TEXT, problem_category_enum, INTEGER, DATE, DATE, TEXT, JSONB, INTEGER[], TEXT[], INTEGER, INTEGER, INTEGER, INTEGER
);

CREATE OR REPLACE FUNCTION public.update_recovery_post(
  p_post_id UUID,
  p_title TEXT,
  p_summary TEXT,
  p_problem_category problem_category_enum,
  p_phase_at_post INTEGER,
  p_started_at DATE,
  p_recovered_at DATE,
  p_current_status TEXT,
  p_steps JSONB,
  p_region_ids INTEGER[],
  p_tag_names TEXT[],
  p_age_at_that_time INTEGER DEFAULT NULL,
  p_debt_amount INTEGER DEFAULT NULL,
  p_unemployed_months INTEGER DEFAULT NULL,
  p_recovery_months INTEGER DEFAULT NULL,
  p_initial_misconception TEXT DEFAULT NULL
)
RETURNS TABLE (
  post_id UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ;
  v_tag_id UUID;
  v_tag_name TEXT;
  v_step JSONB;
  v_step_order INTEGER;
BEGIN
  -- バリデーション: 投稿の所有者チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、編集権限がありません',
      errcode = 'P2001';
  END IF;

  -- バリデーション: ステップが最低1つ必要
  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING
      message = 'ステップは最低1つ必要です',
      errcode = 'P1001';
  END IF;

  -- バリデーション: ステップ順序のチェック
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  -- 投稿の更新（initial_misconceptionを含む）
  UPDATE public.recovery_posts
  SET
    title = p_title,
    summary = p_summary,
    problem_category = p_problem_category,
    phase_at_post = p_phase_at_post,
    started_at = p_started_at,
    recovered_at = p_recovered_at,
    current_status = p_current_status,
    age_at_that_time = p_age_at_that_time,
    debt_amount = p_debt_amount,
    unemployed_months = p_unemployed_months,
    recovery_months = p_recovery_months,
    initial_misconception = p_initial_misconception,
    updated_at = NOW()
  WHERE id = p_post_id AND user_id = auth.uid()
  RETURNING updated_at INTO v_updated_at;

  -- 既存のステップを削除
  DELETE FROM public.recovery_steps WHERE post_id = p_post_id;

  -- 新しいステップを作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure,
      failed_reason_type,
      failed_reason_detail,
      failed_reason
    ) VALUES (
      p_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReasonType', ''),
      NULLIF(v_step->>'failedReasonDetail', ''),
      NULLIF(v_step->>'failedReason', '') -- 後方互換性のため
    );
  END LOOP;

  -- 既存の地域関連を削除
  DELETE FROM public.post_regions WHERE post_id = p_post_id;

  -- 新しい地域関連を作成
  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT p_post_id, unnest(p_region_ids);
  END IF;

  -- 既存のタグ関連を削除
  DELETE FROM public.post_tags WHERE post_id = p_post_id;

  -- 新しいタグを作成と関連付け（#なしで保存）
  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      -- タグが存在しない場合は作成（#を除去して保存）
      INSERT INTO public.tags (name)
      VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;

      -- タグIDを取得
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);

      -- 投稿とタグを関連付け
      INSERT INTO public.post_tags (post_id, tag_id)
      VALUES (p_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 戻り値（TABLE型）
  RETURN QUERY SELECT p_post_id, v_updated_at;
END;
$$;

-- ============================================
-- 3. get_recovery_post_detail の更新
-- ============================================
-- 戻り値の型が変わるため、一度DROPしてから再作成
DROP FUNCTION IF EXISTS public.get_recovery_post_detail(UUID, INTEGER);

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
  -- 最初に誤解していたこと
  initial_misconception TEXT,
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
      rp.initial_misconception,
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
          'failedReasonType', rs.failed_reason_type,
          'failedReasonDetail', rs.failed_reason_detail,
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
    pd.initial_misconception,
    COALESCE(sd.steps, '[]'::JSONB) AS steps
  FROM post_data pd
  LEFT JOIN steps_data sd ON sd.post_id = pd.id;
$$;

COMMENT ON FUNCTION public.get_recovery_post_detail IS '投稿詳細取得用RPC関数。7ブロック構成の詳細ページ用に全データを一括取得。フェーズ制御対応。initial_misconception対応。';
