-- ============================================
-- サンプル投稿作成スクリプト
-- 6ブロック構成の表示確認用
-- ============================================
-- 
-- 使用方法:
-- 1. まず、ユーザーIDを取得してください:
--    SELECT id FROM auth.users LIMIT 1;
--    または、Supabase Dashboard → Authentication → Users から確認
-- 
-- 2. 以下の変数を実際のユーザーIDに置き換えてください:
--    \set user_id 'your-user-id-here'
-- 
-- 3. このスクリプトを実行してください
-- 
-- 注意: 
-- - regionsテーブルのIDが異なる場合は、以下のクエリで確認してから
--   スクリプト内のregion_idを修正してください:
--   SELECT id, prefecture FROM public.regions WHERE city IS NULL ORDER BY id;
-- - ユーザーIDは必ず指定してください（auth.uid()はSQL EditorではNULLになります）
-- ============================================

-- ============================================
-- ステップ1: ユーザーIDを取得（必須）
-- ============================================
-- 以下のクエリでユーザーIDを取得してください:
-- SELECT id FROM auth.users LIMIT 1;
-- または、Supabase Dashboard → Authentication → Users から確認
-- 
-- 取得したユーザーIDを、以下の変数に設定してください
-- ============================================

-- ユーザーIDを取得してセッション変数に設定
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 最初のユーザーIDを取得
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません。auth.usersテーブルにユーザーが存在するか確認してください。';
  END IF;
  
  -- セッション変数に保存（以降のクエリで使用）
  PERFORM set_config('app.user_id', v_user_id::TEXT, false);
  
  RAISE NOTICE 'ユーザーIDを設定しました: %', v_user_id;
END $$;

-- ============================================
-- 事前確認: 地域IDの確認（実行前に確認推奨）
-- ============================================
-- 以下のクエリで地域IDを確認してください:
-- SELECT id, prefecture FROM public.regions WHERE city IS NULL ORDER BY id;
-- 
-- 例: 東京都=13, 大阪府=27, 神奈川県=14 など
-- スクリプト内のARRAY[13]などの数値を、実際のIDに合わせて修正してください

-- ============================================
-- サンプル投稿1: 借金カテゴリ、Lv2（回復中）
-- ============================================
SELECT * FROM public.create_sample_recovery_post(
  current_setting('app.user_id')::UUID, -- ユーザーID（上記のDOブロックで設定）
  '借金300万円からの回復',
  '25歳の時にクレジットカードの借金を抱え、実家に戻って返済を開始しました。家族のサポートと節約生活で3年かけて完済しました。',
  'debt'::problem_category_enum,
  2, -- phase_at_post: Lv2（回復中）
  '2021-01-01'::DATE,
  '2024-01-01'::DATE,
  '完済しました。現在は貯金に回しています。',
  '[
    {
      "order": 1,
      "content": "実家に戻って生活費を削減",
      "isFailure": false
    },
    {
      "order": 2,
      "content": "アルバイトを2つ掛け持ち",
      "isFailure": false
    },
    {
      "order": 3,
      "content": "クレジットカードを解約",
      "isFailure": true,
      "failedReason": "すぐに再発行してしまった。自制心が足りなかった。"
    },
    {
      "order": 4,
      "content": "家計簿アプリで支出を可視化",
      "isFailure": false
    },
    {
      "order": 5,
      "content": "毎月の返済額を固定して計画を立てる",
      "isFailure": false
    }
  ]'::JSONB,
  ARRAY[13], -- 東京都（regionsテーブルから確認してください）
  ARRAY['25歳', '借金300万', '実家暮らし', '完済'],
  25, -- age_at_that_time
  300, -- debt_amount（万円単位）
  NULL, -- unemployed_months
  36 -- recovery_months（3年 = 36ヶ月）
);

-- ============================================
-- サンプル投稿2: 失業カテゴリ、Lv3（回復完了）
-- ============================================
SELECT * FROM public.create_sample_recovery_post(
  current_setting('app.user_id')::UUID, -- ユーザーID
  '無職1年半からのIT転職成功',
  '30歳で会社を辞めてから1年半、転職活動に苦労しましたが、IT業界への転職に成功しました。スキルアップとネットワーキングが鍵でした。',
  'unemployed'::problem_category_enum,
  3, -- phase_at_post: Lv3（回復完了）
  '2022-06-01'::DATE,
  '2024-01-15'::DATE,
  '現在はエンジニアとして働いています。転職して良かったです。',
  '[
    {
      "order": 1,
      "content": "オンライン学習プラットフォームでプログラミングを学ぶ",
      "isFailure": false
    },
    {
      "order": 2,
      "content": "ポートフォリオサイトを作成",
      "isFailure": false
    },
    {
      "order": 3,
      "content": "転職エージェントに登録",
      "isFailure": false
    },
    {
      "order": 4,
      "content": "技術書を買いすぎてお金を使いすぎた",
      "isFailure": true,
      "failedReason": "情報過多で逆に混乱した。1冊ずつ完璧に理解してから次に進むべきだった。"
    },
    {
      "order": 5,
      "content": "技術コミュニティに参加してネットワーキング",
      "isFailure": false
    },
    {
      "order": 6,
      "content": "面接練習を重ねて自信をつける",
      "isFailure": false
    }
  ]'::JSONB,
  ARRAY[13], -- 東京都
  ARRAY['30歳', '無職1年半', 'IT転職', 'エンジニア'],
  30, -- age_at_that_time
  NULL, -- debt_amount
  18, -- unemployed_months（1年半 = 18ヶ月）
  19 -- recovery_months（約1年7ヶ月）
);

