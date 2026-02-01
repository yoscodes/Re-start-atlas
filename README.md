# Restart Atlas

Next.jsとSupabaseを使用したモダンなWebアプリケーションです。

## 機能

- 🔐 認証機能（サインアップ/ログイン/ログアウト）
- 📱 レスポンシブデザイン
- 🌙 ダークモード対応
- ⚡ Next.js 14 App Router
- 🎨 Tailwind CSS

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAnon Keyを取得

### 3. 環境変数の設定

`.env.local.example`を`.env.local`にコピーし、Supabaseの認証情報を設定してください：

```bash
cp .env.local.example .env.local
```

`.env.local`ファイルを編集：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. データベースマイグレーションの実行

Supabase DashboardまたはSupabase CLIを使用してデータベーススキーマを適用します。

**方法1: Supabase Dashboard（推奨）**

1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. 左サイドバーから **「SQL Editor」** をクリック
4. **「New query」** をクリック
5. `supabase/migrations/20250125000000_initial_schema.sql` の内容をコピー＆ペースト
6. **「Run」** ボタンをクリック

**方法2: Supabase CLI**

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref your-project-ref

# マイグレーションを実行
supabase db push
```

**詳細な手順は `supabase/MIGRATION_GUIDE.md` を参照してください。**

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
restart-atlas/
├── app/                    # Next.js App Router
│   ├── auth/              # 認証関連ページ
│   │   ├── signin/       # ログインページ
│   │   ├── signup/       # サインアップページ
│   │   └── signout/      # ログアウトAPI
│   ├── dashboard/        # ダッシュボードページ
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # ホームページ
│   └── globals.css       # グローバルスタイル
├── components/           # Reactコンポーネント
│   ├── SignInForm.tsx   # ログインフォーム
│   └── SignUpForm.tsx   # サインアップフォーム
├── lib/                  # ユーティリティ
│   └── supabase/        # Supabaseクライアント
│       ├── client.ts     # ブラウザ用クライアント
│       ├── server.ts     # サーバー用クライアント
│       └── types.ts      # データベース型定義
├── supabase/            # Supabase設定
│   ├── migrations/      # データベースマイグレーション
│   │   └── 20250125000000_initial_schema.sql
│   ├── MIGRATION_GUIDE.md  # マイグレーション実行ガイド
│   ├── README.md        # データベース設計ドキュメント
│   ├── verify_migration.sql  # マイグレーション確認用SQL
│   └── test_data.sql    # テストデータ投入用SQL
├── middleware.ts         # Next.jsミドルウェア（セッション管理）
└── package.json
```

## 使用技術

- **Next.js 14** - Reactフレームワーク
- **TypeScript** - 型安全性
- **Supabase** - バックエンドサービス（認証・データベース）
- **Tailwind CSS** - ユーティリティファーストCSS
- **@supabase/ssr** - Supabase SSRサポート

## スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - ESLintを実行

## データベース設計

詳細なデータベース設計については `supabase/README.md` を参照してください。

### 主要テーブル

- `users` - 匿名ユーザー
- `recovery_posts` - 回復投稿（核となるテーブル）
- `recovery_steps` - 回復プロセス
- `regions` - 地域マスタ
- `tags` - タグマスタ
- `comments` - コメント
- `reactions` - リアクション

## 次のステップ

- [x] データベーステーブルの作成
- [ ] CRUD操作の実装
- [ ] 投稿一覧・詳細ページの実装
- [ ] 検索機能の実装
- [ ] ファイルアップロード機能
- [ ] リアルタイム機能の追加
- [ ] より高度な認証機能（OAuth、パスワードリセットなど）

## ライセンス

MIT
<<<<<<< HEAD
=======
>>>>>>> 15ad3d6 (リスタート・アトラス)
# Re-start-atlas
>>>>>>> ac01e2f (first commit)
