# ログイン実装の説明

## 実装しているログイン方法

### 1. メール + パスワードでログイン

- **ページ**: `/auth/signin`
- **コンポーネント**: `components/SignInForm.tsx`
- **処理の流れ**:
  1. ユーザーがメール・パスワードを入力して「ログイン」をクリック
  2. `supabase.auth.signInWithPassword({ email, password })` を呼び出し
  3. 成功 → `/dashboard` へリダイレクト
  4. 失敗 → 画面上にエラーメッセージを表示（`error.message`）

- **使用している Supabase API**:
  - `signInWithPassword()` … メールとパスワードで認証

### 2. Google でログイン（OAuth）

- **同じページ**: `/auth/signin` の「Googleでログイン」ボタン
- **処理の流れ**:
  1. 「Googleでログイン」クリック
  2. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '.../auth/callback?next=/dashboard' } })` を呼び出し
  3. ブラウザが Google の認証画面に遷移
  4. 認証後、`/auth/callback?code=...` にリダイレクト
  5. `app/auth/callback/route.ts` で `exchangeCodeForSession(code)` によりセッション取得
  6. 成功 → `/dashboard` へリダイレクト

- **使用している Supabase API**:
  - `signInWithOAuth()` … OAuth 開始
  - `exchangeCodeForSession()` … コールバックで code をセッションに交換

---

## ログイン後の動き

- **ダッシュボード** (`/dashboard`):
  - 未ログイン → `/auth/signin` にリダイレクト
  - ログイン済みだが **メール未確認** (`email_confirmed_at` が null) → `/auth/verify-email` にリダイレクト
  - ログイン済みかつメール確認済み → ダッシュボードを表示

---

## ログインに失敗する主な原因と確認ポイント

### 1. 認証情報の誤り

- **Supabase のエラー例**: `Invalid login credentials`
- **確認**: メールアドレス・パスワードの入力ミス、前後のスペース

### 2. メール確認が有効で、まだ確認していない

- **Supabase のエラー例**: `Email not confirmed`
- **状況**: Supabase の「Confirm email」が ON のとき、サインアップ後メール内のリンクをクリックしていないとログインできない
- **確認**:
  - Supabase Dashboard → Authentication → Providers → Email → 「Confirm email」の ON/OFF
  - 確認メールのリンクをクリックしたか

### 3. 環境変数・Supabase 設定

- **確認**:
  - `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか
  - Supabase プロジェクトの URL と anon key と一致しているか（Dashboard → Settings → API）

### 4. Google ログインだけ失敗する場合

- **確認**:
  - Supabase Dashboard → Authentication → Providers → Google が有効か
  - Google Cloud Console で OAuth クライアントを作成し、リダイレクト URI に  
    `https://<PROJECT_REF>.supabase.co/auth/v1/callback` を登録しているか
  - Supabase に Client ID / Client Secret を正しく設定しているか

### 5. セッションが Cookie に保存されない

- **症状**: ログイン成功のように見えるが、ダッシュボードで「未ログイン」になる
- **確認**: ブラウザの Cookie が無効・ブロックされていないか、シークレットモード・別オリジンでないか

### 6. ボタンが押せない（ログインできない）

- **症状**: 「ログイン」ボタンがずっと disabled
- **原因**: `useSupabaseClient()` が `null` のまま（クライアント作成失敗やストレージエラー）
- **確認**: ブラウザコンソールに `[useSupabaseClient] createClient failed` やストレージ関連のエラーが出ていないか

---

## 実装ファイル一覧

| 役割 | ファイル |
|------|----------|
| ログインフォーム（メール/パスワード・Google） | `components/SignInForm.tsx` |
| ログイン画面 | `app/auth/signin/page.tsx` |
| ブラウザ用 Supabase クライアント | `lib/supabase/client.ts` |
| クライアント取得フック | `lib/supabase/useSupabaseClient.ts` |
| OAuth コールバック | `app/auth/callback/route.ts` |
| ダッシュボード（未ログイン・未確認時のリダイレクト） | `app/dashboard/page.tsx` |
| セッション更新 | `middleware.ts` |

---

## 次のステップ（失敗時）

1. 画面上に表示される **エラーメッセージ** を確認する（Supabase が返す文言のまま表示しています）
2. ブラウザの **開発者ツール → Console** でエラーが出ていないか確認する
3. **Supabase Dashboard → Authentication → Users** で、該当メールのユーザーが存在するか・メール確認済みか確認する
4. 上記「ログインに失敗する主な原因」の項目を順に確認する
