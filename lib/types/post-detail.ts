/**
 * 投稿詳細ページ用の型定義
 * 7ブロック構成の詳細ページ用
 */

import type { problem_category_enum } from '@/lib/supabase/types'

export interface RecoveryStepDetail {
  order: number
  content: string
  isFailure: boolean
  failedReason?: string | null
}

export interface PostDetail {
  id: string
  title: string
  summary: string
  problem_category: problem_category_enum
  phase_at_post: number
  started_at: string | null
  recovered_at: string | null
  current_status: string
  created_at: string
  updated_at: string
  // 検索特化フィールド
  age_at_that_time: number | null
  debt_amount: number | null
  unemployed_months: number | null
  recovery_months: number | null
  // 地域・タグ
  region_names: string[]
  tag_names: string[]
  // 表示制御
  is_summary_only: boolean
  // ステップ
  steps: RecoveryStepDetail[]
}
