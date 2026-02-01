# 投稿削除フロー（論理削除）

このドキュメントでは、投稿削除（論理削除）機能の実装について説明します。

## 📋 設計思想

### 論理削除の採用

- **物理削除禁止**: データを完全に削除せず、`deleted_at`カラムで管理
- **復元可能**: 必要に応じて削除された投稿を復元可能
- **検索除外**: 削除された投稿は検索結果から自動的に除外

### エラーコード設計の活用

- **P2001**: 権限エラー（既存のエラーコードをそのまま使用）
- エラーコード設計がそのまま使える

## 🏗️ アーキテクチャ

```
DeletePostButton (UI)
  ↓
deleteRecoveryPost (Server Action)
  ↓
delete_recovery_post (RPC関数)
  ↓
論理削除（deleted_atを設定）
```

## 📁 ファイル構成

```
supabase/
└── migrations/
    └── 20250126000000_add_soft_delete.sql  # 論理削除機能のマイグレーション

lib/
├── actions/
│   └── recovery-post.ts     # deleteRecoveryPost, restoreRecoveryPost
└── supabase/
    └── types.ts             # deleted_atカラムの型定義

components/
├── DeletePostButton.tsx     # 削除ボタン（確認ダイアログ付き）
└── RestorePostButton.tsx    # 復元ボタン
```

## 🔧 データベース変更

### 1. deleted_atカラムの追加

```sql
ALTER TABLE public.recovery_posts 
ADD COLUMN deleted_at TIMESTAMPTZ;
```

### 2. インデックスの追加

```sql
CREATE INDEX idx_recovery_posts_deleted_at 
ON recovery_posts(deleted_at) 
WHERE deleted_at IS NULL;
```

**ポイント**: 部分インデックスで削除されていない投稿の検索を高速化

### 3. RLSポリシーの更新

```sql
-- 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "recovery_posts_select_all" ON public.recovery_posts;

-- 新しいSELECTポリシー（削除されていない投稿のみ表示）
CREATE POLICY "recovery_posts_select_not_deleted" ON public.recovery_posts
  FOR SELECT USING (deleted_at IS NULL);
```

## 🔧 RPC関数: delete_recovery_post

### 特徴

- **権限チェック**: 投稿の所有者のみ削除可能（P2001エラー）
- **論理削除**: `deleted_at`を設定（物理削除はしない）
- **TABLE型の戻り値**: `post_id`, `deleted_at`を返す

### 処理フロー

1. 権限チェック（P2001エラー）
2. 論理削除（`deleted_at = NOW()`）
3. 戻り値（`post_id`, `deleted_at`）

### エラーコード

| エラーコード | 説明 | 発生タイミング |
|------------|------|--------------|
| `P2001` | 投稿が見つからないか、削除権限がない | 権限チェック時 |

## 🔧 RPC関数: restore_recovery_post

### 特徴

- **復元機能**: 削除された投稿を復元可能
- **権限チェック**: 投稿の所有者のみ復元可能
- **TABLE型の戻り値**: `post_id`, `restored_at`を返す

## 🎨 UIコンポーネント

### DeletePostButton

削除確認ダイアログ付きの削除ボタン。

**特徴:**
- 確認ダイアログで誤削除を防止
- エラー表示
- 権限エラー時の自動リダイレクト

**使用例:**

```tsx
<DeletePostButton
  postId={post.id}
  postTitle={post.title}
  onDeleted={() => router.push('/posts')}
/>
```

### RestorePostButton

削除された投稿を復元するボタン。

**特徴:**
- シンプルな復元ボタン
- エラー表示

**使用例:**

```tsx
<RestorePostButton
  postId={post.id}
  onRestored={() => router.refresh()}
/>
```

## 🔍 Server Action

### deleteRecoveryPost

```typescript
export async function deleteRecoveryPost(
  postId: string
): Promise<
  | { success: true; postId: string; deletedAt: string }
  | { success: false; error: string; errorCode?: string }
>
```

### restoreRecoveryPost

```typescript
export async function restoreRecoveryPost(
  postId: string
): Promise<
  | { success: true; postId: string; restoredAt: string }
  | { success: false; error: string; errorCode?: string }
>
```

## 📝 使用例

### 投稿詳細ページでの削除ボタン

```tsx
import DeletePostButton from '@/components/DeletePostButton'

export default function PostDetailPage({ params }: { params: { id: string } }) {
  // 投稿データを取得
  const { data: post } = await supabase
    .from('recovery_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  return (
    <div>
      <h1>{post.title}</h1>
      {/* 投稿内容 */}
      
      {/* 削除ボタン（所有者のみ表示） */}
      {post.user_id === currentUser.id && (
        <DeletePostButton
          postId={post.id}
          postTitle={post.title}
        />
      )}
    </div>
  )
}
```

### 削除された投稿の一覧ページ

```tsx
// 管理者用: 削除された投稿を表示
const { data: deletedPosts } = await supabase
  .from('recovery_posts')
  .select('*')
  .not('deleted_at', 'is', null)
  .order('deleted_at', { ascending: false })

return (
  <div>
    {deletedPosts?.map((post) => (
      <div key={post.id}>
        <h2>{post.title}</h2>
        <p>削除日時: {post.deleted_at}</p>
        <RestorePostButton postId={post.id} />
      </div>
    ))}
  </div>
)
```

## ✅ 実装のポイント

### 1. 論理削除の採用

- データを完全に削除しない
- `deleted_at`カラムで管理
- 復元可能

### 2. RLSポリシーの自動適用

- `deleted_at IS NULL`条件が自動的に適用される
- 削除された投稿は検索結果に表示されない

### 3. エラーコードの活用

- P2001エラーコードをそのまま使用
- 既存のエラーハンドリングがそのまま使える

### 4. インデックスの最適化

- 部分インデックスで削除されていない投稿の検索を高速化
- `WHERE deleted_at IS NULL`条件でインデックスサイズを削減

## 🚀 マイグレーション実行

### ステップ1: マイグレーションファイルの実行

1. Supabase Dashboard → **「SQL Editor」** を開く
2. `supabase/migrations/20250126000000_add_soft_delete.sql` の内容をコピー
3. SQL Editorに貼り付けて実行

### ステップ2: 確認

```sql
-- deleted_atカラムが追加されたか確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recovery_posts' 
  AND column_name = 'deleted_at';

-- RPC関数が作成されたか確認
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('delete_recovery_post', 'restore_recovery_post');
```

## 📚 参考

- [トランザクション設計](./TRANSACTION_DESIGN.md)
- [エラーハンドリング](./ERROR_HANDLING.md)
- [投稿編集フロー](./UPDATE_FLOW.md)
