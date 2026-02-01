# マイグレーション実行ガイド

このガイドでは、作成したデータベーススキーマをSupabaseに適用する方法を詳しく説明します。

## 📋 前提条件

- Supabaseプロジェクトが作成済みであること
- `.env.local`にSupabaseの認証情報が設定されていること
- プロジェクトURL: `https://zxpagibpxnchzouglvpe.supabase.co`

---

## 方法1: Supabase Dashboardを使用（推奨・簡単）

### ステップ1: Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクト一覧から該当プロジェクトを選択
   - プロジェクト名: あなたのプロジェクト名
   - または、URLから判断: `zxpagibpxnchzouglvpe`

### ステップ2: SQL Editorを開く

1. 左サイドバーから **「SQL Editor」** をクリック
2. **「New query」** ボタンをクリックして新しいクエリを作成

### ステップ3: マイグレーションファイルの内容をコピー

1. プロジェクトの `supabase/migrations/20250125000000_initial_schema.sql` を開く
2. **ファイル全体をコピー**（`Cmd+A` → `Cmd+C`）

### ステップ4: SQL Editorに貼り付けて実行

1. SQL Editorのエディタに貼り付け（`Cmd+V`）
2. 右上の **「Run」** ボタンをクリック
   - または `Cmd+Enter`（Mac）/ `Ctrl+Enter`（Windows）

### ステップ5: 実行結果の確認

✅ **成功した場合:**
```
Success. No rows returned
```

または、各テーブルの作成メッセージが表示されます。

❌ **エラーが発生した場合:**
- エラーメッセージを確認
- よくあるエラーと対処法は下記の「トラブルシューティング」を参照

### ステップ6: テーブルの確認

1. 左サイドバーから **「Table Editor」** をクリック
2. 以下のテーブルが作成されているか確認：
   - ✅ `users`
   - ✅ `recovery_posts`
   - ✅ `recovery_steps`
   - ✅ `regions`（初期データ47都道府県が入っている）
   - ✅ `post_regions`
   - ✅ `tags`
   - ✅ `post_tags`
   - ✅ `comments`
   - ✅ `reactions`

### ステップ7: RLSポリシーの確認

1. 左サイドバーから **「Authentication」** → **「Policies」** をクリック
2. 各テーブルにRLSポリシーが設定されているか確認

---

## 方法2: Supabase CLIを使用（上級者向け）

### ステップ1: Supabase CLIのインストール

```bash
# Homebrewを使用（Mac）
brew install supabase/tap/supabase

# npmを使用（全プラットフォーム）
npm install -g supabase

# インストール確認
supabase --version
```

### ステップ2: Supabaseにログイン

```bash
supabase login
```

ブラウザが開き、Supabaseアカウントでログインします。

### ステップ3: プロジェクトにリンク

```bash
cd /Users/suzukiyousei/Documents/dev/portfolio/restart-atlas

# プロジェクトをリンク
supabase link --project-ref zxpagibpxnchzouglvpe
```

**注意:** `zxpagibpxnchzouglvpe` はプロジェクトURLから取得したプロジェクト参照IDです。
実際のプロジェクト参照IDが異なる場合は、Supabase Dashboardの「Settings」→「General」から確認してください。

### ステップ4: マイグレーションの実行

```bash
# マイグレーションをプッシュ
supabase db push

# または、特定のマイグレーションファイルを実行
supabase migration up
```

### ステップ5: 実行結果の確認

CLIで実行結果が表示されます。エラーがないか確認してください。

---

## 🔍 実行後の確認チェックリスト

### ✅ テーブルの確認

