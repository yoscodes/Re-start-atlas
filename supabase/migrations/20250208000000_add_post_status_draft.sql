-- ============================================
-- 投稿ステータス（draft / published）
-- 思想: 「書きかけで止まっても、失敗ではない」という許可。draft は静かに存在するだけ。
-- ============================================

-- 1. カラム追加
ALTER TABLE public.recovery_posts
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- 既存行は published のまま（DEFAULT で保証）
-- 制約: draft か published のみ
ALTER TABLE public.recovery_posts
ADD CONSTRAINT chk_recovery_posts_status
CHECK (status IN ('draft', 'published'));

COMMENT ON COLUMN public.recovery_posts.status IS 'draft=下書き, published=公開。値はこの2つのみ。';

-- 2. インデックス（一覧で published のみ取得するため）
CREATE INDEX IF NOT EXISTS idx_recovery_posts_status
ON public.recovery_posts(status)
WHERE status = 'published';

-- ============================================
-- 3. create_recovery_post に p_status を追加
-- ============================================
DROP FUNCTION IF EXISTS public.create_recovery_post(
  TEXT, TEXT, problem_category_enum, INTEGER, DATE, DATE, TEXT, JSONB, INTEGER[], TEXT[], INTEGER, INTEGER, INTEGER, INTEGER, TEXT
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
  p_initial_misconception TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'draft'
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
  v_status TEXT;
BEGIN
  v_status := CASE WHEN p_status = 'published' THEN 'published' ELSE 'draft' END;

  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING message = 'ステップは最低1つ必要です', errcode = 'P1001';
  END IF;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  EXECUTE format(
    'INSERT INTO public.recovery_posts (
      user_id, title, summary, problem_category, phase_at_post,
      started_at, recovered_at, current_status, age_at_that_time, debt_amount,
      unemployed_months, recovery_months, initial_misconception, status
    ) VALUES (
      %L, %L, %L, %L::problem_category_enum, %s, %L, %L, %L, %s, %s, %s, %s, %L, %L
    )
    RETURNING id, created_at',
    auth.uid(), p_title, p_summary, p_problem_category, p_phase_at_post, p_started_at, p_recovered_at,
    p_current_status, p_age_at_that_time, p_debt_amount, p_unemployed_months, p_recovery_months,
    p_initial_misconception, v_status
  ) INTO v_post_id, v_post_created_at;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id, step_order, content, is_failure,
      failed_reason_type, failed_reason_detail, failed_reason
    ) VALUES (
      v_post_id, (v_step->>'order')::INTEGER, v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReasonType', ''),
      NULLIF(v_step->>'failedReasonDetail', ''),
      NULLIF(v_step->>'failedReason', '')
    );
  END LOOP;

  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT v_post_id, unnest(p_region_ids);
  END IF;

  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      INSERT INTO public.tags (name) VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);
      INSERT INTO public.post_tags (post_id, tag_id) VALUES (v_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_post_id, v_post_created_at;
END;
$$;

-- ============================================
-- 4. update_recovery_post に p_status を追加
-- ============================================
DROP FUNCTION IF EXISTS public.update_recovery_post(
  UUID, TEXT, TEXT, problem_category_enum, INTEGER, DATE, DATE, TEXT, JSONB, INTEGER[], TEXT[], INTEGER, INTEGER, INTEGER, INTEGER, TEXT
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
  p_initial_misconception TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
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
  v_status TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recovery_posts WHERE id = p_post_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION USING message = '投稿が見つからないか、編集権限がありません', errcode = 'P2001';
  END IF;

  IF jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION USING message = 'ステップは最低1つ必要です', errcode = 'P1001';
  END IF;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    v_step_order := (v_step->>'order')::INTEGER;
    IF v_step_order < 1 THEN
      RAISE EXCEPTION USING
        message = format('ステップ順序が不正です: %s (1以上である必要があります)', v_step_order),
        errcode = 'P1002';
    END IF;
  END LOOP;

  v_status := CASE
    WHEN p_status = 'published' THEN 'published'
    WHEN p_status = 'draft' THEN 'draft'
    ELSE (SELECT status FROM public.recovery_posts WHERE id = p_post_id)
  END;

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
    status = v_status,
    updated_at = NOW()
  WHERE id = p_post_id AND user_id = auth.uid()
  RETURNING updated_at INTO v_updated_at;

  DELETE FROM public.recovery_steps WHERE post_id = p_post_id;
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id, step_order, content, is_failure,
      failed_reason_type, failed_reason_detail, failed_reason
    ) VALUES (
      p_post_id, (v_step->>'order')::INTEGER, v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReasonType', ''),
      NULLIF(v_step->>'failedReasonDetail', ''),
      NULLIF(v_step->>'failedReason', '')
    );
  END LOOP;

  DELETE FROM public.post_regions WHERE post_id = p_post_id;
  IF array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.post_regions (post_id, region_id)
    SELECT p_post_id, unnest(p_region_ids);
  END IF;

  DELETE FROM public.post_tags WHERE post_id = p_post_id;
  IF array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      INSERT INTO public.tags (name) VALUES (TRIM(BOTH '#' FROM v_tag_name))
      ON CONFLICT (name) DO NOTHING;
      SELECT id INTO v_tag_id FROM public.tags WHERE name = TRIM(BOTH '#' FROM v_tag_name);
      INSERT INTO public.post_tags (post_id, tag_id) VALUES (p_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN QUERY SELECT p_post_id, v_updated_at;
END;
$$;

-- ============================================
-- 5. get_recovery_post_detail: draft は投稿者のみ表示
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
      rp.initial_misconception, rp.status,
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
      AND (rp.status = 'published' OR (rp.status = 'draft' AND rp.user_id = auth.uid()))
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
    pd.region_names, pd.tag_names, pd.is_summary_only, pd.initial_misconception, pd.status,
    COALESCE(sd.steps, '[]'::JSONB) AS steps
  FROM post_data pd
  LEFT JOIN steps_data sd ON sd.post_id = pd.id;
$$;

-- ============================================
-- 6. get_recovery_posts: 公開投稿のみ（status = 'published'）
-- ============================================
-- 注: get_recovery_posts / get_recovery_posts_v2_cursor は
-- filtered_posts の WHERE に rp.status = 'published' を追加する必要あり。
-- これらは別マイグレーションで定義されているため、ここで REPLACE するか
-- 単純に ALTER は不可。次のマイグレーションで RPC を再定義するか、
-- 同じファイル内で DROP + CREATE する。

-- 一覧用 RPC は 20250131000003 等で定義。status 条件を追加するマイグレーションを
-- 20250208000001 に分離するか、ここで該当 RPC の全文を書く。
-- 最小侵入: 新規マイグレーション 20250208000001 で get_recovery_posts 系の
-- WHERE に AND rp.status = 'published' を追加する。
