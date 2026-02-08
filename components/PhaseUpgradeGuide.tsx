/**
 * フェーズアップ導線コンポーネント
 * ロック中セクションの直下に表示
 * 「なぜ見れないか」「どうすれば解除されるのか」を行動条件で示す
 */

import Link from 'next/link'
import { getPhaseUpgradeActions, getNextPhaseLevel, getPhaseLockReason } from '@/lib/domain/phase-upgrade'
import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'

interface PhaseUpgradeGuideProps {
  /** 現在のユーザーのフェーズレベル */
  currentPhaseLevel: PhaseLevel | null
  /** 投稿のフェーズレベル */
  postPhaseLevel: PhaseLevel
  /** ロックされているかどうか */
  isLocked: boolean
}

export default function PhaseUpgradeGuide({
  currentPhaseLevel,
  postPhaseLevel,
  isLocked,
}: PhaseUpgradeGuideProps) {
  // ロックされていない場合は表示しない
  if (!isLocked) {
    return null
  }

  const userLevel = currentPhaseLevel ?? 1
  const nextLevel = getNextPhaseLevel(currentPhaseLevel)
  
  // 次のレベルがない場合は表示しない
  if (!nextLevel) {
    return null
  }

  const upgradeActions = getPhaseUpgradeActions(currentPhaseLevel)
  const nextPhaseConfig = getPhaseConfig(nextLevel)
  
  // なぜ見れないか（固定文言）
  const lockReason = getPhaseLockReason(currentPhaseLevel)

  return (
    <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      {/* なぜ見れないか（固定文言） */}
      {lockReason && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            なぜここまでなのか
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {lockReason}
          </p>
        </div>
      )}

      {/* どうすれば解除されるのか */}
      <div>
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
          {nextPhaseConfig.label}になるために
        </h3>
        <ul className="space-y-2">
          {upgradeActions.map((action, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {action.description}
                </p>
                {action.detail && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {action.detail}
                  </p>
                )}
                {action.link && action.linkLabel && (
                  <Link
                    href={action.link}
                    className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    {action.linkLabel} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
