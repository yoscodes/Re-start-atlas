/**
 * フェーズアップの行動条件定義
 * 数字・実績ではなく、具体的な行動条件を定義
 */

import type { PhaseLevel } from '@/lib/utils/phase'

/**
 * フェーズロック理由（固定文言）
 * 比較されない、スクショされても意味が変わらない、SNSで引用されても思想が歪まない
 */
export const PHASE_LOCK_REASON: Record<PhaseLevel, string> = {
  1: 'このセクションは、回復の実体験を積んだ人のために用意されています。',
  2: 'このセクションは、他者を導く立場になった人向けの内容です。',
  3: '', // Lv3は最高レベルなので、ロック理由は不要
} as const

export interface PhaseUpgradeAction {
  /** 行動の説明 */
  description: string
  /** 行動の詳細（オプション） */
  detail?: string
  /** 行動へのリンク（オプション）最大1つまで */
  link?: string
  /** リンクのラベル */
  linkLabel?: string
}

/**
 * フェーズアップの行動条件
 * Lv1 → Lv2, Lv2 → Lv3 の条件を定義
 * 
 * ルール:
 * - 最大3つまで
 * - 並び順は「軽い → 重い」（今すぐできることが先頭）
 * - リンクは1つだけ（投稿作成のみ）
 */
export const PHASE_UPGRADE_CONDITIONS: Record<PhaseLevel, PhaseUpgradeAction[]> = {
  1: [
    {
      description: '他の投稿に共感する',
      detail: '似た状況の投稿を見つけて、リアクションを送りましょう',
    },
    {
      description: '自分の経験を投稿する',
      detail: '過去の経験を言語化することで、自分自身の状況を整理できます',
      link: '/posts/create',
      linkLabel: '投稿を作成する',
    },
    {
      description: '継続的に参加する',
      detail: '定期的にアクセスして、コミュニティに参加し続けましょう',
    },
  ],
  2: [
    {
      description: '他のユーザーと交流する',
      detail: 'コメントやリアクションを通じて、コミュニティに貢献しましょう',
    },
    {
      description: '複数の投稿を作成する',
      detail: '経験を積み重ねることで、より深い気づきが得られます',
      link: '/posts/create',
      linkLabel: '新しい投稿を作成する',
    },
    {
      description: '自分の回復プロセスを振り返る',
      detail: '過去の投稿を見直し、成長を実感することで次のステップへ進めます',
    },
  ],
  3: [
    // Lv3は最高レベルなので、アップグレード条件はなし
    // 将来的にメンター機能などが追加される可能性がある
  ],
} as const

/**
 * 次のフェーズレベルに必要な行動条件を取得
 * 
 * @param currentLevel 現在のフェーズレベル
 * @returns 次のレベルに必要な行動条件の配列（最大3つ）
 */
export function getPhaseUpgradeActions(currentLevel: PhaseLevel | null): PhaseUpgradeAction[] {
  const level = currentLevel ?? 1
  
  // Lv3は最高レベルなので、アップグレード条件はなし
  if (level >= 3) {
    return []
  }
  
  const actions = PHASE_UPGRADE_CONDITIONS[level] || []
  // 最大3つまでに制限（念のため）
  return actions.slice(0, 3)
}

/**
 * フェーズロック理由を取得（固定文言）
 * 
 * @param currentLevel 現在のフェーズレベル
 * @returns ロック理由の固定文言
 */
export function getPhaseLockReason(currentLevel: PhaseLevel | null): string {
  const level = currentLevel ?? 1
  return PHASE_LOCK_REASON[level] || ''
}

/**
 * 次のフェーズレベルを取得
 * 
 * @param currentLevel 現在のフェーズレベル
 * @returns 次のフェーズレベル（最高レベルの場合はnull）
 */
export function getNextPhaseLevel(currentLevel: PhaseLevel | null): PhaseLevel | null {
  const level = currentLevel ?? 1
  
  if (level >= 3) {
    return null
  }
  
  return (level + 1) as PhaseLevel
}