-- ============================================
-- サンプル投稿3: 借金カテゴリ、Lv1（問題発生中）
-- ============================================
SELECT * FROM public.create_sample_recovery_post(
  current_setting('app.user_id')::UUID, -- ユーザーID
  '多重債務500万円、今から返済計画を立てる',
  '28歳で複数の金融機関から借金をしてしまい、合計500万円の債務を抱えています。今から返済計画を立てて、一歩ずつ前に進みたいです。',
  'debt'::problem_category_enum,
  1, -- phase_at_post: Lv1（問題発生中）
  '2023-03-01'::DATE,
  NULL, -- recovered_at: まだ回復していない
  '現在、返済計画を立てている最中です。',
  '[
    {
      "order": 1,
      "content": "全ての借金をリストアップ",
      "isFailure": false
    },
    {
      "order": 2,
      "content": "金融機関に相談に行く",
      "isFailure": false
    },
    {
      "order": 3,
      "content": "自己破産を検討したが、まだ諦められない",
      "isFailure": true,
      "failedReason": "情報収集が不十分で、他の選択肢を検討せずに焦って判断しそうになった。"
    }
  ]'::JSONB,
  ARRAY[27], -- 大阪府（regionsテーブルから確認してください）
  ARRAY['28歳', '借金500万', '多重債務', '返済計画'],
  28, -- age_at_that_time
  500, -- debt_amount（万円単位）
  NULL, -- unemployed_months
  NULL -- recovery_months（まだ回復していない）
);

-- ============================================
-- サンプル投稿4: 失業カテゴリ、Lv2（回復中）
-- ============================================
SELECT * FROM public.create_sample_recovery_post(
  current_setting('app.user_id')::UUID, -- ユーザーID
  '転職活動6ヶ月、ようやく面接の機会が増えてきた',
  '35歳で前職を退職してから6ヶ月、転職活動を続けています。最近ようやく面接の機会が増えてきて、希望が見えてきました。',
  'unemployed'::problem_category_enum,
  2, -- phase_at_post: Lv2（回復中）
  '2024-07-01'::DATE,
  NULL, -- recovered_at: まだ回復していない
  '転職活動を継続中です。面接の機会が増えてきて、前向きに取り組んでいます。',
  '[
    {
      "order": 1,
      "content": "転職エージェントに複数登録",
      "isFailure": false
    },
    {
      "order": 2,
      "content": "LinkedInでプロフィールを充実させる",
      "isFailure": false
    },
    {
      "order": 3,
      "content": "最初は給与条件だけで選んでしまった",
      "isFailure": true,
      "failedReason": "給与だけで選ぶと、会社の文化や自分の価値観と合わない可能性がある。"
    },
    {
      "order": 4,
      "content": "面接のフィードバックを活かして改善",
      "isFailure": false
    }
  ]'::JSONB,
  ARRAY[14], -- 神奈川県
  ARRAY['35歳', '転職活動', '6ヶ月', '面接'],
  35, -- age_at_that_time
  NULL, -- debt_amount
  6, -- unemployed_months
  NULL -- recovery_months（まだ回復していない）
);

-- ============================================
-- 確認用クエリ
-- ============================================
-- 作成された投稿を確認
-- SELECT 
--   rp.id,
--   rp.title,
--   rp.phase_at_post,
--   rp.problem_category,
--   rp.age_at_that_time,
--   rp.debt_amount,
--   rp.unemployed_months,
--   rp.recovery_months,
--   COUNT(rs.id) as step_count,
--   COUNT(rs.id) FILTER (WHERE rs.is_failure = TRUE) as failed_step_count
-- FROM public.recovery_posts rp
-- LEFT JOIN public.recovery_steps rs ON rs.post_id = rp.id
-- WHERE rp.user_id = auth.uid()
--   AND rp.deleted_at IS NULL
-- GROUP BY rp.id
-- ORDER BY rp.created_at DESC;
