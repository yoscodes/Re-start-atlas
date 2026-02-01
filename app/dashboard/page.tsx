import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PhaseIndicator from '@/components/PhaseIndicator'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // メール確認が必要で、まだ確認されていない場合
  if (!user.email_confirmed_at) {
    redirect('/auth/verify-email')
  }

  // ユーザーのフェーズレベルを取得
  const { data: userProfile } = await supabase
    .from('users')
    .select('phase_level')
    .eq('id', user.id)
    .single()

  const phaseLevel = userProfile?.phase_level ?? 1

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          ダッシュボード
        </h1>
        
        <div className="text-center space-y-4">
          <p className="text-lg">
            ログイン中: {user.email}
          </p>

          {/* フェーズインジケーター（「自分は今どこにいるか」を可視化） */}
          <div className="flex justify-center">
            <PhaseIndicator level={phaseLevel} />
          </div>

          <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">ユーザー情報</h2>
            <div className="text-left space-y-2">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>フェーズレベル:</strong> {phaseLevel}</p>
              <p><strong>作成日時:</strong> {user.created_at ? new Date(user.created_at).toLocaleString('ja-JP') : 'N/A'}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-4 justify-center flex-wrap">
            <Link
              href="/posts/create"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              新規投稿
            </Link>
            <Link
              href="/posts"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              投稿一覧を見る
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
