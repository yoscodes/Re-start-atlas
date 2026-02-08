/**
 * 自分の投稿一覧
 * 思想: 自分がどこを通ってきたかを見る場所。他人に見せる・成果を誇る・実績管理ではない。
 * 並び: 作成日時昇順（古い→新しい）＝ スクロールするほど「今」に近づく
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMyPosts } from '@/lib/actions/my-posts'
import PhaseBadge from '@/components/PhaseBadge'
import { getRelativeTime } from '@/lib/utils/format'
import type { PhaseLevel } from '@/lib/utils/phase'

const PROBLEM_CATEGORY_LABELS: Record<string, string> = {
  debt: '借金',
  unemployed: '失業',
  dropout: '中退',
  addiction: '依存症',
  relationship: '人間関係',
}

export default async function MyPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (!user.email_confirmed_at) {
    redirect('/auth/verify-email')
  }

  const [postsResult, userProfileResult] = await Promise.all([
    getMyPosts(),
    supabase.from('users').select('phase_level').eq('id', user.id).single(),
  ])

  if (!postsResult.success) {
    redirect('/dashboard')
  }

  const posts = postsResult.posts
  const userProfile = userProfileResult.data as { phase_level: number } | null
  const currentPhaseLevel = (userProfile?.phase_level ?? 1) as PhaseLevel

  return (
    <main className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
          自分の投稿
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          これまでに書いた記録です。
        </p>
        {/* 今の自分のフェーズ（並べるだけ。強調しない） */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">いま</span>
          <PhaseBadge level={currentPhaseLevel} />
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          まだ投稿がありません。
        </p>
      ) : (
        <ul className="space-y-0">
          {posts.map((post) => (
            <li key={post.id}>
              <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                {post.status === 'draft' ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      （下書き） {PROBLEM_CATEGORY_LABELS[post.problem_category] ?? post.problem_category} | {post.title?.trim() || 'タイトル未設定'}
                    </p>
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
                    >
                      編集する
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <PhaseBadge level={post.phase_at_post as PhaseLevel} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {PROBLEM_CATEGORY_LABELS[post.problem_category] ?? post.problem_category}
                      </span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium mb-1 line-clamp-2">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {getRelativeTime(post.created_at)}
                    </p>
                    <Link
                      href={`/posts/${post.id}`}
                      className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
                    >
                      詳細を見る
                    </Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          ダッシュボードに戻る
        </Link>
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
          時間が経って、言葉が変わることがあります。
        </p>
      </footer>
    </main>
  )
}
