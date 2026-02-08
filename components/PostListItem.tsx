/**
 * 投稿一覧アイテムコンポーネント（6ブロック構成）
 * 設計原則: 読ませない、判断させる、信用を瞬時に伝える
 */

import Link from 'next/link'
import type { PostListItem } from '@/lib/types/post-list'
import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'
import { getPostVisibilityWithRPCFlag } from '@/lib/domain/visibility'
import { getRelativeTime, getCreditScoreRank, formatSearchFields } from '@/lib/utils/format'
import { getConditionPopularity } from '@/lib/utils/search-description'

interface PostListItemProps {
  post: PostListItem
  userPhaseLevel?: PhaseLevel | null
  totalCount?: number // 条件一致投稿数（検索メタデータ用）
}

const problemCategoryLabels: Record<string, string> = {
  debt: '借金',
  unemployed: '失業',
  dropout: '中退',
  addiction: '依存症',
  relationship: '人間関係',
}

export default function PostListItem({ post, userPhaseLevel, totalCount }: PostListItemProps) {
  const phaseConfig = getPhaseConfig(post.phase_at_post as PhaseLevel)
  const visibility = getPostVisibilityWithRPCFlag(
    userPhaseLevel ?? null,
    post.phase_at_post as PhaseLevel,
    post.is_summary_only
  )

  // フェーズ別UI微調整（投稿のフェーズ = phase_at_post のみ使用。author_phase_level は一覧では出さない）
  const isLv3Post = post.phase_at_post === 3
  const isLv1User = (userPhaseLevel ?? 1) === 1
  const hasPhaseGap = isLv1User && isLv3Post // フェーズ差がある投稿

  // Lv1ユーザーが見るLv3カードは背景をうっすらグレーに
  const cardBgClass = hasPhaseGap
    ? 'bg-gray-50 dark:bg-gray-900/50'
    : phaseConfig.color.bg

  // 検索特化フィールドの表示
  const searchFields = formatSearchFields(
    post.age_at_that_time,
    post.debt_amount,
    post.unemployed_months,
    post.recovery_months,
    post.problem_category
  )

  // 信用スコアランク
  const creditRank = getCreditScoreRank(post.author_credit_score)

  // 条件一致投稿数の多さに基づくバッジ
  const conditionPopularity = getConditionPopularity(totalCount)

  return (
    <Link
      href={`/posts/${post.id}`}
      className={`block rounded-lg border-l-4 transition-all hover:shadow-lg group ${
        phaseConfig.color.border
      } ${cardBgClass} ${hasPhaseGap ? 'opacity-90' : ''}`}
    >
      <div className="p-5">
        {/* ① ヘッダー行（瞬間理解ゾーン） */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* フェーズバッジ（視線を止める） */}
            {/* フェーズ差がある投稿はアウトライン表示、hover時に通常表示 */}
            <span
              className={`px-2 py-1 text-xs font-bold rounded border transition-all ${
                hasPhaseGap
                  ? 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 group-hover:border-gray-400 dark:group-hover:border-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                  : phaseConfig.color.badge
              }`}
            >
              {phaseConfig.icon} {phaseConfig.label}
            </span>
            {/* カテゴリ */}
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {problemCategoryLabels[post.problem_category] || post.problem_category}
            </span>
            {/* 地域（小さく） */}
            {post.region_names.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {post.region_names[0]}
              </span>
            )}
            {/* 「似た条件が多い順」バッジ */}
            {conditionPopularity.label && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  conditionPopularity.isPopular
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {conditionPopularity.label}
              </span>
            )}
          </div>
        </div>

        {/* ② タイトル（最重要・2行まで） */}
        <h2
          className={`text-lg font-bold mb-2 line-clamp-2 transition-all ${
            hasPhaseGap
              ? 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
              : phaseConfig.color.text
          }`}
        >
          {post.title}
        </h2>

        {/* ③ サマリー（フェーズ制御連動） */}
        {visibility.isSummaryOnly ? (
          <div className="mb-3">
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 border border-gray-300 dark:border-gray-700">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-gray-500 dark:text-gray-400">🔒</span>
                <p className={`text-sm line-clamp-2 ${phaseConfig.color.text} opacity-75`}>
                  {post.summary}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                この投稿は現在サマリーのみ閲覧可能です
              </p>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm mb-3 line-clamp-2 transition-all ${
              hasPhaseGap
                ? 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white opacity-75 group-hover:opacity-90'
                : `${phaseConfig.color.text} opacity-90`
            }`}
          >
            {post.summary}
          </p>
        )}

        {/* ①-1 要約のみ閲覧可能ラベル（条件付き） */}
        {post.is_summary_only && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            要約のみ閲覧可能
          </p>
        )}

        {/* ④ リアクション・信用ゾーン（横一列） */}
        <div className="flex items-center gap-3 mb-3 text-xs">
          {/* 失敗あり */}
          {post.failed_step_count > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span>🔥</span>
              <span>失敗あり</span>
            </span>
          )}
          {/* コメント数 */}
          {post.comment_count > 0 && (
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <span>💬</span>
              <span>{post.comment_count}</span>
            </span>
          )}
          {/* リアクション数（将来 v2 で reaction_type 別表示の布石） */}
          {post.reaction_count > 0 && (
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <span>👍</span>
              <span>{post.reaction_count}</span>
            </span>
          )}
          {/* 信用ランクのみ（一覧では数値は出さない。詳細・管理で数値） */}
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span>⭐</span>
            <span>{creditRank}</span>
          </span>
        </div>

        {/* ⑤ 検索特化フィールド（SEO×人間理解・最大3つまで） */}
        {/* フェーズ差がある投稿は数字をやや薄く、hover時に通常表示 */}
        {(searchFields.age || searchFields.amount || searchFields.period) && (
          <div
            className={`flex items-center gap-2 mb-3 text-xs flex-wrap transition-all ${
              hasPhaseGap
                ? 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {searchFields.age && <span>{searchFields.age}</span>}
            {searchFields.amount && <span>/</span>}
            {searchFields.amount && <span>{searchFields.amount}</span>}
            {searchFields.period && <span>/</span>}
            {searchFields.period && <span>{searchFields.period}</span>}
          </div>
        )}

        {/* ⑥ フッター（人間味ゾーン） */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            by {post.author_display_name || '匿名ユーザー'}
          </span>
          <span>{getRelativeTime(post.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
