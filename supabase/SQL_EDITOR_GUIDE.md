# Supabase Dashboard SQL Editor 実行ガイド

このガイドでは、Supabase DashboardのSQL Editorでマイグレーションを実行する手順を詳しく説明します。

## 📋 実行前の確認

- ✅ Supabaseプロジェクトにアクセスできること
- ✅ プロジェクトのURL: `https://zxpagibpxnchzouglvpe.supabase.co`
- ✅ 管理者権限があること

## 🚀 実行手順

### ステップ1: Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクト一覧から該当プロジェクトを選択
   - プロジェクト名: あなたのプロジェクト名
   - または、URLから判断: `zxpagibpxnchzouglvpe`

### ステップ2: SQL Editorを開く

1. 左サイドバーから **「SQL Editor」** をクリック
2. **「New query」** ボタンをクリックして新しいクエリを作成

### ステップ3: マイグレーションファイルの内容をコピー

1. プロジェクトの以下のファイルを開く:
   ```
   supabase/migrations/20250125000000_initial_schema.sql
   ```

2. **ファイル全体を選択**（`Cmd+A` / `Ctrl+A`）

3. **コピー**（`Cmd+C` / `Ctrl+C`）

### ステップ4: SQL Editorに貼り付けて実行

1. SQL Editorのエディタエリアをクリック
2. **貼り付け**（`Cmd+V` / `Ctrl+V`）
3. 右上の **「Run」** ボタンをクリック
   - または `Cmd+Enter`（Mac）/ `Ctrl+Enter`（Windows）

### ステップ5: 実行結果の確認

#### ✅ 成功した場合

以下のようなメッセージが表示されます：

```
Success. No rows returned
```

または、各テーブル・インデックス・関数の作成メッセージが表示されます。

#### ❌ エラーが発生した場合

エラーメッセージが表示されます。よくあるエラーと対処法は下記を参照してください。

## 🔍 実行後の確認

### 1. テーブルの確認

1. 左サイドバーから **「Table Editor」** をクリック
2. 以下のテーブルが作成されているか確認：
   - ✅ `users`
   - ✅ `recovery_posts`
   - ✅ `recovery_steps`
   - ✅ `regions`（47件のデータが入っている）
   - ✅ `post_regions`
   - ✅ `tags`
   - ✅ `post_tags`
   - ✅ `comments`
   - ✅ `reactions`

### 2. RPC関数の確認

1. 左サイドバーから **「Database」** → **「Functions」** をクリック
2. `create_recovery_post` 関数が表示されているか確認

### 3. 確認用SQLクエリの実行

SQL Editorで以下のクエリを実行して確認：

```sql
-- テーブル一覧の確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'recovery_posts', 'recovery_steps', 
    'regions', 'post_regions', 'tags', 'post_tags', 
    'comments', 'reactions'
  )
ORDER BY table_name;

-- 初期データ（regions）の確認
SELECT COUNT(*) as total_regions FROM regions;
-- 期待値: 47

-- RPC関数の確認
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'create_recovery_post';
-- 期待値: create_recovery_post が1件
```

## 🐛 よくあるエラーと対処法

### エラー1: `relation "auth.users" does not exist`

**原因**: Supabase Authが有効化されていない

**対処法**:
1. Supabase Dashboard → **「Authentication」** → **「Providers」**
2. **「Email」** プロバイダーが有効になっているか確認
3. 有効化されていない場合は有効化

### エラー2: `type "problem_category_enum" does not exist`

**原因**: ENUM型が既に存在している、または順序の問題

**対処法**:
- マイグレーションファイルのENUM型定義部分（28-35行目）が先に実行されているか確認
- エラーが続く場合は、ENUM型を先に作成：
  ```sql
  CREATE TYPE problem_category_enum AS ENUM (
    'debt', 'unemployed', 'dropout', 'addiction', 'relationship'
  );
  ```

### エラー3: `permission denied for schema public`

**原因**: 権限の問題

**対処法**:
1. Supabase Dashboard → **「Settings」** → **「Database」**
2. データベースの権限設定を確認
3. 必要に応じて、SQL Editorで以下を実行:
   ```sql
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

### エラー4: `duplicate key value violates unique constraint`

**原因**: 既にテーブルやデータが存在している

**対処法**:
- `CREATE TABLE IF NOT EXISTS` を使用しているため、通常は発生しません
- 既存のテーブルを削除してから再実行する場合:
  ```sql
  -- 注意: 既存データが全て削除されます！
  DROP TABLE IF EXISTS reactions CASCADE;
  DROP TABLE IF EXISTS comments CASCADE;
  DROP TABLE IF EXISTS post_tags CASCADE;
  DROP TABLE IF EXISTS tags CASCADE;
  DROP TABLE IF EXISTS post_regions CASCADE;
  DROP TABLE IF EXISTS recovery_steps CASCADE;
  DROP TABLE IF EXISTS recovery_posts CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS regions CASCADE;
  DROP TYPE IF EXISTS problem_category_enum CASCADE;
  ```

### エラー5: `function "create_recovery_post" already exists`

**原因**: RPC関数が既に存在している

**対処法**:
- `CREATE OR REPLACE FUNCTION` を使用しているため、上書きされます
- エラーが続く場合は、先に削除：
  ```sql
  DROP FUNCTION IF EXISTS public.create_recovery_post;
  ```

## 📝 実行される内容の概要

このマイグレーションで実行される内容：

1. **ENUM型の作成**
   - `problem_category_enum`

2. **テーブルの作成**（9テーブル）
   - `users`
   - `recovery_posts`
   - `recovery_steps`
   - `regions`
   - `post_regions`
   - `tags`
   - `post_tags`
   - `comments`
   - `reactions`

3. **インデックスの作成**（多数）
   - 単一カラムインデックス
   - 複合インデックス（`idx_posts_category_phase_created`）

4. **RLSポリシーの設定**
   - 全テーブルにRLSを有効化
   - 適切なポリシーを設定

5. **初期データの投入**
   - `regions`テーブルに47都道府県を投入

6. **RPC関数の作成**
   - `create_recovery_post`（投稿作成用）

7. **トリガーの作成**
   - `update_recovery_posts_updated_at`（updated_at自動更新用）

## ✅ 実行完了後のチェックリスト

- [ ] 9つのテーブルが作成されている
- [ ] `regions`テーブルに47件のデータがある
- [ ] RPC関数 `create_recovery_post` が作成されている
- [ ] RLSポリシーが各テーブルに設定されている
- [ ] エラーが発生していない

## 🎯 次のステップ

マイグレーション実行後：

1. **アプリケーションの動作確認**
   - 認証機能が正常に動作するか確認
   - 投稿作成機能をテスト

2. **RPC関数のテスト**
   - SQL EditorでRPC関数を直接テスト（認証が必要なため、実際のユーザーでログイン後）

3. **開発を開始**
   - フォームコンポーネントの実装
   - 投稿一覧ページの実装

## 📚 参考リンク

- [Supabase SQL Editor ドキュメント](https://supabase.com/docs/guides/database/overview)
- [Row Level Security ドキュメント](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions ドキュメント](https://www.postgresql.org/docs/current/sql-createfunction.html)
