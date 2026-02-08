/**
 * 似た状況の投稿レコメンド用の型定義
 */

import type { problem_category_enum } from '@/lib/supabase/types'

export interface SimilarPost {
  id: string
  title: string
  phase_at_post: number
  problem_category: problem_category_enum
  display_number: string | null
  display_label: string | null
}
