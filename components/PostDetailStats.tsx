/**
 * [B] 当時の状況（数字ゾーン）
 * Re:Start Atlasの核。数字は事実、感情はまだ出さない
 */

import type { PostDetail } from '@/lib/types/post-detail'
import { formatSearchFields } from '@/lib/utils/format'

interface PostDetailStatsProps {
  post: PostDetail
}

export default function PostDetailStats({ post }: PostDetailStatsProps) {
  const stats = formatSearchFields(
    post.age_at_that_time,
    post.debt_amount,
    post.unemployed_months,
    post.recovery_months,
    post.problem_category
  )

  const statItems: Array<{ label: string; value: string }> = []

  // 年齢（未入力の場合は表示しない。—は出さない）
  if (stats.age) {
    statItems.push({ label: '当時の年齢', value: stats.age })
  }

  // 借金額 or 無職期間（未入力の場合は表示しない）
  if (stats.amount) {
    statItems.push({ 
      label: post.problem_category === 'debt' ? '借金額' : '無職期間', 
      value: stats.amount 
    })
  }

  // 回復期間（未入力の場合は表示しない）
  if (stats.period) {
    statItems.push({ label: '回復期間', value: stats.period })
  }

  // 数字が1つもない場合はセクション全体を非表示
  if (statItems.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        当時の状況
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {item.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
