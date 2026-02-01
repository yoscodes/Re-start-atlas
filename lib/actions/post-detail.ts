'use server'

/**
 * Server Action: 投稿詳細の取得
 */

import { createClient } from '@/lib/supabase/server'
import type { PostDetail } from '@/lib/types/post-detail'

export async function getPostDetail(
  postId: string
): Promise<
  | { success: true; post: PostDetail }
  | { success: false; error: string }
> {
  const supabase = await createClient()

  // ユーザーのフェーズレベルを取得（フェーズ制御用）
  const { data: { user } } = await supabase.auth.getUser()
  let userPhaseLevel: number | null = null

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('phase_level')
      .eq('id', user.id)
      .single()

    userPhaseLevel = userProfile?.phase_level ?? null
  }

  try {
    const { data, error } = await supabase.rpc('get_recovery_post_detail', {
      p_post_id: postId,
      p_user_phase_level: userPhaseLevel,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: error.message || '投稿の取得に失敗しました',
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '投稿が見つかりませんでした',
      }
    }

    const result = data[0]

    // JSONB配列をパース
    const steps = Array.isArray(result.steps) 
      ? result.steps 
      : (result.steps ? JSON.parse(JSON.stringify(result.steps)) : [])

    const post: PostDetail = {
      id: result.id,
      title: result.title,
      summary: result.summary,
      problem_category: result.problem_category,
      phase_at_post: result.phase_at_post,
      started_at: result.started_at,
      recovered_at: result.recovered_at,
      current_status: result.current_status,
      created_at: result.created_at,
      updated_at: result.updated_at,
      age_at_that_time: result.age_at_that_time,
      debt_amount: result.debt_amount,
      unemployed_months: result.unemployed_months,
      recovery_months: result.recovery_months,
      region_names: result.region_names || [],
      tag_names: result.tag_names || [],
      is_summary_only: result.is_summary_only || false,
      steps: steps || [],
    }

    return {
      success: true,
      post,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}
