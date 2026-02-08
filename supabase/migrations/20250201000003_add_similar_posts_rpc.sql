-- ============================================
-- 似た状況の投稿レコメンド用RPC関数
-- 数字ベースで類似度を計算し、上位3件を返す
-- ============================================

CREATE OR REPLACE FUNCTION public.get_similar_recovery_posts(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  phase_at_post INTEGER,
  problem_category problem_category_enum,
  -- 表示用の数字1つ（カテゴリに応じて最適なものを選ぶ）
  display_number TEXT,
  display_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH current_post AS (
    SELECT
      rp.id,
      rp.phase_at_post,
      rp.problem_category,
      rp.age_at_that_time,
      rp.debt_amount,
      rp.unemployed_months,
      rp.recovery_months,
      -- 地域IDの配列を取得
      COALESCE(
        array_agg(DISTINCT pr.region_id) FILTER (WHERE pr.region_id IS NOT NULL),
        ARRAY[]::INTEGER[]
      ) AS region_ids
    FROM public.recovery_posts rp
    LEFT JOIN public.post_regions pr ON pr.post_id = rp.id
    WHERE rp.id = p_post_id
      AND rp.deleted_at IS NULL
    GROUP BY rp.id
  ),
  similar_posts AS (
    SELECT
      rp.id,
      rp.title,
      rp.phase_at_post,
      rp.problem_category,
      rp.created_at,
      rp.age_at_that_time,
      rp.debt_amount,
      rp.unemployed_months,
      rp.recovery_months,
      -- 類似度スコアを計算
      (
        -- phase_at_post が同じ: +3点
        CASE WHEN rp.phase_at_post = cp.phase_at_post THEN 3 ELSE 0 END +
        -- problem_category が同じ: +2点
        CASE WHEN rp.problem_category = cp.problem_category THEN 2 ELSE 0 END +
        -- region が1つでも一致: +2点
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM public.post_regions pr2
            WHERE pr2.post_id = rp.id
              AND pr2.region_id = ANY(cp.region_ids)
          ) THEN 2
          ELSE 0
        END +
        -- age_at_that_time が近い（差5歳以内）: +1点
        CASE 
          WHEN cp.age_at_that_time IS NOT NULL 
            AND rp.age_at_that_time IS NOT NULL
            AND ABS(rp.age_at_that_time - cp.age_at_that_time) <= 5
          THEN 1
          ELSE 0
        END +
        -- debt_amount が近い（差50万円以内）: +1点
        CASE 
          WHEN cp.problem_category = 'debt'
            AND cp.debt_amount IS NOT NULL
            AND rp.debt_amount IS NOT NULL
            AND ABS(rp.debt_amount - cp.debt_amount) <= 50
          THEN 1
          ELSE 0
        END +
        -- unemployed_months が近い（差3ヶ月以内）: +1点
        CASE 
          WHEN cp.problem_category = 'unemployed'
            AND cp.unemployed_months IS NOT NULL
            AND rp.unemployed_months IS NOT NULL
            AND ABS(rp.unemployed_months - cp.unemployed_months) <= 3
          THEN 1
          ELSE 0
        END +
        -- recovery_months が近い（差3ヶ月以内）: +1点
        CASE 
          WHEN cp.recovery_months IS NOT NULL
            AND rp.recovery_months IS NOT NULL
            AND ABS(rp.recovery_months - cp.recovery_months) <= 3
          THEN 1
          ELSE 0
        END
      ) AS similarity_score,
      -- 表示用の数字とラベルを決定
      CASE
        -- 借金カテゴリ: 借金額を優先
        WHEN rp.problem_category = 'debt' AND rp.debt_amount IS NOT NULL THEN
          jsonb_build_object(
            'number', rp.debt_amount::TEXT || '万円',
            'label', '借金額'
          )
        -- 失業カテゴリ: 無職期間を優先
        WHEN rp.problem_category = 'unemployed' AND rp.unemployed_months IS NOT NULL THEN
          jsonb_build_object(
            'number',
            CASE 
              WHEN rp.unemployed_months >= 12 THEN
                (rp.unemployed_months / 12)::INTEGER::TEXT || '年以上'
              ELSE
                rp.unemployed_months::TEXT || 'ヶ月'
            END,
            'label', '無職期間'
          )
        -- 年齢があれば年齢を表示
        WHEN rp.age_at_that_time IS NOT NULL THEN
          jsonb_build_object(
            'number', rp.age_at_that_time::TEXT || '代',
            'label', '当時の年齢'
          )
        -- 回復期間があれば回復期間を表示
        WHEN rp.recovery_months IS NOT NULL THEN
          jsonb_build_object(
            'number',
            CASE 
              WHEN rp.recovery_months >= 12 THEN
                (rp.recovery_months / 12)::INTEGER::TEXT || '年'
              ELSE
                rp.recovery_months::TEXT || 'ヶ月'
            END,
            'label', '回復期間'
          )
        -- デフォルト: なし
        ELSE
          jsonb_build_object('number', NULL, 'label', NULL)
      END AS display_info
    FROM public.recovery_posts rp
    CROSS JOIN current_post cp
    WHERE rp.id != cp.id
      AND rp.deleted_at IS NULL
      -- 最低でもphase_at_postまたはproblem_categoryが一致するもののみ
      AND (
        rp.phase_at_post = cp.phase_at_post
        OR rp.problem_category = cp.problem_category
      )
  )
  SELECT
    sp.id,
    sp.title,
    sp.phase_at_post,
    sp.problem_category,
    (sp.display_info->>'number')::TEXT AS display_number,
    (sp.display_info->>'label')::TEXT AS display_label
  FROM similar_posts sp
  WHERE sp.similarity_score > 0
  ORDER BY sp.similarity_score DESC, sp.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_similar_recovery_posts IS '似た状況の投稿をレコメンドするRPC関数。数字ベースで類似度を計算し、上位3件を返す。';
