/**
 * [D] 行動ログ（心臓部）
 * recovery_steps を時系列で表示
 * 失敗ステップは「くすんだオレンジ」で表示
 */

import type { RecoveryStepDetail } from '@/lib/types/post-detail'

interface PostDetailStepsProps {
  steps: RecoveryStepDetail[]
  isBlurred?: boolean
}

export default function PostDetailSteps({ steps, isBlurred = false }: PostDetailStepsProps) {
  if (steps.length === 0) {
    return null
  }

  return (
    <div className={`mb-8 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        行動ログ
      </h2>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`relative pl-6 pb-4 border-l-2 ${
              step.isFailure
                ? 'border-orange-400 dark:border-orange-600'
                : 'border-green-400 dark:border-green-600'
            }`}
          >
            {/* ステップ番号 */}
            <div
              className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.isFailure
                  ? 'bg-orange-400 dark:bg-orange-600 text-white'
                  : 'bg-green-400 dark:bg-green-600 text-white'
              }`}
            >
              {step.order}
            </div>

            {/* 成功/失敗バッジ */}
            <div className="flex items-center gap-2 mb-2">
              {step.isFailure ? (
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700">
                  🔥 失敗
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded border border-green-300 dark:border-green-700">
                  ✓ 成功
                </span>
              )}
            </div>

            {/* 行動内容 */}
            <p className="text-gray-900 dark:text-white mb-2 whitespace-pre-wrap">
              {step.content}
            </p>

            {/* 失敗理由（失敗ステップの場合） */}
            {step.isFailure && step.failedReason && (
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-1">
                  こうなった理由:
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-wrap">
                  {step.failedReason}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
