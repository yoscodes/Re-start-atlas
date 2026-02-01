# エラーコードに基づいたUI処理

このドキュメントでは、エラーコードに基づいたUI処理の実装について説明します。

## 📋 概要

エラーコードを使用することで、以下のメリットがあります：

1. **UX向上**: エラーコードに基づいて適切なエラーメッセージを表示
2. **デバッグ容易**: エラーコードで問題を特定しやすい
3. **国際化対応**: エラーコードに基づいて多言語対応が容易
4. **フィールドハイライト**: エラーが発生したフィールドを視覚的に強調

## 🏗️ アーキテクチャ

```
RPC関数 (PostgreSQL)
  ↓ RAISE EXCEPTION USING errcode
Server Action
  ↓ errorCode を含むエラーを返す
UIコンポーネント
  ↓ エラーコードに基づいた処理
ErrorDisplay コンポーネント
  ↓ 適切なスタイルとメッセージを表示
```

## 📁 ファイル構成

```
lib/
└── errors/
    └── recovery-post.ts      # エラーコード定義とユーティリティ

components/
├── ErrorDisplay.tsx          # エラー表示コンポーネント
├── CreatePostForm.tsx        # 投稿作成フォーム（エラー対応）
└── UpdatePostForm.tsx        # 投稿更新フォーム（エラー対応）
```

## 🔧 エラーコード定義

### エラーコード一覧

| エラーコード | 説明 | ユーザー向けメッセージ | 重大度 | フィールド |
|------------|------|---------------------|--------|----------|
| `P1001` | ステップが最低1つ必要 | 回復ステップを最低1つ入力してください | error | steps |
| `P1002` | ステップ順序が不正 | ステップの順序が正しくありません | error | steps |
| `P2001` | 投稿が見つからないか、編集権限がない | この投稿を編集する権限がありません | error | null |

### エラーコードの命名規則

- **P1000番台**: バリデーションエラー
- **P2000番台**: 権限エラー
- **P3000番台**: データベースエラー（将来拡張用）
- **P4000番台**: 外部サービスエラー（将来拡張用）

## 🎨 UIコンポーネント

### ErrorDisplay コンポーネント

エラーコードに基づいて適切なスタイルとメッセージを表示します。

**特徴:**
- エラーコードに基づいた色分け（error/warning/info）
- アイコンの表示
- フィールドへの案内
- 閉じるボタン

**使用例:**

```tsx
<ErrorDisplay
  error={error}
  onDismiss={() => setError(null)}
/>
```

### CreatePostForm コンポーネント

投稿作成フォームでエラーコードに基づいた処理を実装。

**実装内容:**
- エラーコードに基づいたフィールドハイライト
- バリデーションエラーの場合、該当フィールドにスクロール
- エラーが発生したフィールドの視覚的強調

### UpdatePostForm コンポーネント

投稿更新フォームで権限エラーなどの適切な処理を実装。

**実装内容:**
- 権限エラーの場合、フォームを無効化
- 権限エラーの場合、投稿一覧にリダイレクト
- エラーコードに基づいたフィールドハイライト

## 🔍 エラーハンドリングの流れ

### 1. RPC関数でのエラー発生

```sql
RAISE EXCEPTION USING
  message = 'ステップは最低1つ必要です',
  errcode = 'P1001';
```

### 2. Server Actionでのエラー処理

```typescript
const { data, error } = await supabase.rpc('create_recovery_post', {...})

if (error) {
  return {
    success: false,
    error: getErrorMessage(error),
    errorCode: error.code, // P1001
  }
}
```

### 3. UIコンポーネントでの処理

```typescript
const result = await createRecoveryPost(input)

if (!result.success) {
  setError({
    code: result.errorCode, // P1001
    message: result.error,
  })

  // バリデーションエラーの場合、該当フィールドにスクロール
  if (isValidationError(result.errorCode)) {
    const errorField = getErrorField(result.errorCode)
    if (errorField === 'steps') {
      document.getElementById('steps-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }
}
```

### 4. ErrorDisplayでの表示

```tsx
<ErrorDisplay error={error} />
```

エラーコードに基づいて：
- 適切な色（赤/黄/青）
- 適切なアイコン
- ユーザー向けメッセージ
- フィールドへの案内

## 🎯 使用例

### 基本的な使用

```tsx
import ErrorDisplay from '@/components/ErrorDisplay'
import { createRecoveryPost } from '@/lib/actions/recovery-post'

function MyForm() {
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    const result = await createRecoveryPost(formData)
    
    if (!result.success) {
      setError({
        code: result.errorCode,
        message: result.error,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorDisplay error={error} />}
      {/* フォーム内容 */}
    </form>
  )
}
```

### フィールドハイライト

```tsx
import { getErrorField } from '@/lib/errors/recovery-post'

const errorField = getErrorField(error?.code)

<input
  className={errorField === 'title' ? 'border-red-500' : ''}
/>
```

### 権限エラーの特別処理

```tsx
import { isPermissionError } from '@/lib/errors/recovery-post'

if (isPermissionError(error?.code)) {
  // 権限エラーの特別処理
  router.push('/posts')
}
```

## 📝 ベストプラクティス

1. **エラーコードの一貫性**: エラーコードの命名規則を守る
2. **ユーザー向けメッセージ**: 技術的なエラーメッセージではなく、ユーザーが理解しやすいメッセージを表示
3. **フィールドハイライト**: エラーが発生したフィールドを視覚的に強調
4. **スクロール**: バリデーションエラーの場合、該当フィールドに自動スクロール
5. **権限エラー**: 権限エラーの場合、適切なページにリダイレクト

## 🚀 今後の拡張

- エラーコードの追加（P3000番台、P4000番台）
- 多言語対応
- エラーログの記録
- エラー分析ダッシュボード
