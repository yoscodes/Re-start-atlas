/**
 * 投稿一覧用の型定義
 */

import type { problem_category_enum } from '@/lib/supabase/types'

export interface PostListItem {
  id: string
  title: string
  summary: string
  problem_category: problem_category_enum
  phase_at_post: number
  started_at: string | null
  current_status: string
  region_names: string[]
  tag_names: string[]
  step_count: number
  failed_step_count: number
  created_at: string
  // 検索特化フィールド（SEO用）
  age_at_that_time: number | null
  debt_amount: number | null
  unemployed_months: number | null
  recovery_months: number | null
  // 表示制御（フェーズ階級システム）
  is_summary_only: boolean
  // cursor pagination用
  next_cursor_created_at?: string | null
  next_cursor_id?: string | null
  // UI用データ
  comment_count: number
  /** リアクション合算数。将来 v2 で reaction_type（enum）を想定し、UIでは合算でもOK */
  reaction_count: number
  author_display_name: string
  /** 投稿者の現在フェーズ。一覧では出さない（権威より再現性）。詳細・プロフで明示 */
  author_phase_level: number
  /** 一覧ではランク（S/A/B）のみ表示。数値は詳細・管理画面で使用 */
  author_credit_score: number
}

export interface GetRecoveryPostsParams {
  regionIds?: number[] | null
  tagNames?: string[] | null
  problemCategory?: problem_category_enum | null
  phaseAtPost?: number | null
  keyword?: string | null
  sort?: 'new' | 'old'
  limit?: number
  offset?: number
  // cursor pagination（将来対応用）
  cursorCreatedAt?: string | null
  cursorId?: string | null
  // フェーズ表示制御（API直叩き対策）
  userPhaseLevel?: number | null
}

export type GetRecoveryPostsResult =
  | {
      success: true
      posts: PostListItem[]
      hasMore: boolean
      totalCount?: number // 条件一致投稿数（検索メタデータ用）
    }
  | {
      success: false
      error: string
    }
