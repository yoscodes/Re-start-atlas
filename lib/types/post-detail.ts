/**
 * 投稿詳細ページ用の型定義
 * 7ブロック構成の詳細ページ用
 */

import type { problem_category_enum } from '@/lib/supabase/types'

export interface RecoveryStepDetail {
  order: number
  content: string
  isFailure: boolean
  // 失敗理由の軽い構造化（v1）
  /** 失敗理由のタイプ（選択式、4〜5個のみ）。分析用であって、分類ではない。 */
  failedReasonType?: string | null
  /** 
   * 失敗理由の詳細（自由記述）。
   * **正の一次データ（今後の基準）**。v2以降はこちらを優先的に使用する。
   */
  failedReasonDetail?: string | null
  /** 
   * 失敗理由（legacy / 表示互換用）。
   * 既存データの後方互換性のため残す。新規作成時は使用しない。
   * UI表示は `failedReasonDetail` を優先し、なければ `failedReason` を表示。
   */
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
  // 最初に誤解していたこと（1投稿につき最大1つ）
  initial_misconception: string | null
  // draft=下書き, published=公開
  status: 'draft' | 'published'
  // 非公開フラグ（管理者・システム主導のみ）
  is_hidden: boolean
  // ステップ
  steps: RecoveryStepDetail[]
}
