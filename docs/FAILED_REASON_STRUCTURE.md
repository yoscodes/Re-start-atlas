# 失敗理由の軽い構造化（v1）

## 概要

Re:Start Atlasの最大の差別化は「成功談」ではなく「やってはいけなかった行動の集合知」です。

v1では、失敗理由を軽く構造化することで、分析・横断を可能にします。

## 実装内容

### 1. DB構造

**ファイル**: `supabase/migrations/20250201000004_add_failed_reason_structure.sql`

**追加カラム**:
- `failed_reason_type` TEXT NULL: 失敗理由のタイプ（選択式、4〜5個のみ）
- `failed_reason_detail` TEXT NULL: 失敗理由の詳細（自由記述）

**既存データの扱い**:
- 既存の`failed_reason`カラムは残す（legacy / 表示互換用）
- 既存の`failed_reason`のデータを`failed_reason_detail`にコピー

**役割の明確化**:
- `failed_reason`: **legacy / 表示互換用**（既存データの後方互換性のため）
- `failed_reason_detail`: **正の一次データ（今後の基準）**。v2以降はこちらを優先的に使用する。

**UI表示の優先順位**:
- `failedReasonDetail` を優先し、なければ `failedReason` を表示
- 新規作成時は `failedReasonDetail` を使用し、`failedReason` は使用しない

### 2. 選択肢の定義

**ファイル**: `lib/constants/failed-reason-types.ts`

**選択肢（4〜5個のみ）**:
1. 情報不足（調べなかった）
2. 焦り・短絡判断
3. 人に頼らなかった
4. 環境に甘えた
5. その他（自由記述）

**設計思想**:
- ENUMではなくTEXT（柔軟性を保つ）
- 選択肢は4〜5個だけ（多すぎると動けない）
- 分析用であって、分類ではない

### 3. 投稿フォーム

**ファイル**: `components/RecoveryPostForm.tsx`

**UI設計**:
- チェックしたときだけ表示
- ラベル文言: 「なぜそれは失敗だったと思いますか？」
  - 反省文ではない / 教訓文に寄せる
- 選択式（`failedReasonType`）+ 自由記述（`failedReasonDetail`）

### 4. 詳細ページ表示

**ファイル**: `components/PostDetailSteps.tsx`

**表示ルール**:
- `failedReasonDetail`が主役
- `failedReasonType`は薄く表示（括弧内）
- 後方互換性: 既存の`failedReason`も表示可能

**表示例**:
```
理由:
焦って調べずに決めてしまった
（焦り・短絡判断）
```

### 5. RPC関数の更新

**更新対象**:
- `create_recovery_post`: 新しいフィールドに対応
- `update_recovery_post`: 新しいフィールドに対応
- `get_recovery_post_detail`: 新しいフィールドを返す
- `create_sample_recovery_post`: 新しいフィールドに対応

## 設計原則

### ❌ やらないこと

- ENUM大量定義
- 選択肢10個以上
- 必須入力の強制
- 管理画面ゴリゴリ分析

### ✅ やること

- 軽い構造化（TEXTのみ）
- 選択肢は4〜5個だけ
- 分析用であって、分類ではない
- 既存データは壊さない

## 今後の拡張（v2以降）

### v1ですぐ可能

- 「よくある失敗」一覧
- カテゴリ別 失敗傾向
- レコメンドの精度向上（将来）

### v2で拡張可能

- より詳細な分類
- 失敗理由の自動分析
- 機械学習ベースのレコメンド

## 注意事項

- **既存データ**: `failed_reason`カラムは残す（後方互換性のため）
- **移行コスト**: 既存の`failed_reason`のデータを`failed_reason_detail`にコピー済み
- **必須入力**: `failedReasonDetail`は`isFailure`が`true`の場合のみ必須
