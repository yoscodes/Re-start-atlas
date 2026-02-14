/**
 * 通報関連の型定義
 */

export type ReportReason = 
  | 'harassment'  // ハラスメント
  | 'hate'        // ヘイト
  | 'personal_info' // 個人情報の過剰露出
  | 'spam'        // スパム
  | 'other'       // その他

export interface ReportPostInput {
  postId: string
  reason: ReportReason
  note?: string | null
}
