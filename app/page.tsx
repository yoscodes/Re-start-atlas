import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Restart Atlas
        </h1>
        
        <div className="text-center space-y-4">
          {user ? (
            <div className="space-y-4">
              <p className="text-lg">
                ようこそ、{user.email}さん！
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  ダッシュボードへ
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg mb-4">
                Next.jsとSupabaseを使用したWebアプリケーション
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  ログイン
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  サインアップ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
