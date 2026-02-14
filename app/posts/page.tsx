/**
 * 投稿一覧ページ
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PostListClient from '@/components/PostListClient'

async function getRegions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('regions')
    .select('id, prefecture')
    .is('city', null)
    .order('id')

  return data || []
}

async function getTags() {
  const supabase = await createClient()
  const { data } = await supabase.from('tags').select('id, name').order('name')

  return data || []
}

async function getUserPhaseLevel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null // 匿名ユーザー
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('phase_level')
    .eq('id', user.id)
    .single()

  return userProfile?.phase_level ?? null
}

export default async function PostsPage() {
  const [regions, tags, userPhaseLevel] = await Promise.all([
    getRegions(),
    getTags(),
    getUserPhaseLevel(),
  ])

  const isLoggedIn = userPhaseLevel !== null

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            投稿一覧
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            回復の過程を記録した投稿一覧です
          </p>
        </div>
        {isLoggedIn && (
          <div className="flex shrink-0 gap-2">
            <Link
              href="/posts/create"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition"
            >
              新規投稿
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded hover:bg-gray-600 transition"
            >
              ダッシュボード
            </Link>
          </div>
        )}
      </div>

      <Suspense fallback={<div>読み込み中...</div>}>
        <PostListClient regions={regions} tags={tags} userPhaseLevel={userPhaseLevel} />
      </Suspense>
    </main>
  )
}
