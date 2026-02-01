# RPC関数の改善ポイント

このドキュメントでは、RPC関数の改善ポイントについて説明します。

## 🔧 改善①: 戻り値をTABLE型に変更

### 変更前

```sql
RETURNS UUID
```

### 変更後

```sql
RETURNS TABLE (
  post_id UUID,
  created_at TIMESTAMPTZ
)
```

### メリット

1. **投稿直後のUI反映**: `created_at`を取得できるため、即座にUIに反映可能
2. **楽観的UI**: サーバーから取得した正確なタイムスタンプを使用可能
3. **ログ用途**: 作成日時をログに記録可能

### 使用例

```typescript
const result = await createRecoveryPost(input)
if (result.success) {
  console.log('投稿ID:', result.postId)
  console.log('作成日時:', result.createdAt)
  // UIに即座に反映
  router.push(`/posts/${result.postId}`)
}
```

## 🔧 改善②: エラーコードの設計

### 実装

```sql
RAISE EXCEPTION USING
  message = 'ステップは最低1つ必要です',
  errcode = 'P1001';
```

### エラーコード一覧

| エラーコード | 説明 | 用途 |
|------------|------|------|
| `P1001` | ステップが最低1つ必要 | バリデーションエラー |
| `P1002` | ステップ順序が不正 | バリデーションエラー |
| `P2001` | 投稿が見つからないか、編集権限がない | 権限エラー |

### Server Action側での処理

```typescript
const ERROR_CODES = {
  P1001: 'ステップは最低1つ必要です',
  P1002: 'ステップ順序が不正です',
  P2001: '投稿が見つからないか、編集権限がありません',
} as const

function getErrorMessage(error: any): string {
  const code = error?.code as ErrorCode | undefined
  if (code && code in ERROR_CODES) {
    return ERROR_CODES[code]
  }
  return error?.message || '予期しないエラーが発生しました'
}
```

### メリット

1. **UX向上**: エラーコードに基づいて適切なエラーメッセージを表示
2. **デバッグ容易**: エラーコードで問題を特定しやすい
3. **国際化対応**: エラーコードに基づいて多言語対応が容易

## 🔧 改善③: 更新系RPC関数の追加

### `update_recovery_post` 関数

投稿編集、ステップ追加・削除、タグ再構成をトランザクションで処理します。

### 特徴

- **同じ設計思想**: `create_recovery_post`と同じ構造
- **トランザクション保護**: 失敗時は全ロールバック
- **権限チェック**: 投稿の所有者のみ更新可能
- **TABLE型の戻り値**: `post_id`, `updated_at`を返す

### 使用例

```typescript
const result = await updateRecoveryPost(postId, input)
if (result.success) {
  console.log('更新日時:', result.updatedAt)
  // UIに即座に反映
  router.refresh()
}
```

## 📊 比較表

| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| 戻り値 | `UUID` | `TABLE (post_id, created_at)` |
| エラーハンドリング | メッセージのみ | エラーコード + メッセージ |
| 更新機能 | なし | `update_recovery_post` 追加 |
| UI反映 | 遅延 | 即座に反映可能 |
| デバッグ | 困難 | エラーコードで容易 |

## 🎯 次のステップ

1. **エラーコードの拡張**: 必要に応じてエラーコードを追加
2. **国際化対応**: エラーコードに基づいて多言語対応
3. **ログ機能**: エラーコードをログに記録して分析

## 📝 注意事項

- エラーコードはPostgreSQLのカスタムエラーコード（P0000-P9999）を使用
- エラーコードは一貫性を保つことが重要
- クライアント側でエラーコードに基づいた処理を実装する
