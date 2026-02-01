# create_recovery_post の「created_at is ambiguous」が解消されない原因

## エラーの意味

- **エラー**: `column reference "created_at" is ambiguous`
- **場所**: `RETURNING id, created_at` の `created_at`

## 根本原因（2つ）

### 1. RETURNS TABLE の暗黙の OUT パラメータ

PL/pgSQL では次のように書くと:

```sql
RETURNS TABLE (post_id UUID, created_at TIMESTAMPTZ)
```

関数内に **`post_id` と `created_at` という名前の暗黙の変数（OUT パラメータ）** ができます。

そのため、関数本体の `RETURNING id, created_at INTO ...` の `created_at` が、

- テーブル `recovery_posts` のカラム `created_at` なのか
- 上記の OUT パラメータ `created_at` なのか

判断できず、「ambiguous（曖昧）」になります。

### 2. 修正スクリプトが DB に反映されていない可能性

エラーメッセージには **「RETURNING id, created_at」** と出ています（`recovery_posts.id` などの修飾なし）。

つまり、**いま実行されている関数の定義は、まだ古いもの（修飾なしの RETURNING）** です。

考えられるパターン:

- **A)** `fix_create_recovery_post_complete.sql` を実行していない  
  → マイグレーションで作られた古い関数のまま
- **B)** 修正スクリプトの **CREATE が失敗している**  
  - 例: `RETURNING recovery_posts.id, recovery_posts.created_at` が、Supabase/PostgreSQL のバージョンやスキーマで無効
  - CREATE が失敗すると、トランザクションでロールバックされ、DROP も戻る
  - 結果として古い 14 引数版が残り、その古い本体（`RETURNING id, created_at`）が実行されてエラーになる

## 確実に直す方法: 動的 SQL で RETURNING を実行する

`RETURNING` を **動的 SQL（EXECUTE）** の中でだけ実行するようにすると、

- `RETURNS TABLE` の `created_at` とは別のスコープでパースされる
- その中では `created_at` は「テーブルのカラム」だけを指すため、曖昧になりません。

そのため、**原因 1 も 2（CREATE 失敗）も避けやすく、確実に解消できます。**

## 今回の修正内容（fix_create_recovery_post_complete.sql）

- **INSERT + RETURNING を `EXECUTE format(...)` の動的SQLに変更**
- 動的SQL内では `RETURNS TABLE` の `created_at` は存在しないため、`RETURNING id, created_at` はテーブル列だけを指し、曖昧にならない
- 戻り値の型（`post_id`, `created_at`）とクライアントの期待はそのまま
