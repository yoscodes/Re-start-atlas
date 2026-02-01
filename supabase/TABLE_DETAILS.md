# Supabase テーブル詳細仕様書

このドキュメントでは、Restart Atlasで作成された全テーブルの詳細な仕様を説明します。

---

## 📊 テーブル一覧

| テーブル名 | 必須度 | 説明 | レコード数（初期） |
|-----------|--------|------|-------------------|
| `users` | ○ | 匿名ユーザー | 0 |
| `recovery_posts` | ◎ | 回復投稿（核） | 0 |
| `recovery_steps` | ◎ | 回復プロセス | 0 |
| `regions` | ○ | 地域マスタ | 47（都道府県） |
| `post_regions` | ○ | 投稿と地域の関連 | 0 |
| `tags` | △ | タグマスタ | 0 |
| `post_tags` | △ | 投稿とタグの関連 | 0 |
| `comments` | △ | コメント | 0 |
| `reactions` | △ | リアクション | 0 |

---

## ① users（匿名ユーザー）

### 概要
Supabase Authと連携した匿名ユーザープロフィール。プロフィール情報は極限まで薄く設計されています。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY, FK → auth.users(id) | - | ユーザーID（auth.usersと同一） |
| `display_name` | TEXT | NULL可 | NULL | 表示名（NULL可）。未設定の場合はUI側で「匿名ユーザーXXXX」と表示 |
| `phase_level` | INTEGER | NOT NULL, CHECK (1-3) | 1 | フェーズレベル（1〜3） |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_users_phase_level` - phase_levelでの検索用
- `idx_users_created_at` - 作成日時でのソート用

### 制約

- **CHECK制約**: `phase_level >= 1 AND phase_level <= 3`
- **外部キー**: `auth.users(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `users_select_all` | 全員OK |
| UPDATE | `users_update_own` | 本人のみ |

### 設計思想

- **匿名性**: 本名・年齢・性別などの個人情報は一切不要
- **自己申告**: phase_levelは自己申告で、後から変更可能
- **将来拡張**: Lv3ユーザーを将来メンター化可能

### 使用例

```sql
-- ユーザープロフィールの作成（認証後に自動実行推奨）
-- display_nameはNULL可なので、設定しなくてもOK
INSERT INTO users (id, phase_level)
VALUES (auth.uid(), 2);

-- display_nameを設定する場合
INSERT INTO users (id, display_name, phase_level)
VALUES (auth.uid(), '匿名ユーザー', 2);

-- フェーズレベルの更新
UPDATE users 
SET phase_level = 3 
WHERE id = auth.uid();
```

---

## ② recovery_posts（核となるテーブル）

### 概要
回復投稿の核となるテーブル。検索性を最優先に設計されています。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | 投稿ID |
| `user_id` | UUID | NOT NULL, FK → users(id) | - | 投稿者ID |
| `title` | TEXT | NOT NULL | - | タイトル |
| `summary` | TEXT | NOT NULL | - | 概要 |
| `problem_category` | problem_category_enum | NOT NULL | - | 問題カテゴリ（ENUM型） |
| `phase_at_post` | INTEGER | NOT NULL, CHECK (1-3) | - | 投稿時の状態 |
| `started_at` | DATE | - | NULL | 詰み始めた時期 |
| `recovered_at` | DATE | - | NULL | 回復した時期 |
| `current_status` | TEXT | NOT NULL | - | 現在の状況 |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | 更新日時 |

### インデックス

- `idx_recovery_posts_user_id` - ユーザー別の投稿検索
- `idx_recovery_posts_problem_category` - カテゴリ別検索
- `idx_recovery_posts_phase_at_post` - フェーズ別検索
- `idx_recovery_posts_started_at` - 開始時期での検索
- `idx_recovery_posts_recovered_at` - 回復時期での検索
- `idx_recovery_posts_created_at` - 作成日時でのソート（降順）
- **`idx_posts_category_phase_created`** - **複合インデックス（重要）**: `(problem_category, phase_at_post, created_at DESC)` - 一覧ページの8割のクエリがこれに対応、SEOページで特に効く

### 制約

- **CHECK制約**: 
  - `problem_category IN ('debt', 'unemployed', 'dropout', 'addiction', 'relationship')`
  - `phase_at_post >= 1 AND phase_at_post <= 3`
- **外部キー**: `users(id)` への参照（CASCADE削除）

### トリガー

- **`update_recovery_posts_updated_at`**: UPDATE時に`updated_at`を自動更新

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `recovery_posts_select_all` | 全員OK |
| INSERT | `recovery_posts_insert_own` | 本人のみ |
| UPDATE | `recovery_posts_update_own` | 本人のみ |
| DELETE | `recovery_posts_delete_own` | 本人のみ |

### 問題カテゴリ

| 値 | 説明 |
|----|------|
| `debt` | 借金 |
| `unemployed` | 失業 |
| `dropout` | 中退 |
| `addiction` | 依存症 |
| `relationship` | 人間関係 |

### 設計思想

- **検索性最優先**: カテゴリ、フェーズ、時期での検索が高速
- **1投稿1テーマ**: 問題カテゴリは1つに限定
- **時系列データ**: started_at/recovered_atで将来の分析が可能

### 使用例

```sql
-- 投稿の作成
INSERT INTO recovery_posts (
  user_id, title, summary, problem_category,
  phase_at_post, started_at, recovered_at, current_status
) VALUES (
  auth.uid(),
  '借金300万円からの回復',
  '25歳の時に借金を抱え、実家に戻って返済を開始...',
  'debt',
  2,
  '2021-01-01',
  '2024-01-01',
  '完済しました。現在は貯金に回しています。'
);

-- カテゴリ別の投稿検索
SELECT * FROM recovery_posts 
WHERE problem_category = 'debt' 
ORDER BY created_at DESC;
```

---

## ③ recovery_steps（回復プロセス）

### 概要
回復プロセスで「やったこと」を分離したテーブル。失敗した行動も記録できるため、データ価値が高い。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | ステップID |
| `post_id` | UUID | NOT NULL, FK → recovery_posts(id) | - | 投稿ID |
| `step_order` | INTEGER | NOT NULL, CHECK (>= 1) | - | ステップ順序（1始まり） |
| `content` | TEXT | NOT NULL | - | ステップ内容 |
| `is_failure` | BOOLEAN | NOT NULL | FALSE | 失敗行動か？ |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_recovery_steps_post_id` - 投稿別のステップ検索
- `idx_recovery_steps_is_failure` - 失敗行動の検索
- `idx_recovery_steps_post_order` - 投稿内での順序検索
- `idx_recovery_steps_post_order_unique` - ユニーク制約（投稿内で順序が重複しない）

### 制約

- **CHECK制約**: `step_order >= 1` - 1始まりを保証（マイナス値・0を排除）
- **ユニーク制約**: `(post_id, step_order)` - 1投稿内で順序が重複しない
- **外部キー**: `recovery_posts(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `recovery_steps_select_all` | 全員OK |
| INSERT | `recovery_steps_insert_own_post` | 投稿の所有者のみ |
| UPDATE | `recovery_steps_update_own_post` | 投稿の所有者のみ |
| DELETE | `recovery_steps_delete_own_post` | 投稿の所有者のみ |

### 設計思想

- **データ価値**: 「やったこと」を分離することで、横断的な分析が可能
- **失敗の記録**: `is_failure`で失敗行動を記録し、「やるなランキング」が作れる
- **順序管理**: `step_order`で時系列を管理

### 使用例

```sql
-- 回復ステップの追加
INSERT INTO recovery_steps (post_id, step_order, content, is_failure)
VALUES
  ('post-uuid-here', 1, '実家に戻って生活費を削減', false),
  ('post-uuid-here', 2, 'アルバイトを2つ掛け持ち', false),
  ('post-uuid-here', 3, 'クレジットカードを解約（失敗: すぐに再発行）', true);

-- 失敗行動の検索（将来の「やるなランキング」用）
SELECT content, COUNT(*) as failure_count
FROM recovery_steps
WHERE is_failure = true
GROUP BY content
ORDER BY failure_count DESC;
```

---

## ④ regions（地域マスタ）

### 概要
全国の地域を管理するマスタテーブル。SEO最強要素として設計されています。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | SERIAL | PRIMARY KEY | - | 地域ID（自動採番） |
| `prefecture` | TEXT | NOT NULL | - | 都道府県名 |
| `city` | TEXT | - | NULL | 市区町村名 |
| - | - | UNIQUE(prefecture, city) | - | 都道府県・市区町村の組み合わせの重複防止 |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_regions_prefecture` - 都道府県での検索
- `idx_regions_city` - 市区町村での検索

### 初期データ

47都道府県が自動投入されます。

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `regions_select_all` | 全員OK |

**注意**: INSERT/UPDATE/DELETEは管理者のみ（RLSポリシー未設定のため、デフォルトで拒否）

### 設計思想

- **SEO最強要素**: 地域での検索が可能
- **段階的拡張**: 最初は都道府県のみ、後で市区町村を追加可能

### 使用例

```sql
-- 都道府県一覧の取得
SELECT * FROM regions WHERE city IS NULL ORDER BY id;

-- 特定の都道府県の取得
SELECT * FROM regions WHERE prefecture = '東京都';
```

---

## ⑤ post_regions（投稿と地域の関連）

### 概要
投稿と地域を多対多で関連付ける中間テーブル。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `post_id` | UUID | PRIMARY KEY, FK → recovery_posts(id) | - | 投稿ID |
| `region_id` | INTEGER | PRIMARY KEY, FK → regions(id) | - | 地域ID |

### インデックス

- `idx_post_regions_post_id` - 投稿別の地域検索
- `idx_post_regions_region_id` - 地域別の投稿検索

### 制約

- **複合主キー**: `(post_id, region_id)`
- **外部キー**: 
  - `recovery_posts(id)` への参照（CASCADE削除）
  - `regions(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `post_regions_select_all` | 全員OK |
| INSERT | `post_regions_insert_own_post` | 投稿の所有者のみ |
| DELETE | `post_regions_delete_own_post` | 投稿の所有者のみ |

### 使用例

```sql
-- 投稿に地域を関連付け
INSERT INTO post_regions (post_id, region_id)
VALUES ('post-uuid', 13); -- 13 = 東京都

-- 地域別の投稿検索
SELECT rp.* FROM recovery_posts rp
JOIN post_regions pr ON rp.id = pr.post_id
WHERE pr.region_id = 13; -- 東京都
```

---

## ⑥ tags（タグマスタ）

### 概要
横断検索のためのタグマスタ。例: `#25歳`, `#借金300万`, `#実家暮らし`, `#IT転職`

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | タグID |
| `name` | TEXT | NOT NULL, UNIQUE | - | タグ名 |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_tags_name` - タグ名での検索

### 制約

- **ユニーク制約**: `name` - タグ名の重複を防止

### 重要な注意事項

**#はDBに保存しない**: タグ名は`#`なしで保存し、表示時に`#`を付与します。

- ✅ DB: `25歳`, `借金300万`, `実家暮らし`
- ✅ 表示: `#25歳`, `#借金300万`, `#実家暮らし`

**理由**:
- 正規化が容易
- 検索・全文検索が圧倒的に楽
- データの一貫性が保たれる

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `tags_select_all` | 全員OK |

**注意**: INSERT/UPDATE/DELETEは管理者のみ（RLSポリシー未設定のため、デフォルトで拒否）

### 使用例

```sql
-- タグの作成（#なしで保存）
INSERT INTO tags (name) VALUES ('25歳')
ON CONFLICT (name) DO NOTHING;

-- タグ一覧の取得（表示時に#を付与）
SELECT 
  id,
  '#' || name as display_name,  -- 表示用に#を付与
  name,  -- 検索用
  created_at
FROM tags 
ORDER BY name;
```

---

## ⑦ post_tags（投稿とタグの関連）

### 概要
投稿とタグを多対多で関連付ける中間テーブル。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `post_id` | UUID | PRIMARY KEY, FK → recovery_posts(id) | - | 投稿ID |
| `tag_id` | UUID | PRIMARY KEY, FK → tags(id) | - | タグID |

### インデックス

- `idx_post_tags_post_id` - 投稿別のタグ検索
- `idx_post_tags_tag_id` - タグ別の投稿検索

### 制約

- **複合主キー**: `(post_id, tag_id)`
- **外部キー**: 
  - `recovery_posts(id)` への参照（CASCADE削除）
  - `tags(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `post_tags_select_all` | 全員OK |
| INSERT | `post_tags_insert_own_post` | 投稿の所有者のみ |
| DELETE | `post_tags_delete_own_post` | 投稿の所有者のみ |

### 使用例

```sql
-- 投稿にタグを関連付け
INSERT INTO post_tags (post_id, tag_id)
SELECT 'post-uuid', id FROM tags WHERE name IN ('#25歳', '#借金300万');

-- タグ別の投稿検索
SELECT rp.* FROM recovery_posts rp
JOIN post_tags pt ON rp.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = '#25歳';
```

---

## ⑧ comments（共感装置）

### 概要
投稿へのコメント機能。Lv3ユーザーのコメントは将来強調表示可能。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | コメントID |
| `post_id` | UUID | NOT NULL, FK → recovery_posts(id) | - | 投稿ID |
| `user_id` | UUID | NOT NULL, FK → users(id) | - | コメント者ID |
| `content` | TEXT | NOT NULL | - | コメント内容 |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_comments_post_id` - 投稿別のコメント検索
- `idx_comments_user_id` - ユーザー別のコメント検索
- `idx_comments_created_at` - 作成日時でのソート（降順）

### 制約

- **外部キー**: 
  - `recovery_posts(id)` への参照（CASCADE削除）
  - `users(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `comments_select_all` | 全員OK |
| INSERT | `comments_insert_authenticated` | ログインユーザーのみ |
| DELETE | `comments_delete_own` | 本人のみ |

**注意**: UPDATEは許可されていません（コメントは編集不可）

### 設計思想

- **共感装置**: ユーザー同士の共感を促進
- **将来拡張**: Lv3ユーザーのコメントを強調表示可能

### 使用例

```sql
-- コメントの作成
INSERT INTO comments (post_id, user_id, content)
VALUES ('post-uuid', auth.uid(), '共感します。私も同じ経験があります。');

-- 投稿のコメント一覧取得
SELECT c.*, u.display_name, u.phase_level
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.post_id = 'post-uuid'
ORDER BY c.created_at DESC;
```

---

## ⑨ reactions（応援・信用）

### 概要
投稿へのリアクション機能。いいねは禁止で、感情を限定しています。

### テーブル構造

| カラム名 | データ型 | 制約 | デフォルト値 | 説明 |
|---------|---------|------|-------------|------|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | リアクションID |
| `post_id` | UUID | NOT NULL, FK → recovery_posts(id) | - | 投稿ID |
| `user_id` | UUID | NOT NULL, FK → users(id) | - | リアクション者ID |
| `type` | TEXT | NOT NULL, CHECK | - | リアクションタイプ |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

### インデックス

- `idx_reactions_post_id` - 投稿別のリアクション検索
- `idx_reactions_user_id` - ユーザー別のリアクション検索
- `idx_reactions_type` - タイプ別の検索

### 制約

- **CHECK制約**: `type IN ('empathy', 'respect')`
- **ユニーク制約**: `(post_id, user_id, type)` - 同じユーザーが同じ投稿に同じタイプのリアクションを複数回できない
- **外部キー**: 
  - `recovery_posts(id)` への参照（CASCADE削除）
  - `users(id)` への参照（CASCADE削除）

### RLSポリシー

| 操作 | ポリシー名 | 権限 |
|------|-----------|------|
| SELECT | `reactions_select_all` | 全員OK |
| INSERT | `reactions_insert_authenticated` | ログインユーザーのみ |
| DELETE | `reactions_delete_own` | 本人のみ |

**注意**: UPDATEは許可されていません（リアクションは変更不可、削除して再作成）

### リアクションタイプ

| 値 | 説明 |
|----|------|
| `empathy` | 共感 |
| `respect` | 尊敬 |

### 設計思想

- **いいね禁止**: 単純な「いいね」ではなく、感情を限定
- **重複防止**: 同じユーザーが同じ投稿に同じタイプのリアクションを複数回できない

### 使用例

```sql
-- リアクションの作成
INSERT INTO reactions (post_id, user_id, type)
VALUES ('post-uuid', auth.uid(), 'empathy')
ON CONFLICT (post_id, user_id, type) DO NOTHING;

-- 投稿のリアクション集計
SELECT 
  type,
  COUNT(*) as count
FROM reactions
WHERE post_id = 'post-uuid'
GROUP BY type;

-- リアクションの削除（取り消し）
DELETE FROM reactions
WHERE post_id = 'post-uuid' 
  AND user_id = auth.uid() 
  AND type = 'empathy';
```

---

## 🔐 RLS（Row Level Security）まとめ

### 全テーブル共通

- **SELECT**: 全テーブルで全員OK（匿名でも閲覧可能）
- **匿名性重視**: 投稿は誰でも閲覧できるが、作成・更新・削除は本人のみ

### テーブル別の権限

| テーブル | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|
| `users` | 認証時に自動 | 本人のみ | 認証削除時に自動 |
| `recovery_posts` | 本人のみ | 本人のみ | 本人のみ |
| `recovery_steps` | 投稿所有者のみ | 投稿所有者のみ | 投稿所有者のみ |
| `regions` | 管理者のみ | 管理者のみ | 管理者のみ |
| `post_regions` | 投稿所有者のみ | - | 投稿所有者のみ |
| `tags` | 管理者のみ | 管理者のみ | 管理者のみ |
| `post_tags` | 投稿所有者のみ | - | 投稿所有者のみ |
| `comments` | ログインユーザーのみ | - | 本人のみ |
| `reactions` | ログインユーザーのみ | - | 本人のみ |

---

## 📈 データベース設計の特徴

### 1. 投稿が主役
- `recovery_posts`が核となり、他のテーブルが関連
- ユーザー情報は最小限

### 2. 検索性最優先
- カテゴリ、フェーズ、地域、タグでの検索が高速
- 適切なインデックスを設定

### 3. 匿名性重視
- 個人情報は一切不要
- RLSで匿名でも閲覧可能

### 4. 拡張可能
- 将来の課金・信用スコア機能に対応可能
- メンター機能への拡張も容易

---

## 🔍 よく使うクエリ例

### 投稿一覧の取得（カテゴリ・フェーズで絞り込み・複合インデックス活用）

```sql
-- 複合インデックス idx_posts_category_phase_created が効くクエリ
SELECT 
  rp.*,
  u.display_name,
  u.phase_level,
  COUNT(DISTINCT c.id) as comment_count,
  COUNT(DISTINCT r.id) as reaction_count
FROM recovery_posts rp
JOIN users u ON rp.user_id = u.id
LEFT JOIN comments c ON rp.id = c.post_id
LEFT JOIN reactions r ON rp.id = r.post_id
WHERE rp.problem_category = 'debt'
  AND rp.phase_at_post = 2
GROUP BY rp.id, u.display_name, u.phase_level
ORDER BY rp.created_at DESC;
```

### 投稿一覧の取得（カテゴリ・フェーズ・地域で絞り込み）

```sql
SELECT 
  rp.*,
  u.display_name,
  u.phase_level,
  COUNT(DISTINCT c.id) as comment_count,
  COUNT(DISTINCT r.id) as reaction_count
FROM recovery_posts rp
JOIN users u ON rp.user_id = u.id
LEFT JOIN comments c ON rp.id = c.post_id
LEFT JOIN reactions r ON rp.id = r.post_id
LEFT JOIN post_regions pr ON rp.id = pr.post_id
WHERE rp.problem_category = 'debt'
  AND rp.phase_at_post = 2
  AND pr.region_id = 13  -- 東京都
GROUP BY rp.id, u.display_name, u.phase_level
ORDER BY rp.created_at DESC;
```

### 回復ステップの取得（失敗行動を含む）

```sql
SELECT 
  rs.*,
  rp.title as post_title
FROM recovery_steps rs
JOIN recovery_posts rp ON rs.post_id = rp.id
WHERE rs.post_id = 'post-uuid'
ORDER BY rs.step_order;
```

### タグ別の投稿検索

```sql
SELECT 
  rp.*,
  u.display_name
FROM recovery_posts rp
JOIN users u ON rp.user_id = u.id
JOIN post_tags pt ON rp.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = '#25歳'
ORDER BY rp.created_at DESC;
```

---

## 📝 注意事項

1. **全文検索インデックス**: 現在はコメントアウトされています。必要に応じて有効化してください。
2. **regionsテーブル**: 初期データとして47都道府県が投入されます。
3. **tagsテーブル**: 初期データはありません。必要に応じて作成してください。
4. **RLSポリシー**: 本番環境でも有効です。テスト時は注意してください。
