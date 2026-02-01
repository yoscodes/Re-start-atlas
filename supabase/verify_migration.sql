-- ============================================
-- マイグレーション実行後の確認用SQLクエリ
-- ============================================

-- ============================================
-- 1. テーブルの存在確認
-- ============================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'recovery_posts', 'recovery_steps', 'regions', 'post_regions', 'tags', 'post_tags', 'comments', 'reactions')
    THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'recovery_posts', 'recovery_steps', 'regions', 'post_regions', 'tags', 'post_tags', 'comments', 'reactions')
ORDER BY table_name;

-- ============================================
-- 2. テーブル構造の確認（主要テーブル）
-- ============================================

-- usersテーブル
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- recovery_postsテーブル
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'recovery_posts'
ORDER BY ordinal_position;

-- ============================================
-- 3. インデックスの確認
-- ============================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'recovery_posts', 'recovery_steps', 'regions', 'post_regions', 'tags', 'post_tags', 'comments', 'reactions')
ORDER BY tablename, indexname;

-- ============================================
-- 4. RLSポリシーの確認
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. 外部キー制約の確認
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 6. 初期データ（regions）の確認
-- ============================================
SELECT 
  COUNT(*) as total_regions,
  COUNT(DISTINCT prefecture) as unique_prefectures
FROM regions;

-- 都道府県一覧（最初の10件）
SELECT id, prefecture, city
FROM regions
ORDER BY id
LIMIT 10;

-- ============================================
-- 7. チェック制約の確認
-- ============================================
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 8. トリガーの確認
-- ============================================
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 9. テーブルコメントの確認
-- ============================================
SELECT
  t.table_name,
  obj_description(c.oid, 'pg_class') as table_comment
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('users', 'recovery_posts', 'recovery_steps', 'regions', 'post_regions', 'tags', 'post_tags', 'comments', 'reactions')
ORDER BY t.table_name;

-- ============================================
-- 10. カラムコメントの確認（主要テーブル）
-- ============================================
SELECT
  t.table_name,
  c.column_name,
  col_description((t.table_schema||'.'||t.table_name)::regclass::oid, c.ordinal_position) as column_comment
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name IN ('users', 'recovery_posts', 'recovery_steps')
ORDER BY t.table_name, c.ordinal_position;
