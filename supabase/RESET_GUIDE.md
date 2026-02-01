# データベースリセットガイド

既存のデータベースを削除して、最初からマイグレーションを実行する手順です。

## ⚠️ 警告

**この操作は全てのデータを削除します。本番環境では絶対に実行しないでください。**

## 📋 実行手順

### ステップ1: クリーンアップSQLの実行

1. Supabase Dashboard → **「SQL Editor」** を開く
2. **「New query」** をクリック
3. `supabase/cleanup_before_migration.sql` の内容をコピー
4. SQL Editorに貼り付けて実行
5. 実行結果を確認（エラーがないことを確認）

### ステップ2: 削除の確認

SQL Editorで以下のクエリを実行して、削除が完了したことを確認：

```sql
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
```

### ステップ3: マイグレーションの実行

削除が確認できたら、通常のマイグレーションを実行：

1. SQL Editorで **「New query」** をクリック
2. `supabase/migrations/20250125000000_initial_schema.sql` の内容をコピー
3. SQL Editorに貼り付けて実行
4. 実行結果を確認

詳細は `supabase/SQL_EDITOR_GUIDE.md` を参照してください。

## 🔍 削除される内容

以下の内容が削除されます：

1. **RPC関数**
   - `create_recovery_post`

2. **トリガー**
   - `update_recovery_posts_updated_at`
   - `update_updated_at_column()` 関数

3. **テーブル**（9テーブル）
   - reactions
   - comments
   - post_tags
   - post_regions
   - recovery_steps
   - recovery_posts
   - users
   - tags
   - regions

4. **ENUM型**
   - `problem_category_enum`

5. **インデックス**（自動削除）
   - テーブル削除時に自動的に削除されます

6. **RLSポリシー**（自動削除）
   - テーブル削除時に自動的に削除されます

## 🐛 エラーが発生した場合

### エラー: `cannot drop table ... because other objects depend on it`

**原因**: 外部キー制約や依存関係がある

**対処法**: 
- `CASCADE` オプションが付いているので、通常は自動的に削除されます
- エラーが続く場合は、依存関係を確認：
  ```sql
  SELECT 
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view,
    source_ns.nspname as source_schema,
    source_table.relname as source_table
  FROM pg_depend
  JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
  JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
  JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
  JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
  JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
  WHERE source_table.relname = 'recovery_posts';
  ```

### エラー: `permission denied`

**原因**: 権限の問題

**対処法**:
- Supabase Dashboardで管理者権限があることを確認
- 必要に応じて、権限を付与：
  ```sql
  GRANT ALL ON SCHEMA public TO postgres;
  ```

## ✅ 完了後の確認

マイグレーション実行後、以下を確認：

- [ ] 9つのテーブルが作成されている
- [ ] `regions`テーブルに47件のデータがある
- [ ] RPC関数 `create_recovery_post` が作成されている
- [ ] RLSポリシーが各テーブルに設定されている
- [ ] エラーが発生していない

## 📝 注意事項

1. **データのバックアップ**: 削除前に重要なデータがある場合は、必ずバックアップを取ってください
2. **本番環境**: 本番環境では絶対に実行しないでください
3. **開発環境**: 開発環境でのみ使用してください
