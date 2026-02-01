/**
 * フェーズインジケーターコンポーネント
 * ユーザーの現在のフェーズを表示（「自分は今どこにいるか」を可視化）
 */

import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'

interface PhaseIndicatorProps {
  level: PhaseLevel | null
  className?: string
}

export default function PhaseIndicator({ level, className = '' }: PhaseIndicatorProps) {
  if (!level) {
    return null // 匿名ユーザーは表示しない
  }

  const config = getPhaseConfig(level)

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${config.color.bg} ${config.color.border} ${className}`}>
      <span className="text-lg">{config.icon}</span>
      <div>
        <div className={`text-sm font-semibold ${config.color.text}`}>
          {config.label}
        </div>
        <div className={`text-xs ${config.color.text} opacity-75`}>
          {config.description}
        </div>
      </div>
    </div>
  )
}
