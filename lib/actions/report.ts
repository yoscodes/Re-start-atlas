'use server'

/**
 * Server Action: 投稿の通報
 */

import { createClient } from '@/lib/supabase/server'
import type { ReportPostInput } from '@/lib/types/report'

export async function reportPost(
  input: ReportPostInput
): Promise<
  | { success: true; reportId: string }
  | { success: false; error: string; errorCode?: string }
> {
  const supabase = await createClient()

  // バリデーション: 理由のチェック
  const validReasons: ReportPostInput['reason'][] = ['harassment', 'hate', 'personal_info', 'spam', 'other']
  if (!validReasons.includes(input.reason)) {
    return {
      success: false,
      error: '通報理由が不正です',
      errorCode: 'P4001',
    }
  }

  // バリデーション: メモの長さ（感情的に書かせない）
  if (input.note && input.note.trim().length > 500) {
    return {
      success: false,
      error: 'メモは500文字以内で入力してください',
    }
  }

  try {
    const { data, error } = await supabase.rpc('report_recovery_post', {
      p_post_id: input.postId,
      p_reason: input.reason,
      p_note: input.note?.trim() || null,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: error.message || '通報の送信に失敗しました',
        errorCode: error.code,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '通報IDが取得できませんでした',
      }
    }

    const result = Array.isArray(data) ? data[0] : data
    return {
      success: true,
      reportId: result.report_id || result.id,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}
