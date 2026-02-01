# 投稿作成フロー（トランザクション設計）

このドキュメントでは、回復投稿作成時のトランザクション設計について説明します。

## 📋 設計思想

### なぜトランザクションが必須か

1投稿の作成は以下の複数テーブルにまたがります：

- `recovery_posts`（親）
- `recovery_steps`（複数）
- `post_regions`（1〜n）
- `post_tags`（0〜n）

**問題**: どれか1つでも失敗すると、孤児データが残り、DBが静かに腐ります。

**解決策**: RPC（Postgres Function）で一括処理し、失敗時は全ロールバック。

## 🏗️ 全体設計

```
フロント（Next.js）
  ├─ バリデーション（Zod）
  ├─ フォーム管理
  └─ RPCを1回叩く

バック（Supabase）
  ├─ Postgres Functionでトランザクション
  ├─ RLSはそのまま効く
  └─ 失敗時は全ロールバック
```

## 📁 ファイル構成

```
lib/
├── types/
│   └── recovery-post.ts          # 型定義
├── validations/
│   └── recovery-post.ts          # Zodバリデーション
├── actions/
│   └── recovery-post.ts          # Server Action
└── supabase/
    ├── types.ts                  # Supabase型定義（RPC関数含む）
    └── server.ts                 # Supabaseクライアント

supabase/
└── migrations/
    └── 20250125000000_initial_schema.sql  # RPC関数定義
```

## ① フロント側の投稿データ構造

```typescript
// lib/types/recovery-post.ts
export interface CreateRecoveryPostInput {
  title: string
  summary: string
  problemCategory: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
  phaseAtPost: 1 | 2 | 3
  startedAt?: string | null
  recoveredAt?: string | null
  currentStatus: string

  steps: {
    order: number
    content: string
    isFailure: boolean
  }[]

  regionIds: number[]
  tagNames: string[] // '#なし'（例: '25歳', '借金300万'）
}
```

**ポイント**: DB構造をそのままUIに漏らさない設計

## ② Supabase RPC（最重要）

### Postgres Function

```sql
CREATE OR REPLACE FUNCTION public.create_recovery_post(
  p_title TEXT,
  p_summary TEXT,
  p_problem_category problem_category_enum,
  p_phase_at_post INTEGER,
  p_started_at DATE,
  p_recovered_at DATE,
  p_current_status TEXT,
  p_steps JSONB,
  p_region_ids INTEGER[],
  p_tag_names TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

### 重要なポイント

1. **暗黙トランザクション**: 途中で失敗すると全部ロールバック
2. **auth.uid()が使える**: RLS安全
3. **フロントからは1回呼ぶだけ**: シンプル

### 処理フロー

1. バリデーション（ステップが最低1つ必要）
2. 親投稿の作成
3. ステップの作成（ループ）
4. 地域の関連付け
5. タグの作成と関連付け（#を除去して保存）

## ③ Next.js Server Action

```typescript
// lib/actions/recovery-post.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createRecoveryPostSchema } from '@/lib/validations/recovery-post'

export async function createRecoveryPost(
  input: CreateRecoveryPostInput
): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  // バリデーション
  const validationResult = createRecoveryPostSchema.safeParse(input)
  
  if (!validationResult.success) {
    return { success: false, error: 'バリデーションエラー' }
  }

  const supabase = await createClient()

  // RPC関数を呼び出し
  const { data, error } = await supabase.rpc('create_recovery_post', {
    p_title: input.title,
    p_summary: input.summary,
    p_problem_category: input.problemCategory,
    // ...
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, postId: data }
}
```

## ④ フロント（Client Component）

```typescript
'use client'

import { createRecoveryPost } from '@/lib/actions/recovery-post'

const handleSubmit = async () => {
  try {
    const result = await createRecoveryPost(formData)
    
    if (!result.success) {
      alert(result.error)
      return
    }

    router.push(`/posts/${result.postId}`)
  } catch (error) {
    alert('投稿作成に失敗しました')
  }
}
```

## ⑤ バリデーション設計（二重防御）

### フロント（Zod）

```typescript
// lib/validations/recovery-post.ts
export const createRecoveryPostSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(5000),
  problemCategory: z.enum(['debt', 'unemployed', ...]),
  phaseAtPost: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  steps: z.array(recoveryStepSchema).min(1), // 最低1つ
  // ...
})
```

### バック（DB制約）

- ENUM / CHECK制約
- NOT NULL
- 外部キー制約

**ポイント**: 二重防御で安全性を確保

## ⑥ よくある地雷（避けるべき）

### ❌ フロントから複数insert

```typescript
// 悪い例
await supabase.from('recovery_posts').insert(...)
await supabase.from('recovery_steps').insert(...) // ここで失敗すると孤児データ
```

### ❌ トランザクションなし

```typescript
// 悪い例
// 途中で失敗してもロールバックされない
```

### ❌ recovery_postsだけ先に作る

```typescript
// 悪い例
const post = await createPost(...)
await createSteps(post.id, ...) // ここで失敗すると孤児投稿
```

### ❌ エラー握りつぶし

```typescript
// 悪い例
try {
  await createPost(...)
} catch {
  // エラーを無視 → 後で必ず後悔する
}
```

## ✅ 正しい実装

1. **RPC関数で一括処理**
2. **トランザクションで保護**
3. **エラーハンドリングを適切に**
4. **バリデーションを二重に**

## 📝 使用例

詳細な使用例は `components/CreatePostForm.example.tsx` を参照してください。

## 🔍 デバッグ

### RPC関数のテスト

```sql
-- SQL Editorで直接テスト
SELECT create_recovery_post(
  'テスト投稿',
  'これはテストです',
  'debt',
  2,
  '2021-01-01'::date,
  '2024-01-01'::date,
  '完済しました',
  '[{"order": 1, "content": "実家に戻る", "isFailure": false}]'::jsonb,
  ARRAY[13], -- 東京都
  ARRAY['25歳', '借金300万']
);
```

## 🚀 次のステップ

1. Zodをインストール: `npm install zod`
2. マイグレーションを実行してRPC関数を作成
3. フォームコンポーネントを実装
4. エラーハンドリングを追加
