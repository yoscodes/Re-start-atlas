# 今後の拡張機能

投稿編集フロー実装完了後、以下の3つの機能を実装する予定です。

## 🗑️ 1. 投稿削除（論理削除 / アーカイブ）

### 設計方針

- **論理削除**: 物理削除ではなく、`deleted_at`カラムで管理
- **アーカイブ**: 削除された投稿は検索結果から除外
- **復元可能**: 必要に応じて復元機能を実装

### 実装内容

#### データベース変更

```sql
-- deleted_atカラムを追加
ALTER TABLE recovery_posts 
ADD COLUMN deleted_at TIMESTAMPTZ;

-- インデックス追加
CREATE INDEX idx_recovery_posts_deleted_at 
ON recovery_posts(deleted_at) 
WHERE deleted_at IS NULL;

-- 削除RPC関数
CREATE OR REPLACE FUNCTION delete_recovery_post(
  p_post_id UUID
)
RETURNS TABLE (
  post_id UUID,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
BEGIN
  -- 権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、削除権限がありません',
      errcode = 'P2001';
  END IF;

  -- 論理削除
  UPDATE public.recovery_posts
  SET deleted_at = NOW()
  WHERE id = p_post_id AND user_id = auth.uid()
  RETURNING deleted_at INTO v_deleted_at;

  RETURN QUERY SELECT p_post_id, v_deleted_at;
END;
$$;
```

#### RLSポリシーの更新

```sql
-- 削除された投稿は表示しない
CREATE POLICY "recovery_posts_select_not_deleted" 
ON public.recovery_posts
FOR SELECT 
USING (deleted_at IS NULL);
```

#### Server Action

```typescript
export async function deleteRecoveryPost(
  postId: string
): Promise<
  | { success: true; postId: string; deletedAt: string }
  | { success: false; error: string; errorCode?: string }
> {
  // RPC関数を呼び出し
  const { data, error } = await supabase.rpc('delete_recovery_post', {
    p_post_id: postId,
  })
  // ...
}
```

## 📜 2. 編集履歴（audit log / versioning）

### 設計方針

- **バージョン管理**: 編集のたびにバージョンを保存
- **スナップショット**: 各バージョンの完全なスナップショットを保存
- **差分表示**: バージョン間の差分を表示可能

### 実装内容

#### データベース変更

```sql
-- 編集履歴テーブル
CREATE TABLE recovery_post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES recovery_posts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- スナップショットデータ
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem_category problem_category_enum NOT NULL,
  phase_at_post INTEGER NOT NULL,
  started_at DATE,
  recovered_at DATE,
  current_status TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, version)
);

-- インデックス
CREATE INDEX idx_recovery_post_versions_post_id 
ON recovery_post_versions(post_id, version DESC);

-- バージョン作成トリガー
CREATE OR REPLACE FUNCTION create_post_version()
RETURNS TRIGGER AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  -- 次のバージョン番号を取得
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM recovery_post_versions
  WHERE post_id = NEW.id;

  -- バージョンを作成
  INSERT INTO recovery_post_versions (
    post_id,
    version,
    user_id,
    title,
    summary,
    problem_category,
    phase_at_post,
    started_at,
    recovered_at,
    current_status
  ) VALUES (
    NEW.id,
    v_next_version,
    NEW.user_id,
    NEW.title,
    NEW.summary,
    NEW.problem_category,
    NEW.phase_at_post,
    NEW.started_at,
    NEW.recovered_at,
    NEW.current_status
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recovery_posts_version_trigger
AFTER UPDATE ON recovery_posts
FOR EACH ROW
WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
EXECUTE FUNCTION create_post_version();
```

#### Server Action

```typescript
export async function getPostVersions(
  postId: string
): Promise<PostVersion[]> {
  const { data, error } = await supabase
    .from('recovery_post_versions')
    .select('*')
    .eq('post_id', postId)
    .order('version', { ascending: false })
  // ...
}
```

## 🔒 3. 同時編集対策（updated_at / 楽観ロック）

### 設計方針

- **楽観ロック**: `updated_at`を使用して同時編集を検出
- **競合検出**: 編集時に`updated_at`をチェック
- **ユーザー通知**: 競合が検出された場合、ユーザーに通知

### 実装内容

#### RPC関数の更新

```sql
CREATE OR REPLACE FUNCTION update_recovery_post(
  p_post_id UUID,
  p_expected_updated_at TIMESTAMPTZ, -- 楽観ロック用
  p_title TEXT,
  -- ... 他のパラメータ
)
RETURNS TABLE (
  post_id UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ;
  v_current_updated_at TIMESTAMPTZ;
BEGIN
  -- 現在のupdated_atを取得
  SELECT updated_at INTO v_current_updated_at
  FROM public.recovery_posts
  WHERE id = p_post_id;

  -- 楽観ロックチェック
  IF v_current_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING
      message = '投稿が他のユーザーによって更新されました。最新の状態を確認してください。',
      errcode = 'P3001'; -- 競合エラー
  END IF;

  -- 権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.recovery_posts
    WHERE id = p_post_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING
      message = '投稿が見つからないか、編集権限がありません',
      errcode = 'P2001';
  END IF;

  -- 更新処理
  -- ...
END;
$$;
```

#### Server Actionの更新

```typescript
export async function updateRecoveryPost(
  postId: string,
  input: CreateRecoveryPostInput,
  expectedUpdatedAt?: string // 楽観ロック用
): Promise<
  | { success: true; postId: string; updatedAt: string }
  | { success: false; error: string; errorCode?: string; conflict?: boolean }
> {
  const { data, error } = await supabase.rpc('update_recovery_post', {
    p_post_id: postId,
    p_expected_updated_at: expectedUpdatedAt || null,
    // ...
  })

  if (error?.code === 'P3001') {
    return {
      success: false,
      error: getUserErrorMessage(error),
      errorCode: error.code,
      conflict: true, // 競合フラグ
    }
  }
  // ...
}
```

#### UIコンポーネントの更新

```typescript
// 投稿データ取得時にupdated_atを保存
const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string>()

// 更新時に楽観ロックをチェック
const result = await updateRecoveryPost(postId, formData, currentUpdatedAt)

if (result.conflict) {
  // 競合が検出された場合
  // 1. エラーメッセージを表示
  // 2. 最新データを再取得
  // 3. フォームを更新
}
```

## 📊 実装優先順位

1. **投稿削除（論理削除）** - 基本的な機能
2. **同時編集対策（楽観ロック）** - データ整合性のため重要
3. **編集履歴（バージョン管理）** - 高度な機能

## 📝 注意事項

- 各機能は独立して実装可能
- 既存のエラーコード設計を拡張
- RPC関数の設計思想を維持
