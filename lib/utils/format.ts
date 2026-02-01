/**
 * フォーマット用ユーティリティ
 */

/**
 * 相対日時を取得（例: 3日前、1時間前）
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffYear > 0) {
    return `${diffYear}年前`
  }
  if (diffMonth > 0) {
    return `${diffMonth}ヶ月前`
  }
  if (diffDay > 0) {
    return `${diffDay}日前`
  }
  if (diffHour > 0) {
    return `${diffHour}時間前`
  }
  if (diffMin > 0) {
    return `${diffMin}分前`
  }
  return 'たった今'
}

/**
 * 信用スコアをランク表示に変換（一覧用）。
 * 表示ルール: 一覧=ランクのみ / 詳細=数値 / 管理=完全数値（数字は競争を生むため、回復の場では一覧では出さない）
 */
export function getCreditScoreRank(score: number): string {
  if (score >= 500) return 'S'
  if (score >= 300) return 'A'
  if (score >= 200) return 'B'
  if (score >= 100) return 'C'
  return 'D'
}

/**
 * 検索特化フィールドの表示用文字列を生成
 */
export interface SearchFieldsDisplay {
  age?: string
  amount?: string
  period?: string
}

export function formatSearchFields(
  ageAtThatTime: number | null,
  debtAmount: number | null,
  unemployedMonths: number | null,
  recoveryMonths: number | null,
  problemCategory: string
): SearchFieldsDisplay {
  const fields: SearchFieldsDisplay = {}

  // 年齢
  if (ageAtThatTime !== null) {
    fields.age = `${ageAtThatTime}代`
  }

  // 借金額 or 無職期間
  if (problemCategory === 'debt' && debtAmount !== null) {
    fields.amount = `借金${debtAmount}万`
  } else if (problemCategory === 'unemployed' && unemployedMonths !== null) {
    if (unemployedMonths >= 12) {
      fields.amount = `無職${Math.floor(unemployedMonths / 12)}年以上`
    } else {
      fields.amount = `無職${unemployedMonths}ヶ月`
    }
  }

  // 回復期間
  if (recoveryMonths !== null) {
    if (recoveryMonths >= 12) {
      fields.period = `回復${Math.floor(recoveryMonths / 12)}年`
    } else {
      fields.period = `回復${recoveryMonths}ヶ月`
    }
  }

  return fields
}
