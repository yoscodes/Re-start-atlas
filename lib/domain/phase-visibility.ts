/**
 * フェーズ制御の境界値とロック文言の定数定義
 * 「どこまで見せるか」を定数化することで、将来の拡張（Lv0/Lv4追加）に耐える
 */

import type { PhaseLevel } from '@/lib/utils/phase'

/**
 * フェーズ制御の境界値
 * sectionLevel >= LOCK_LEVEL のセクションは、is_summary_only時にぼかし表示
 */
export const PHASE_VISIBILITY_CONFIG = {
  /** C以降（詰んだ理由以降）をロックする境界値 */
  LOCK_LEVEL: 3, // C, D, E, F, G をロック（A=1, B=2, C=3, ...）
  
  /** 各セクションのレベル定義 */
  SECTION_LEVELS: {
    HEADER: 1,      // [A] ヘッダー
    STATS: 2,       // [B] 当時の状況
    REASON: 3,      // [C] 詰んだ理由
    STEPS: 4,       // [D] 行動ログ
    TURNING_POINT: 5, // [E] 転機ポイント
    CURRENT_STATUS: 6, // [F] 今の状態
    MESSAGE: 7,     // [G] 過去の自分へ
  },
} as const

/**
 * ロック文言（固定文）
 * 文言が変わるとスクショ・SNS・比較でブレるため、定数化
 */
export const PHASE_LOCK_MESSAGE = {
  title: '🔒 この先は、今のフェーズでは閲覧できません',
  description: 'あなたが進めば、必ず見られます',
} as const

/**
 * セクションをぼかすかどうかを判定
 * 
 * @param isSummaryOnly RPC側のis_summary_onlyフラグ
 * @param sectionLevel セクションのレベル（SECTION_LEVELS参照）
 * @returns ぼかし表示するかどうか
 */
export function shouldBlurSection(
  isSummaryOnly: boolean,
  sectionLevel: number
): boolean {
  if (!isSummaryOnly) {
    return false
  }
  
  return sectionLevel >= PHASE_VISIBILITY_CONFIG.LOCK_LEVEL
}
