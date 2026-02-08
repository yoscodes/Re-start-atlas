'use server'

/**
 * Server Action: 自分の投稿一覧の取得
 * 思想: 「自分が、どこを通ってきたかを見る」ための一覧。古い→新しい（時間軸と一致）
 */

import { createClient } from '@/lib/supabase/server'

export interface MyPostItem {
  id: string
  title: string
  problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
  phase_at_post: number
  created_at: string
  status: 'draft' | 'published'
}

export async function getMyPosts(): Promise<
  | { success: true; posts: MyPostItem[] }
  | { success: false; error: string }
> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('recovery_posts')
      .select('id, title, problem_category, phase_at_post, created_at, status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching my posts:', error)
      return { success: false, error: error.message || '投稿の取得に失敗しました' }
    }

    const posts: MyPostItem[] = (data || []).map((row: { id: string; title: string; problem_category: string; phase_at_post: number; created_at: string; status?: string }) => ({
      id: row.id,
      title: row.title,
      problem_category: row.problem_category as MyPostItem['problem_category'],
      phase_at_post: row.phase_at_post,
      created_at: row.created_at,
      status: row.status === 'draft' ? 'draft' : 'published',
    }))
    return { success: true, posts }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '投稿の取得に失敗しました',
    }
  }
}
