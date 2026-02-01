/**
 * [E] 転機ポイント（強調ブロック）
 * 1つだけ太字で強調。考え方が変わった瞬間
 * 
 * 注意: 現時点では steps から抽出する想定。
 * 将来的に専用フィールドを追加する想定
 */

import type { RecoveryStepDetail } from '@/lib/types/post-detail'

interface PostDetailTurningPointProps {
  steps: RecoveryStepDetail[]
  isBlurred?: boolean
}

export default function PostDetailTurningPoint({ 
  steps, 
  isBlurred = false 
}: PostDetailTurningPointProps) {
  // 転機ポイントは最初の成功ステップを想定（将来的に専用フィールドで指定）
  const turningPoint = steps.find(step => !step.isFailure && step.order > 1)

  if (!turningPoint) {
    return null
  }

  return (
    <div className={`mb-8 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        転機ポイント
      </h2>
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border-2 border-amber-300 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
            {turningPoint.content}
          </p>
        </div>
      </div>
    </div>
  )
}
