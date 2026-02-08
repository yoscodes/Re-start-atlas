'use server'

/**
 * Server Action: 回復投稿の作成・更新・削除
 * RPC関数を呼び出してトランザクション処理を実行
 */

import { createClient } from '@/lib/supabase/server'
import { createRecoveryPostSchema } from '@/lib/validations/recovery-post'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'
import { getUserErrorMessage } from '@/lib/errors/recovery-post'

export async function createRecoveryPost(
  input: CreateRecoveryPostInput
): Promise<
  | { success: true; postId: string; createdAt: string }
  | { success: false; error: string; errorCode?: string }
> {
  // フロント側バリデーション（二重防御）
  const validationResult = createRecoveryPostSchema.safeParse(input)
  
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0]
    return {
      success: false,
      error: firstError?.message || 'バリデーションエラーが発生しました',
    }
  }

  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: 'ログインが必要です',
    }
  }

  const status = input.status ?? 'published'

  try {
    const { data, error } = await supabase.rpc('create_recovery_post', {
      p_title: input.title,
      p_summary: input.summary,
      p_problem_category: input.problemCategory,
      p_phase_at_post: input.phaseAtPost,
      p_started_at: input.startedAt || null,
      p_recovered_at: input.recoveredAt || null,
      p_current_status: input.currentStatus,
      p_steps: input.steps,
      p_region_ids: input.regionIds,
      p_tag_names: input.tagNames,
      p_age_at_that_time: input.ageAtThatTime || null,
      p_debt_amount: input.debtAmount || null,
      p_unemployed_months: input.unemployedMonths || null,
      p_recovery_months: input.recoveryMonths || null,
      p_initial_misconception: input.initialMisconception || null,
      p_status: status,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: getUserErrorMessage(error),
        errorCode: error.code,
      }
    }

    // OUTパラメータの場合、dataは配列ではなく単一オブジェクト
    if (!data) {
      return {
        success: false,
        error: '投稿IDが取得できませんでした',
      }
    }

    const result = Array.isArray(data) ? data[0] : data
    if (status === 'draft') {
      console.log('[Draft] 保存された')
    } else {
      console.log('[Draft] 公開された')
    }
    return {
      success: true,
      postId: result.out_post_id || result.post_id,
      createdAt: result.out_created_at || result.created_at,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}

export async function updateRecoveryPost(
  postId: string,
  input: CreateRecoveryPostInput
): Promise<
  | { success: true; postId: string; updatedAt: string }
  | { success: false; error: string; errorCode?: string }
> {
  // フロント側バリデーション（二重防御）
  const validationResult = createRecoveryPostSchema.safeParse(input)
  
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0]
    return {
      success: false,
      error: firstError?.message || 'バリデーションエラーが発生しました',
    }
  }

  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: 'ログインが必要です',
    }
  }

  try {
    const { data, error } = await supabase.rpc('update_recovery_post', {
      p_post_id: postId,
      p_title: input.title,
      p_summary: input.summary,
      p_problem_category: input.problemCategory,
      p_phase_at_post: input.phaseAtPost,
      p_started_at: input.startedAt || null,
      p_recovered_at: input.recoveredAt || null,
      p_current_status: input.currentStatus,
      p_steps: input.steps,
      p_region_ids: input.regionIds,
      p_tag_names: input.tagNames,
      p_age_at_that_time: input.ageAtThatTime || null,
      p_debt_amount: input.debtAmount || null,
      p_unemployed_months: input.unemployedMonths || null,
      p_recovery_months: input.recoveryMonths || null,
      p_initial_misconception: input.initialMisconception || null,
      p_status: input.status ?? null,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: getUserErrorMessage(error),
        errorCode: error.code,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '投稿IDが取得できませんでした',
      }
    }

    if (input.status === 'draft') {
      console.log('[Draft] 保存された')
    } else if (input.status === 'published') {
      console.log('[Draft] 公開された')
    }

    const result = data[0]
    return {
      success: true,
      postId: result.post_id,
      updatedAt: result.updated_at,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}

export async function deleteRecoveryPost(
  postId: string
): Promise<
  | { success: true; postId: string; deletedAt: string }
  | { success: false; error: string; errorCode?: string }
> {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'ログインが必要です',
    }
  }

  try {
    // RPC関数を呼び出し（TABLE型の戻り値）
    const { data, error } = await supabase.rpc('delete_recovery_post', {
      p_post_id: postId,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: getUserErrorMessage(error),
        errorCode: error.code,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '削除に失敗しました',
      }
    }

    console.log('[Draft] 削除された')
    const result = data[0]
    return {
      success: true,
      postId: result.post_id,
      deletedAt: result.deleted_at,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}

export async function restoreRecoveryPost(
  postId: string
): Promise<
  | { success: true; postId: string; restoredAt: string }
  | { success: false; error: string; errorCode?: string }
> {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'ログインが必要です',
    }
  }

  try {
    // RPC関数を呼び出し（TABLE型の戻り値）
    const { data, error } = await supabase.rpc('restore_recovery_post', {
      p_post_id: postId,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: getUserErrorMessage(error),
        errorCode: error.code,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '復元に失敗しました',
      }
    }

    const result = data[0]
    return {
      success: true,
      postId: result.post_id,
      restoredAt: result.restored_at,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}
