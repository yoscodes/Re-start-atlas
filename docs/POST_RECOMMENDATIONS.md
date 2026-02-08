# 似た状況の投稿レコメンド機能

## 概要

詳細ページの体験を"終わらせない"ための最重要機能。数字ベースで類似度を計算し、似た状況の投稿をレコメンドします。

## 実装内容

### 1. RPC関数: `get_similar_recovery_posts`

**ファイル**: `supabase/migrations/20250201000003_add_similar_posts_rpc.sql`

**機能**:
- 現在の投稿IDを受け取り、類似度スコアでソートして上位3件を返す
- 自分自身の投稿は除外
- 最低でも`phase_at_post`または`problem_category`が一致するもののみ

**類似度スコア計算**:
- `phase_at_post`が同じ: +3点
- `problem_category`が同じ: +2点
- `region`が1つでも一致: +2点
- `age_at_that_time`が近い（差5歳以内）: +1点
- `debt_amount`が近い（差50万円以内）: +1点
- `unemployed_months`が近い（差3ヶ月以内）: +1点
- `recovery_months`が近い（差3ヶ月以内）: +1点

**表示用数字の優先順位**:
1. 借金カテゴリ: 借金額を優先
2. 失業カテゴリ: 無職期間を優先
3. 年齢があれば年齢を表示
4. 回復期間があれば回復期間を表示

### 2. Server Action: `getSimilarPosts`

**ファイル**: `lib/actions/post-detail.ts`

**機能**:
- RPC関数を呼び出し、結果を`SimilarPost[]`型に変換
- エラーハンドリングを実装

### 3. 型定義: `SimilarPost`

**ファイル**: `lib/types/post-recommendation.ts`

```typescript
export interface SimilarPost {
  id: string
  title: string
  phase_at_post: number
  problem_category: problem_category_enum
  display_number: string | null
  display_label: string | null
}
```

### 4. コンポーネント: `PostRecommendations`

**ファイル**: `components/PostRecommendations.tsx`

**UIルール**:
- 3件まで表示
- タイトル + フェーズバッジ + 数字1つ
- CTAなし / 自動再生なし
- クリックで詳細ページへ遷移

**表示内容**:
- フェーズバッジ（アイコン + ラベル）
- タイトル（2行まで）
- 数字情報（ラベル + 数値）

### 5. 詳細ページへの統合

**ファイル**: `app/posts/[id]/page.tsx`

**配置**:
- [G] 過去の自分への後に配置
- 詳細ページの最後に表示

## 使用例

```typescript
// Server Actionで取得
const similarPostsResult = await getSimilarPosts(postId, 3)
const similarPosts = similarPostsResult.success ? similarPostsResult.posts : []

// コンポーネントに渡す（currentPostIdは不要。RPCで既に除外済み）
<PostRecommendations posts={similarPosts} />
```

## 今後の拡張案

### v2: より高度な類似度計算
- タグの一致度を追加
- 時系列の近さ（`started_at`の近さ）を考慮
- 機械学習ベースのレコメンド

### v3: パーソナライズ
- ユーザーの閲覧履歴を考慮
- ユーザーのフェーズレベルに応じたレコメンド
- A/Bテスト対応

## 注意事項

- **パフォーマンス**: 類似度計算はDB側で実行されるため、投稿数が増えるとパフォーマンスに影響する可能性がある
- **インデックス**: `phase_at_post`、`problem_category`、`deleted_at`にインデックスが必要
- **空状態**: 似た投稿が見つからない場合は、コンポーネントは何も表示しない（`null`を返す）
