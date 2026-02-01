/**
 * ユーザー統計・信用スコア関連の型定義
 */

export interface UserStats {
  user_id: string
  published_posts_count: number
  reactions_received: number
  recovery_completed: boolean
  updated_at: string
  created_at: string
}

export interface UserCreditScore {
  userId: string
  score: number
  stats: UserStats
  breakdown: {
    postsScore: number // 投稿数 × 10
    reactionsScore: number // リアクション数 × 5
    recoveryScore: number // 回復完了 × 100
  }
}
