/**
 * 表示制御の純関数層
 * 「誰が何を見れるか」のロジックを集約
 * 
 * 将来の拡張:
 * - Edge Function
 * - 外部API
 * に出す時にコピーが必要になるため、純関数として分離
 */

import type { PhaseLevel } from '@/lib/utils/phase'
import { PHASE_VISIBILITY_CONFIG } from './phase-visibility'

export interface PostVisibilityConfig {
  canViewFullContent: boolean // 全文を表示できるか
  canViewSummary: boolean // 要約を表示できるか
  showUpgradeMessage: boolean // アップグレードメッセージを表示するか
  isSummaryOnly: boolean // RPC側のis_summary_onlyフラグ（API直叩き対策）
}

/**
 * ユーザーのフェーズレベルに基づいて、投稿の表示制御を判定
 * 
 * @param userPhaseLevel ユーザーのフェーズレベル（nullの場合は匿名ユーザー = Lv1扱い）
 * @param postPhaseLevel 投稿のフェーズレベル
 * @returns 表示制御情報
 */
export function calculatePostVisibility(
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
      isSummaryOnly: true, // RPC側でも制御
    }
  }

  // Lv2以上は全投稿の全文を見られる
  if (userLevel >= 2) {
    return {
      canViewFullContent: true,
      canViewSummary: true,
      showUpgradeMessage: false,
      isSummaryOnly: false,
    }
  }

  // Lv1ユーザーがLv1/Lv2投稿を見る場合
  return {
    canViewFullContent: true,
    canViewSummary: true,
    showUpgradeMessage: false,
    isSummaryOnly: false,
  }
}

/**
 * RPC側のis_summary_onlyフラグを考慮した表示制御
 * RPC側の制御を優先（API直叩き対策）
 */
export function getPostVisibilityWithRPCFlag(
  userPhaseLevel: PhaseLevel | null,
  postPhaseLevel: PhaseLevel,
  rpcIsSummaryOnly: boolean
): PostVisibilityConfig {
  // RPC側の制御を優先
  if (rpcIsSummaryOnly) {
    return {
      canViewFullContent: false,
      canViewSummary: true,
      showUpgradeMessage: true,
      isSummaryOnly: true,
    }
  }

  // RPC側が全文表示を許可している場合、クライアント側のロジックも確認
  return calculatePostVisibility(userPhaseLevel, postPhaseLevel)
}
