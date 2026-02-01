/**
 * 回復投稿作成用の型定義
 * DB構造をそのままUIに漏らさない設計
 */

export type ProblemCategory = 
  | 'debt' 
  | 'unemployed' 
  | 'dropout' 
  | 'addiction' 
  | 'relationship'

export type PhaseLevel = 1 | 2 | 3

export interface RecoveryStep {
  order: number
  content: string
  isFailure: boolean
  failedReason?: string | null // 失敗した理由（「やってはいけない地雷マップ」用）
}

export interface CreateRecoveryPostInput {
  title: string
  summary: string
  problemCategory: ProblemCategory
  phaseAtPost: PhaseLevel
  startedAt?: string | null
  recoveredAt?: string | null
  currentStatus: string

  steps: RecoveryStep[]
  regionIds: number[]
  tagNames: string[] // '#なし'で保存（例: '25歳', '借金300万'）

  // 検索特化フィールド（SEO用）
  ageAtThatTime?: number | null // その時の年齢
  debtAmount?: number | null // 借金額（万円単位）
  unemployedMonths?: number | null // 無職期間（月単位）
  recoveryMonths?: number | null // 回復期間（月単位）
}
