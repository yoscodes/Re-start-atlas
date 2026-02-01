# 実装改善まとめ

このドキュメントでは、投稿一覧・検索機能以降に実装した改善点をまとめます。

## 1. offset pagination の限界改善

### 問題
- データ増加時にページズレ
- 並び順が不安定になり得る

### 改善
- **cursor pagination対応**: `created_at + id` によるカーソルベースのページング
- RPC関数に `p_cursor_created_at` と `p_cursor_id` パラメータを追加（将来対応用）
- `offset` パラメータは後方互換性のため残す
- 並び順の安定化: `ORDER BY created_at DESC, id DESC` で同created_atの場合も安定

### 実装ファイル
- `supabase/migrations/20250131000000_improve_post_list.sql`

---

## 2. array_agg の order 保証

### 問題
- `array_agg(distinct r.name)` で並び順が保証されない
- UI差分が出てバグに見える原因になる

### 改善
- `array_agg(DISTINCT r.prefecture ORDER BY r.prefecture)` に変更
- `array_agg(DISTINCT t.name ORDER BY t.name)` に変更
- 地域名・タグ名の並び順を保証

### 実装ファイル
- `supabase/migrations/20250131000000_improve_post_list.sql`

---

## 3. 検索特化フィールドの単位明示

### 問題
- `debt_amount INTEGER` の単位が曖昧
- 将来「円で入れた人」が出る可能性

### 改善
- DBコメントに単位を明示:
  - `debt_amount`: 「借金額（万円単位、SEO検索用）。注意: 万円単位で保存すること。例: 300万円の場合は300を保存」
  - `unemployed_months`: 「無職期間（月単位、SEO検索用）。例: 1年間の場合は12を保存」
  - `recovery_months`: 「回復期間（月単位、SEO検索用）。例: 2年間の場合は24を保存」
- UIにも単位を明示（既に実装済み）

### 実装ファイル
- `supabase/migrations/20250128000000_add_search_fields.sql`（コメント追加）

---

## 4. 失敗した行動の一次データ化（将来改善）

### 現状
- `failed_reason TEXT` で実装済み
- 自由度が高く、表記ゆれ・同義語地獄の可能性

### 将来改善（v2）
- `failed_reason_category ENUM` + `failed_reason_detail TEXT` に分割
- 「分析したくなった瞬間」が実装タイミング

### 実装ファイル
- `supabase/migrations/20250129000000_add_failed_reason.sql`（コメント追加）

---

## 5. フェーズ表示制御をRPC側で実装（API直叩き対策）

### 問題
- UI側のみの表示制御では、API直叩きで全文取得できる可能性
- 課金や信用制限を始めたら必須になる

### 改善
- RPC関数 `get_recovery_posts` に `p_user_phase_level` パラメータを追加
- RPC側で `is_summary_only` フラグを返す
- Server Actionでユーザーのフェーズレベルを取得してRPCに渡す
- UI側はRPC側の `is_summary_only` を優先

### 実装ファイル
- `supabase/migrations/20250131000000_improve_post_list.sql`
- `lib/actions/post-list.ts`
- `lib/types/post-list.ts`
- `components/PostListItem.tsx`

---

## 6. 信用スコア設定テーブル化

### 問題
- スコア計算を固定値にしている
- 調整がDBマイグレーション前提になる
- 思想が変わった時に壊れない設計が必要

### 改善
- `credit_score_settings` テーブルを作成（シングルトン）
- 設定項目:
  - `post_weight` (デフォルト: 10)
  - `reaction_weight` (デフォルト: 5)
  - `recovery_bonus` (デフォルト: 100)
- `calculate_credit_score` 関数を設定テーブル参照に変更
- 調整がDBマイグレーション不要に

### 実装ファイル
- `supabase/migrations/20250131000001_improve_credit_score.sql`

---

## 7. トリガー地獄対策

### 問題
- トリガー順序バグの可能性
- ロールバック時の不整合

### 改善
- `rebuild_user_stats(user_id)` RPC関数を追加
- 「壊れたら再計算」できる保険
- `rebuild_all_user_stats()` 関数も追加（管理者用）

### 実装ファイル
- `supabase/migrations/20250131000001_improve_credit_score.sql`

---

## 8. 責務分離の改善

### 問題
- フェーズ × 信用スコア × 表示制御の責務が分散
- 将来カオスになりやすい

### 改善
- 「誰が何を見れるか」を1箇所に集約
- Server Action (`getRecoveryPosts`) で表示制御を集約
- RPC側でも制御可能にする（API直叩き対策）

### 実装ファイル
- `lib/actions/post-list.ts`（表示制御を集約）

---

## マイグレーション実行順序

1. `20250131000000_improve_post_list.sql` - 投稿一覧改善
2. `20250131000001_improve_credit_score.sql` - 信用スコア改善

---

## 一覧UIの表示ルール（権威より再現性）

### author_phase_level を一覧に出さない
- **理由**: 投稿の価値と投稿者の階級が強く結びつきすぎると、Lv3の発言が「正解」に見えすぎるリスクがある
- **方針**: 一覧では **⭐信用ランク（S/A/B）だけ**。フェーズ数値（Lv1/Lv2/Lv3）は **詳細ページ or プロフ** で明示
- **実装**: 一覧では `post.phase_at_post`（投稿時点のフェーズ）のみバッジ表示。`author_phase_level` は一覧では使わない

### 信用スコアを数値で出す条件
- **一覧**: ランク（S/A/B）のみ（数値は出さない）
- **詳細**: 数値表示OK
- **管理画面**: 完全数値
- **理由**: 数字は競争を生む。Re:Start Atlas は「回復の場」として一覧ではランクに留める

### reaction_count の将来（v2 布石）
- **現状**: `reactions.type` = `empathy` / `respect`（共感・尊敬）。一覧では合算 `reaction_count` で 👍 表示でOK
- **将来 v2**: 応援・同意・ありがとう・保存など `reaction_type` を拡張する場合は ENUM 化 or CHECK 拡張を検討
- **方針**: UIでは合算でもOK。型・コメントで「一覧は合算、詳細で種別表示」の布石を残す

---

## 注意事項

### cursor pagination
- 現在は `offset` を使用（後方互換性）
- 将来的に `cursor` に移行する場合は、フロント側の実装も変更が必要

### 信用スコア設定
- 設定変更は管理者のみ（RLSポリシーで制御）
- 設定変更後は既存ユーザーのスコアが自動的に再計算される

### 表示制御
- RPC側とUI側の両方で制御（二重防御）
- RPC側の `is_summary_only` を優先
