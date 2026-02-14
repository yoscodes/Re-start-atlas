'use server'

/**
 * Server Action: 投稿詳細の取得
 */

import { createClient } from '@/lib/supabase/server'
import type { PostDetail } from '@/lib/types/post-detail'
import type { SimilarPost } from '@/lib/types/post-recommendation'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'

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
      initial_misconception: result.initial_misconception || null,
      status: (result as { status?: string }).status === 'draft' ? 'draft' : 'published',
      is_hidden: (result as { is_hidden?: boolean }).is_hidden ?? false,
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

/**
 * Server Action: 似た状況の投稿を取得
 */
export async function getSimilarPosts(
  postId: string,
  limit: number = 3
): Promise<
  | { success: true; posts: SimilarPost[] }
  | { success: false; error: string }
> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_similar_recovery_posts', {
      p_post_id: postId,
      p_limit: limit,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: error.message || '似た投稿の取得に失敗しました',
      }
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        posts: [],
      }
    }

    const posts: SimilarPost[] = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      phase_at_post: item.phase_at_post,
      problem_category: item.problem_category,
      display_number: item.display_number,
      display_label: item.display_label,
    }))

    return {
      success: true,
      posts,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}

/**
 * Server Action: よくある失敗の傾向（非数値）を取得
 * 目的: 「あ、これ多いんだ」と気づかせる（数を出さない）
 * 
 * ログ: 思想検証用の内部データ（UIには一切影響させない）
 * - 表示された / 表示されなかった（データなし）
 */
export async function getCommonFailedReasons(
  problemCategory: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
): Promise<string[] | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_common_failed_reasons', {
      p_problem_category: problemCategory,
      p_limit: 3,
    })

    if (error) {
      console.error('RPC Error:', error)
      // ログ: 表示されなかった（エラー）
      console.log('[PostCommonFailures] 表示されなかった（エラー）', {
        problemCategory,
        error: error.message,
      })
      // 失敗したら null（何も表示しない）
      return null
    }

    if (!data || data.length === 0) {
      // ログ: 表示されなかった（データなし）
      console.log('[PostCommonFailures] 表示されなかった（データなし）', {
        problemCategory,
      })
      return null
    }

    // failed_reason_type の配列を返す（数値は含めない）
    const failedReasons = data
      .map((item: any) => item.failed_reason_type)
      .filter((type: string | null) => type !== null && type !== '')

    if (failedReasons.length > 0) {
      // ログ: 表示された
      console.log('[PostCommonFailures] 表示された', {
        problemCategory,
        count: failedReasons.length,
        // 理由タイプはログに含めない（個人情報保護）
      })
      return failedReasons
    } else {
      // ログ: 表示されなかった（データなし）
      console.log('[PostCommonFailures] 表示されなかった（データなし）', {
        problemCategory,
      })
      return null
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    // ログ: 表示されなかった（エラー）
    console.log('[PostCommonFailures] 表示されなかった（エラー）', {
      problemCategory,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // 失敗したら null（何も表示しない）
    return null
  }
}

/**
 * Server Action: 編集用に投稿を取得（投稿者本人のみ）
 * 条件NGの場合は success: false を返し、呼び出し元で /posts/[id] にリダイレクトする
 */
export async function getPostForEdit(
  postId: string
): Promise<
  | { success: true; post: CreateRecoveryPostInput; createdAt: string }
  | { success: false; error: string }
> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'ログインが必要です' }
  }

  try {
    const { data: postRow, error: postError } = await supabase
      .from('recovery_posts')
      .select('id, user_id, title, summary, problem_category, phase_at_post, started_at, recovered_at, current_status, created_at, age_at_that_time, debt_amount, unemployed_months, recovery_months, initial_misconception')
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    if (postError || !postRow) {
      return { success: false, error: '投稿が見つかりませんでした' }
    }

    if ((postRow as { user_id: string }).user_id !== user.id) {
      return { success: false, error: 'この投稿を編集する権限がありません' }
    }

    const { data: stepsRows } = await supabase
      .from('recovery_steps')
      .select('step_order, content, is_failure, failed_reason_type, failed_reason_detail, failed_reason')
      .eq('post_id', postId)
      .order('step_order', { ascending: true })

    const { data: regionRows } = await supabase
      .from('post_regions')
      .select('region_id')
      .eq('post_id', postId)

    const { data: tagRows } = await supabase
      .from('post_tags')
      .select('tag_id, tags(name)')
      .eq('post_id', postId)

    const steps = (stepsRows || []).map((s: {
      step_order: number
      content: string
      is_failure: boolean
      failed_reason_type?: string | null
      failed_reason_detail?: string | null
      failed_reason?: string | null
    }) => ({
      order: s.step_order,
      content: s.content,
      isFailure: s.is_failure,
      failedReasonType: s.failed_reason_type ?? null,
      failedReasonDetail: s.failed_reason_detail ?? null,
      failedReason: s.failed_reason ?? null,
    }))

    const regionIds = (regionRows || []).map((r: { region_id: number }) => r.region_id)
    const tagNames = (tagRows || [])
      .map((r: { tags: { name: string }[] | null }) => r.tags?.[0]?.name ?? '')
      .filter(Boolean)

    const post: CreateRecoveryPostInput = {
      title: postRow.title,
      summary: postRow.summary,
      problemCategory: postRow.problem_category,
      phaseAtPost: postRow.phase_at_post as 1 | 2 | 3,
      startedAt: postRow.started_at ?? null,
      recoveredAt: postRow.recovered_at ?? null,
      currentStatus: postRow.current_status,
      steps,
      regionIds,
      tagNames,
      ageAtThatTime: postRow.age_at_that_time ?? null,
      debtAmount: postRow.debt_amount ?? null,
      unemployedMonths: postRow.unemployed_months ?? null,
      recoveryMonths: postRow.recovery_months ?? null,
      initialMisconception: (postRow as { initial_misconception?: string | null }).initial_misconception ?? null,
      status: (postRow as { status?: string }).status === 'draft' ? 'draft' : 'published',
    }

    return {
      success: true,
      post,
      createdAt: postRow.created_at,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '投稿の取得に失敗しました',
    }
  }
}
