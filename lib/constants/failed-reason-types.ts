/**
 * 失敗理由タイプの選択肢（軽い構造化用）
 * 4〜5個だけ。分析用であって、分類ではない。
 */

export const FAILED_REASON_TYPES = [
  {
    value: '情報不足',
    label: '情報不足（調べなかった）',
  },
  {
    value: '焦り',
    label: '焦り・短絡判断',
  },
  {
    value: '人に頼らなかった',
    label: '人に頼らなかった',
  },
  {
    value: '環境に甘えた',
    label: '環境に甘えた',
  },
  {
    value: 'その他',
    label: 'その他（自由記述）',
  },
] as const

export type FailedReasonType = typeof FAILED_REASON_TYPES[number]['value']
