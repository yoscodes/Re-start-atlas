'use server'

/**
 * Server Action: 投稿一覧・検索
 * RPC関数を呼び出して投稿一覧を取得
 */

import { createClient } from '@/lib/supabase/server'
import type { GetRecoveryPostsParams, GetRecoveryPostsResult } from '@/lib/types/post-list'

export async function getRecoveryPosts(
  params: GetRecoveryPostsParams = {}
): Promise<GetRecoveryPostsResult> {
  const supabase = await createClient()

  try {
    const {
      regionIds = null,
      tagNames = null,
      problemCategory = null,
      phaseAtPost = null,
      keyword = null,
      sort = 'new',
      limit = 20,
      offset = 0,
      cursorCreatedAt = null,
      cursorId = null,
      userPhaseLevel = null,
    } = params

    // ユーザーのフェーズレベルを取得（表示制御用・API直叩き対策）
    let actualUserPhaseLevel = userPhaseLevel
    if (actualUserPhaseLevel === null || actualUserPhaseLevel === undefined) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('phase_level')
          .eq('id', user.id)
          .single()
        actualUserPhaseLevel = userProfile?.phase_level ?? null
      }
    }

    // 次のページがあるかチェックするため、limit + 1件取得
    const fetchLimit = limit + 1

    // RPC関数を呼び出し（表示制御をRPC側で実装）
    const { data, error } = await supabase.rpc('get_recovery_posts', {
      p_region_ids: regionIds && regionIds.length > 0 ? regionIds : null,
      p_tag_names: tagNames && tagNames.length > 0 ? tagNames : null,
      p_problem_category: problemCategory,
      p_phase_at_post: phaseAtPost,
      p_keyword: keyword || null,
      p_sort: sort,
      p_limit: fetchLimit,
      p_offset: offset,
      p_cursor_created_at: cursorCreatedAt || null,
      p_cursor_id: cursorId || null,
      p_user_phase_level: actualUserPhaseLevel,
    })

    if (error) {
      console.error('RPC Error:', error)
      return {
        success: false,
        error: error.message || '投稿一覧の取得に失敗しました',
      }
    }

    // 次のページがあるかチェック（limit + 1件取得して判定）
    const hasMore = data ? data.length > limit : false
    const posts = data ? data.slice(0, limit) : []

    // 条件一致投稿数を取得（検索メタデータ用）
    // フィルタが有効な場合のみ取得（パフォーマンス考慮）
    let totalCount: number | undefined = undefined
    const hasActiveFilters = 
      problemCategory || 
      phaseAtPost !== null || 
      keyword || 
      (regionIds && regionIds.length > 0) || 
      (tagNames && tagNames.length > 0)

    if (hasActiveFilters) {
      const { data: countData, error: countError } = await supabase.rpc('get_recovery_posts_count', {
        p_region_ids: regionIds && regionIds.length > 0 ? regionIds : null,
        p_tag_names: tagNames && tagNames.length > 0 ? tagNames : null,
        p_problem_category: problemCategory,
        p_phase_at_post: phaseAtPost,
        p_keyword: keyword || null,
      })

      if (!countError && countData !== null) {
        totalCount = countData
      }
    }

    return {
      success: true,
      posts: posts as any[], // RPC関数の戻り値型をそのまま使用
      hasMore,
      totalCount,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}
