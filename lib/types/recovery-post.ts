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

  // 最初に誤解していたこと（1投稿につき最大1つ、投稿者が後から追記可能）
  initialMisconception?: string | null

  // draft=下書き, published=公開。新規は draft で保存 or 投稿で published。編集時も同様。
  status?: 'draft' | 'published'
}