```sql
-- Table Editorで確認するか、SQL Editorで実行
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

期待されるテーブル:
- comments
- post_regions
- post_tags
- reactions
- recovery_posts
- recovery_steps
- regions
- tags
- users

### ✅ インデックスの確認

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### ✅ RLSポリシーの確認

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### ✅ 初期データ（regions）の確認

```sql
SELECT COUNT(*) FROM regions;
-- 期待値: 47（都道府県数）
```

```sql
SELECT * FROM regions ORDER BY id LIMIT 10;
-- 都道府県データが表示されることを確認
```

---

## 🐛 トラブルシューティング

### エラー1: `relation "auth.users" does not exist`

**原因:** Supabase Authが有効化されていない

**対処法:**
1. Supabase Dashboard → **「Authentication」** → **「Providers」**
2. **「Email」** プロバイダーが有効になっているか確認
3. 有効化されていない場合は有効化

### エラー2: `language "japanese" does not exist`

**原因:** 日本語全文検索の拡張機能が有効化されていない

**対処法1（推奨）:** 全文検索インデックスをコメントアウト
```sql
-- マイグレーションファイルの以下の2行をコメントアウト
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_title_gin ON public.recovery_posts USING gin(to_tsvector('japanese', title));
-- CREATE INDEX IF NOT EXISTS idx_recovery_posts_summary_gin ON public.recovery_posts USING gin(to_tsvector('japanese', summary));
```

**対処法2:** 'simple'を使用（全文検索の精度は下がります）
```sql
-- 'japanese' を 'simple' に変更
CREATE INDEX IF NOT EXISTS idx_recovery_posts_title_gin ON public.recovery_posts USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_recovery_posts_summary_gin ON public.recovery_posts USING gin(to_tsvector('simple', summary));
```

### エラー3: `permission denied for schema public`

**原因:** 権限の問題

**対処法:**
1. Supabase Dashboard → **「Settings」** → **「Database」**
2. データベースの権限設定を確認
3. 必要に応じて、SQL Editorで以下を実行:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### エラー4: `duplicate key value violates unique constraint`

**原因:** 既にテーブルやデータが存在している

**対処法:**
- `CREATE TABLE IF NOT EXISTS` を使用しているため、通常は発生しません
- 既存のテーブルを削除してから再実行:
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
```

### エラー5: `column "id" does not exist` (usersテーブル)

**原因:** `auth.users`テーブルへの参照が正しく機能していない

**対処法:**
1. Supabase Dashboard → **「Authentication」** → **「Users」**
2. テストユーザーを作成して、`auth.users`が機能しているか確認
3. マイグレーションを再実行

---

## 📝 次のステップ（マイグレーション実行後）

### 1. テストデータの投入

```sql
-- テストユーザーの作成（認証経由で作成することを推奨）
-- まず、アプリでサインアップしてから以下を実行

-- テスト投稿の作成例
INSERT INTO recovery_posts (
  user_id,
  title,
  summary,
  problem_category,
  phase_at_post,
  started_at,
  current_status
) VALUES (
  'your-user-id-here', -- auth.usersから取得したID
  '借金300万円からの回復',
  '25歳の時に借金を抱え、実家に戻って返済を開始しました。',
  'debt',
  2,
  '2023-01-01',
  '現在返済中。あと100万円残っています。'
);
```

### 2. TypeScript型の確認

```typescript
// アプリケーションコードで型が正しく機能するか確認
import { createClient } from '@/lib/supabase/client'
import type { RecoveryPost } from '@/lib/supabase/types'

const supabase = createClient()

// 型が正しく推論されることを確認
const { data, error } = await supabase
  .from('recovery_posts')
  .select('*')
  .single()

// data の型が RecoveryPost になっていることを確認
```

### 3. RLSポリシーのテスト

1. ログイン状態でデータを取得できるか確認
2. ログアウト状態でデータを取得できるか確認（SELECTは全員OK）
3. 他人の投稿を編集できないことを確認

---

## 🎯 まとめ

**推奨フロー:**
1. ✅ Supabase DashboardのSQL Editorを使用（最も簡単）
2. ✅ マイグレーションファイルをコピー＆ペースト
3. ✅ 実行して成功を確認
4. ✅ Table Editorでテーブルを確認
5. ✅ テストデータを投入して動作確認

**問題が発生した場合:**
- エラーメッセージを確認
- 上記のトラブルシューティングを参照
- Supabaseのドキュメントを確認: https://supabase.com/docs

---

## 📚 参考リンク

- [Supabase SQL Editor ドキュメント](https://supabase.com/docs/guides/database/overview)
- [Supabase CLI ドキュメント](https://supabase.com/docs/reference/cli/introduction)
- [Row Level Security ドキュメント](https://supabase.com/docs/guides/auth/row-level-security)
