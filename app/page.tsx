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
                詰んだ瞬間から、回復までの記録を残す場所です。
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/onboarding?auto=1"
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition"
                >
                  静かに見る
                </Link>
              </div>
              <div className="pt-2">
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
                >
                  すでにアカウントがある場合はログイン
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
