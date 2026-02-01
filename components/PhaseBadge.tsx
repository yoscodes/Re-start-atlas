/**
 * フェーズバッジコンポーネント
 * フェーズ階級を視覚的に表示
 */

import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'

interface PhaseBadgeProps {
  level: PhaseLevel
  showIcon?: boolean
  className?: string
}

export default function PhaseBadge({ level, showIcon = true, className = '' }: PhaseBadgeProps) {
  const config = getPhaseConfig(level)

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${config.color.badge} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  )
}
