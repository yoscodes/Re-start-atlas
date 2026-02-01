import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * ブラウザ用 Supabase クライアントを作成します。
 * ※ この関数はブラウザ環境でのみ呼び出してください。
 *    Client Component では useSupabaseClient() フックを使用してください。
 *
 * isSingleton: false にし、毎回新しいクライアントを作成します。
 * （キャッシュされたクライアントが「ストレージ不可」の文脈で作られると
 *  以降もエラーになるため）
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: false }
  )
}
