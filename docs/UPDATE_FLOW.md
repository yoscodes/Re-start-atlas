# 投稿編集フロー（Updateトランザクション）

このドキュメントでは、投稿編集フローの実装について説明します。

## 📋 設計思想

### CreateとUpdateの統一

- **同じフォーム構造**: CreateとUpdateで同じフォームコンポーネントを使用
- **同じエラー処理**: エラーコード設計がそのまま活用可能
- **差分禁止、全置換**: Updateは差分ではなく、全データを置き換える

### トランザクション設計

- **RPC関数で一括処理**: `update_recovery_post`で全テーブルを更新
- **失敗時は全ロールバック**: 途中で失敗すると全てロールバック
- **権限チェック**: P2001エラーコードで権限エラーを発火

## 🏗️ アーキテクチャ

```
UpdatePostForm (ラッパー)
  ↓
RecoveryPostForm (共通コンポーネント)
  ↓
updateRecoveryPost (Server Action)
  ↓
update_recovery_post (RPC関数)
  ↓
トランザクション処理
```

## 📁 ファイル構成

```
components/
├── RecoveryPostForm.tsx    # 共通フォームコンポーネント
├── CreatePostForm.tsx       # Create専用ラッパー
└── UpdatePostForm.tsx       # Update専用ラッパー

lib/
└── actions/
    └── recovery-post.ts     # updateRecoveryPost Server Action

supabase/
└── migrations/
    └── 20250125000000_initial_schema.sql  # update_recovery_post RPC関数
```

## 🔧 RPC関数: update_recovery_post

### 特徴

1. **createと同じinput構造**: パラメータ構造がcreateと同一
2. **差分禁止、全置換**: 既存データを削除してから新規作成
3. **権限チェック**: P2001エラーコードで権限エラーを発火
4. **エラーコード流用**: P1001, P1002をそのまま使用

### 処理フロー

1. 権限チェック（P2001エラー）
2. バリデーション（P1001, P1002エラー）
3. 投稿の更新
4. 既存ステップの削除 → 新規作成
5. 既存地域関連の削除 → 新規作成
6. 既存タグ関連の削除 → 新規作成
7. 戻り値（post_id, updated_at）

### エラーコード

| エラーコード | 説明 | 発生タイミング |
|------------|------|--------------|
| `P2001` | 投稿が見つからないか、編集権限がない | 権限チェック時 |
| `P1001` | ステップが最低1つ必要 | バリデーション時 |
| `P1002` | ステップ順序が不正 | バリデーション時 |

## 🎨 UIコンポーネント

### RecoveryPostForm（共通コンポーネント）

CreateとUpdateで同じフォーム構造を保証。

**特徴:**
- `mode`プロップでCreate/Updateを切り替え
- エラー処理ロジックを共通化
- フィールドハイライトを共通化
- バリデーションエラー時の自動スクロール

### CreatePostForm（ラッパー）

```tsx
<RecoveryPostForm
  mode="create"
  onSubmit={async (data) => {
    return await createRecoveryPost(data)
  }}
/>
```

### UpdatePostForm（ラッパー）

```tsx
<RecoveryPostForm
  mode="update"
  postId={postId}
  initialData={initialData}
  onSubmit={async (data, id) => {
    return await updateRecoveryPost(id, data)
  }}
/>
```

## 🔍 エラーハンドリング

### 権限エラー（P2001）

Update専用の処理：

```typescript
if (mode === 'update' && isPermissionError(result.errorCode)) {
  // 3秒後に投稿一覧にリダイレクト
  setTimeout(() => {
    router.push('/posts')
  }, 3000)
}
```

### バリデーションエラー（P1001, P1002）

CreateとUpdateで同じ処理：

```typescript
if (isValidationError(result.errorCode)) {
  const errorField = getErrorField(result.errorCode)
  if (errorField) {
    document.getElementById(`${errorField}-section`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }
}
```

## 📝 使用例

### 投稿編集ページ

```tsx
import UpdatePostForm from '@/components/UpdatePostForm'
import { createClient } from '@/lib/supabase/server'

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  // 投稿データを取得
  const { data: post } = await supabase
    .from('recovery_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  // ステップデータを取得
  const { data: steps } = await supabase
    .from('recovery_steps')
    .select('*')
    .eq('post_id', params.id)
    .order('step_order')

  // フォーム用のデータに変換
  const initialData: CreateRecoveryPostInput = {
    title: post.title,
    summary: post.summary,
    problemCategory: post.problem_category,
    phaseAtPost: post.phase_at_post,
    startedAt: post.started_at,
    recoveredAt: post.recovered_at,
    currentStatus: post.current_status,
    steps: steps.map((s) => ({
      order: s.step_order,
      content: s.content,
      isFailure: s.is_failure,
    })),
    regionIds: [], // 地域IDを取得
    tagNames: [], // タグ名を取得
  }

  return (
    <div>
      <h1>投稿を編集</h1>
      <UpdatePostForm postId={params.id} initialData={initialData} />
    </div>
  )
}
```

## ✅ 実装のポイント

### 1. CreateとUpdateの統一

- 同じフォーム構造
- 同じエラー処理
- 同じバリデーション

### 2. 差分禁止、全置換

- 既存データを削除してから新規作成
- トランザクションで保護
- 失敗時は全ロールバック

### 3. エラーコードの活用

- P2001: 権限エラー（Update専用）
- P1001, P1002: バリデーションエラー（Create/Update共通）

## 🚀 今後の拡張

### 1. 投稿削除（論理削除 / アーカイブ）

```sql
-- deleted_atカラムを追加
ALTER TABLE recovery_posts ADD COLUMN deleted_at TIMESTAMPTZ;

-- 削除RPC関数
CREATE FUNCTION delete_recovery_post(p_post_id UUID)
RETURNS UUID
-- ...
```

### 2. 編集履歴（audit log / versioning）

```sql
-- 編集履歴テーブル
CREATE TABLE recovery_post_versions (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES recovery_posts(id),
  version INTEGER,
  -- スナップショットデータ
  -- ...
);
```

### 3. 同時編集対策（updated_at / 楽観ロック）

```typescript
// 楽観ロック用のupdated_atチェック
const { data, error } = await supabase.rpc('update_recovery_post', {
  p_post_id: postId,
  p_expected_updated_at: currentUpdatedAt, // 楽観ロック用
  // ...
})
```

## 📚 参考

- [トランザクション設計](./TRANSACTION_DESIGN.md)
- [エラーハンドリング](./ERROR_HANDLING.md)
