# Supabase データベース設計

## 概要

Restart Atlasのデータベーススキーマ（MVP → 拡張可能）

### 設計思想（最重要）

1. **投稿が主役（人ではない）**
2. **状態（フェーズ）を正規化**
3. **匿名前提**
4. **後から課金・信用スコアを足せる**

## ER図（概念）

```
users (匿名)
 └─ recovery_posts
      ├─ post_tags
      ├─ post_regions
      ├─ recovery_steps
      ├─ comments
      └─ reactions
```

## テーブル一覧

### 必須テーブル（MVP）

| テーブル | 説明 | 必須度 |
|---------|------|--------|
| `users` | 匿名ユーザー | ○ |
| `recovery_posts` | 回復投稿（核） | ◎ |
| `recovery_steps` | 回復プロセス | ◎ |
| `regions` | 地域マスタ | ○ |
| `post_regions` | 投稿と地域の関連 | ○ |

### オプションテーブル

| テーブル | 説明 | 必須度 |
|---------|------|--------|
| `tags` | タグマスタ | △ |
| `post_tags` | 投稿とタグの関連 | △ |
| `comments` | コメント | △ |
| `reactions` | リアクション | △ |

## マイグレーションの実行方法

### Supabase CLIを使用する場合

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# Supabaseプロジェクトにリンク
supabase link --project-ref your-project-ref

# マイグレーションを実行
supabase db push
```

### Supabase Dashboardを使用する場合

1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. SQL Editorを開く
4. `supabase/migrations/20250125000000_initial_schema.sql`の内容をコピー＆ペースト
5. 実行ボタンをクリック

## テーブル詳細

### ① users（匿名ユーザー）

- **設計方針**: プロフィールは極限まで薄く
- **特徴**:
  - 本名・年齢・性別なし
  - `phase_level`は自己申告＋後で変更可
  - Lv3ユーザーを将来メンター化可能

### ② recovery_posts（核）

- **設計方針**: 検索性最優先
- **特徴**:
  - 問題は「1投稿1テーマ」
  - 数字・時系列が後で活きる
  - 全文検索対応（将来拡張）

### ③ recovery_steps（回復プロセス）

- **設計方針**: 「やったこと」を分離 → データ価値が爆上がり
- **特徴**:
  - 「失敗した行動」が検索可能
  - 将来「やるなランキング」が作れる

### ④ regions（全国網羅の要）

- **設計方針**: SEO最強要素
- **特徴**:
  - 最初は「都道府県のみ」でもOK
  - 初期データとして47都道府県を投入済み

### ⑤ tags（横断検索）

- **例**: `#25歳`, `#借金300万`, `#実家暮らし`, `#IT転職`

### ⑥ comments（共感装置）

- **特徴**: Lv3ユーザーのコメントは将来強調表示可能

### ⑦ reactions（応援・信用）

- **設計方針**: いいね禁止。感情を限定するのが重要
- **タイプ**: `empathy`（共感）, `respect`（尊敬）

## RLS（Row Level Security）ポリシー

### recovery_posts

- `SELECT`: 全員OK
- `INSERT`: 本人のみ
- `UPDATE/DELETE`: 本人のみ

### comments

- `INSERT`: ログインユーザー
- `DELETE`: 本人のみ

### reactions

- `INSERT`: ログインユーザー
- `DELETE`: 本人のみ

**匿名性を守りつつ荒れにくい設計**

## 将来拡張用（今は作らない）

以下のテーブルは将来の拡張用として設計に含めていますが、**今は絶対作らない**:

- `subscriptions`（課金）
- `mentor_profiles`（メンタープロフィール）
- `private_rooms`（プライベートルーム）

**先に"投稿が溜まる構造"を作ることが重要**

## 型定義

TypeScriptの型定義は `lib/supabase/types.ts` にあります。

```typescript
import type { RecoveryPost, User, ProblemCategory } from '@/lib/supabase/types'
```

## 注意事項

- マイグレーションファイルは実行順序が重要です（タイムスタンプ順）
- RLSポリシーは本番環境でも有効です
- 初期データ（regions）は自動投入されます
