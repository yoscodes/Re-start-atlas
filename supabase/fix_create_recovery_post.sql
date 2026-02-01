-- ============================================
-- create_recovery_post関数の修正
-- RETURNING句の曖昧性エラーを修正
-- ============================================

-- 既存の関数を削除（複数のオーバーロードがある可能性があるため）
DROP FUNCTION IF EXISTS public.create_recovery_post(
  TEXT, TEXT, problem_category_enum, INTEGER, DATE, DATE, TEXT, JSONB, INTEGER[], TEXT[], INTEGER, INTEGER, INTEGER, INTEGER
);

-- 関数を再作成
CREATE FUNCTION public.create_recovery_post(
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
  p_recovery_months INTEGER DEFAULT NULL
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

  -- 親投稿の作成（検索特化フィールドを含む）
  INSERT INTO public.recovery_posts (
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
    recovery_months
  ) VALUES (
    auth.uid(),
    p_title,
    p_summary,
    p_problem_category,
    p_phase_at_post,
    p_started_at,
    p_recovered_at,
    p_current_status,
    p_age_at_that_time,
    p_debt_amount,
    p_unemployed_months,
    p_recovery_months
  )
  RETURNING id, created_at INTO v_post_id, v_post_created_at;

  -- ステップの作成
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.recovery_steps (
      post_id,
      step_order,
      content,
      is_failure,
      failed_reason
    ) VALUES (
      v_post_id,
      (v_step->>'order')::INTEGER,
      v_step->>'content',
      COALESCE((v_step->>'isFailure')::BOOLEAN, FALSE),
      NULLIF(v_step->>'failedReason', '') -- 空文字列はNULLに変換
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
