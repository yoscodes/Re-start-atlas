'use server'

/**
 * Server Action: ユーザー統計・信用スコア取得
 */

import { createClient } from '@/lib/supabase/server'
import type { UserStats, UserCreditScore } from '@/lib/types/user-stats'

/**
 * ユーザーの統計を取得
 */
export async function getUserStats(
  userId: string
): Promise<{ success: true; stats: UserStats } | { success: false; error: string }> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user stats:', error)
      return {
        success: false,
        error: error.message || '統計の取得に失敗しました',
      }
    }

    if (!data) {
      // 統計が存在しない場合は初期値を作成
      return {
        success: true,
        stats: {
          user_id: userId,
          published_posts_count: 0,
          reactions_received: 0,
          recovery_completed: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      }
    }

    return {
      success: true,
      stats: data as UserStats,
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
 * ユーザーの信用スコアを取得
 */
export async function getUserCreditScore(
  userId: string
): Promise<{ success: true; creditScore: UserCreditScore } | { success: false; error: string }> {
  const supabase = await createClient()

  try {
    // 統計を取得
    const statsResult = await getUserStats(userId)
    if (!statsResult.success) {
      return statsResult
    }

    const stats = statsResult.stats

    // 信用スコアを計算
    const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_credit_score', {
      p_user_id: userId,
    })

    if (scoreError) {
      console.error('Error calculating credit score:', scoreError)
      // RPC関数が失敗しても、手動計算で対応
      const score =
        stats.published_posts_count * 10 +
        stats.reactions_received * 5 +
        (stats.recovery_completed ? 100 : 0)

      return {
        success: true,
        creditScore: {
          userId,
          score,
          stats,
          breakdown: {
            postsScore: stats.published_posts_count * 10,
            reactionsScore: stats.reactions_received * 5,
            recoveryScore: stats.recovery_completed ? 100 : 0,
          },
        },
      }
    }

    const score = scoreData as number

    return {
      success: true,
      creditScore: {
        userId,
        score,
        stats,
        breakdown: {
          postsScore: stats.published_posts_count * 10,
          reactionsScore: stats.reactions_received * 5,
          recoveryScore: stats.recovery_completed ? 100 : 0,
        },
      },
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    }
  }
}
