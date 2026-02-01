-- ============================================
-- 既存データベースのクリーンアップ
-- マイグレーション実行前に実行してください
-- ============================================
-- ⚠️ 警告: このスクリプトは全てのデータを削除します
-- ⚠️ 本番環境では絶対に実行しないでください

-- ============================================
-- 1. RPC関数の削除
-- ============================================
DROP FUNCTION IF EXISTS public.create_recovery_post CASCADE;

-- ============================================
-- 2. トリガーの削除
-- ============================================
DROP TRIGGER IF EXISTS update_recovery_posts_updated_at ON public.recovery_posts;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- 3. テーブルの削除（外部キー制約があるため、子テーブルから順に削除）
-- ============================================

-- 子テーブルから削除
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_tags CASCADE;
DROP TABLE IF EXISTS public.post_regions CASCADE;
DROP TABLE IF EXISTS public.recovery_steps CASCADE;

-- 親テーブルを削除
DROP TABLE IF EXISTS public.recovery_posts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- マスタテーブル
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;

-- ============================================
-- 4. ENUM型の削除
-- ============================================
DROP TYPE IF EXISTS public.problem_category_enum CASCADE;

-- ============================================
-- 5. インデックスの削除（テーブル削除時に自動削除されますが、念のため）
-- ============================================
-- テーブルを削除すると自動的にインデックスも削除されるため、
-- 個別に削除する必要はありません

-- ============================================
-- 6. RLSポリシーの削除（テーブル削除時に自動削除されます）
-- ============================================
-- テーブルを削除すると自動的にRLSポリシーも削除されるため、
-- 個別に削除する必要はありません

-- ============================================
-- 確認用クエリ
-- ============================================
-- 以下のクエリで削除が完了したことを確認できます

-- テーブルが残っていないか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'recovery_posts', 'recovery_steps', 
    'regions', 'post_regions', 'tags', 'post_tags', 
    'comments', 'reactions'
  );
-- 結果が0件であればOK

-- ENUM型が残っていないか確認
SELECT typname 
FROM pg_type 
WHERE typname = 'problem_category_enum';
-- 結果が0件であればOK

-- RPC関数が残っていないか確認
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'create_recovery_post';
-- 結果が0件であればOK
