/**
 * フェーズ（階級）関連のユーティリティ
 * UI上の階級として機能させる
 */

export type PhaseLevel = 1 | 2 | 3

export interface PhaseConfig {
  level: PhaseLevel
  label: string
  description: string
  color: {
    bg: string
    text: string
    border: string
    badge: string
  }
  icon: string
}

/**
 * フェーズ設定
 */
export const PHASE_CONFIGS: Record<PhaseLevel, PhaseConfig> = {
  1: {
    level: 1,
    label: 'フェーズ1',
    description: '安心色・スタート地点',
    color: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-700',
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
    },
    icon: '🌱',
  },
  2: {
    level: 2,
    label: 'フェーズ2',
    description: '行動色・成長中',
    color: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    },
    icon: '🚀',
  },
  3: {
    level: 3,
    label: 'フェーズ3',
    description: '導く側・メンター',
    color: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-700',
      badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    },
    icon: '⭐',
  },
}

/**
 * フェーズレベルから設定を取得
 */
export function getPhaseConfig(level: PhaseLevel): PhaseConfig {
  return PHASE_CONFIGS[level]
}

/**
 * フェーズバッジのクラス名を取得
 */
export function getPhaseBadgeClass(level: PhaseLevel): string {
  return PHASE_CONFIGS[level].color.badge
}

/**
 * フェーズ背景色のクラス名を取得
 */
export function getPhaseBgClass(level: PhaseLevel): string {
  return PHASE_CONFIGS[level].color.bg
}

/**
 * フェーズテキスト色のクラス名を取得
 */
export function getPhaseTextClass(level: PhaseLevel): string {
  return PHASE_CONFIGS[level].color.text
}

/**
 * フェーズボーダー色のクラス名を取得
 */
export function getPhaseBorderClass(level: PhaseLevel): string {
  return PHASE_CONFIGS[level].color.border
}

/**
 * ユーザーのフェーズレベルに基づいて、投稿の表示制御を判定
 * 
 * @deprecated この関数は lib/domain/visibility.ts に移動しました。
 * 新しいコードでは getPostVisibilityWithRPCFlag を使用してください。
 * 
 * @param userPhaseLevel ユーザーのフェーズレベル（nullの場合は匿名ユーザー = Lv1扱い）
 * @param postPhaseLevel 投稿のフェーズレベル
 * @returns 表示制御情報
 */
export interface PostVisibilityConfig {
  canViewFullContent: boolean // 全文を表示できるか
  canViewSummary: boolean // 要約を表示できるか
  showUpgradeMessage: boolean // アップグレードメッセージを表示するか
}

export function getPostVisibility(
  userPhaseLevel: PhaseLevel | null,
  postPhaseLevel: PhaseLevel
): PostVisibilityConfig {
  const userLevel = userPhaseLevel ?? 1 // 匿名ユーザーはLv1扱い

  // Lv1ユーザーはLv3投稿の全文を見られない
  if (userLevel === 1 && postPhaseLevel === 3) {
    return {
      canViewFullContent: false,
      canViewSummary: true,
      showUpgradeMessage: true,
    }
  }

  // Lv2以上は全投稿の全文を見られる
  if (userLevel >= 2) {
    return {
      canViewFullContent: true,
      canViewSummary: true,
      showUpgradeMessage: false,
    }
  }

  // Lv1ユーザーがLv1/Lv2投稿を見る場合
  return {
    canViewFullContent: true,
    canViewSummary: true,
    showUpgradeMessage: false,
  }
}

/**
 * フェーズアップグレードメッセージを取得
 */
export function getPhaseUpgradeMessage(currentLevel: PhaseLevel | null, targetLevel: PhaseLevel): string {
  const current = currentLevel ?? 1
  const target = PHASE_CONFIGS[targetLevel]

  if (current < targetLevel) {
    return `${target.label}になると、より高度な投稿の全文を閲覧できます。`
  }

  return ''
}
