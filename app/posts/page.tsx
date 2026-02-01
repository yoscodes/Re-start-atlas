/**
 * 投稿一覧ページ
 */

import { Suspense } from 'react'
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

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          投稿一覧
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          回復の経験を共有し、お互いに学び合いましょう
        </p>
      </div>

      <Suspense fallback={<div>読み込み中...</div>}>
        <PostListClient regions={regions} tags={tags} userPhaseLevel={userPhaseLevel} />
      </Suspense>
    </main>
  )
}
