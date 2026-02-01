# エラー分析: "Access to storage is not allowed from this context"

## エラーメッセージ

```
Uncaught (in promise) Error: Access to storage is not allowed from this context.
```

## 発生箇所の推定

1. **Supabase 側ではこの文言は未使用**
   - `@supabase/ssr` や `@supabase/auth-js` のソースに同じ文言はありません。
   - `@supabase/ssr` は別メッセージで「non-browser runtimes」「cookie options」を要求するエラーを投げます。

2. **ブラウザのストレージ制限の可能性が高い**
   - `localStorage` / `sessionStorage` / `document.cookie` へのアクセスが、その「文脈」では許可されていないときにブラウザが投げるエラーです。
   - 例:
     - シークレット/プライベートモードでストレージが無効
     - サードパーティ iframe でストレージブロック（Safari ITP など）
     - 一部のブラウザ拡張によるブロック
     - 厳格な Cookie 設定（Chrome の Third-party cookies など）

3. **Next.js の実行タイミング**
   - Client Component でも、初回レンダーやハイドレーション時に「ストレージが使えない文脈」でコードが走る場合があります。
   - `createBrowserClient` がそのタイミングで `document.cookie` や内部ストレージに触れると、上記のようなエラーになる可能性があります。

## 現在の対策（実装済み）

- **`useSupabaseClient()`**
  - `useEffect` 内で `createClient()` を呼び、**マウント後（クライアント確定後）** にだけブラウザ用クライアントを作成しています。
- これにより「サーバーやプリレンダ中に `createBrowserClient` が実行される」ケースは避けています。

## それでも出る場合に考えられる原因

1. **useEffect の実行タイミング**
   - ハイドレーション直後の useEffect が、まだストレージが許可されていない「文脈」で実行されている可能性。
2. **認証後の書き込み**
   - `signInWithPassword` 成功後にセッションをストレージに書き込むタイミングで、そのコールバックが制限された文脈で実行されている可能性。
3. **ブラウザ・環境**
   - シークレットモード、特定の拡張、モバイルブラウザなどでストレージがブロックされている。

## 推奨する追加対策

1. **クライアント作成の遅延**
   - `useEffect` 内で `setTimeout(..., 0)` や `queueMicrotask` を使い、イベントループの次のティックで `createClient()` を実行する。
2. **明示的な Cookie オプション**
   - `createBrowserClient` に `cookies: { getAll, setAll }` を渡し、`document.cookie` の読み書きを try-catch で囲み、失敗時は握りつぶすかメモリのみで扱う（セッション永続化は諦める）選択肢を用意する。
3. **環境の確認**
   - 通常ウィンドウ・別ブラウザ・シークレットオフで再現するか確認する。
   - iframe や別オリジンから開いていないか確認する。

## 参考

- Chromium: [SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.](https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document)
- `@supabase/ssr` の `createStorageFromOptions`: 非ブラウザ時は `setAll` で「cookie options が必要」という別エラーを投げる。
