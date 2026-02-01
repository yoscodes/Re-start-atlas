/**
 * 投稿一覧アイテムコンポーネント（6ブロック構成）
 * 設計原則: 読ませない、判断させる、信用を瞬時に伝える
 */

import Link from 'next/link'
import type { PostListItem } from '@/lib/types/post-list'
import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'
import { getPostVisibilityWithRPCFlag } from '@/lib/domain/visibility'
import { getRelativeTime, getCreditScoreRank, formatSearchFields } from '@/lib/utils/format'

interface PostListItemProps {
  post: PostListItem
  userPhaseLevel?: PhaseLevel | null
}

const problemCategoryLabels: Record<string, string> = {
  debt: '借金',
  unemployed: '失業',
  dropout: '中退',
  addiction: '依存症',
  relationship: '人間関係',
}

export default function PostListItem({ post, userPhaseLevel }: PostListItemProps) {
  const phaseConfig = getPhaseConfig(post.phase_at_post as PhaseLevel)
  const visibility = getPostVisibilityWithRPCFlag(
    userPhaseLevel ?? null,
    post.phase_at_post as PhaseLevel,
    post.is_summary_only
  )

  // フェーズ別UI微調整（投稿のフェーズ = phase_at_post のみ使用。author_phase_level は一覧では出さない）
  const isLv3Post = post.phase_at_post === 3
  const isLv1User = (userPhaseLevel ?? 1) === 1

  // Lv1ユーザーが見るLv3カードは背景をうっすらグレーに
  const cardBgClass = isLv1User && isLv3Post
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

  return (
    <Link
      href={`/posts/${post.id}`}
      className={`block rounded-lg border-l-4 transition-all hover:shadow-lg ${
        phaseConfig.color.border
      } ${cardBgClass} ${isLv1User && isLv3Post ? 'opacity-90' : ''}`}
    >
      <div className="p-5">
        {/* ① ヘッダー行（瞬間理解ゾーン） */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* フェーズバッジ（視線を止める） */}
            <span className={`px-2 py-1 text-xs font-bold rounded border ${phaseConfig.color.badge}`}>
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
          </div>
        </div>

        {/* ② タイトル（最重要・2行まで） */}
        <h2 className={`text-lg font-bold mb-2 line-clamp-2 ${phaseConfig.color.text}`}>
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
          <p className={`text-sm mb-3 line-clamp-2 ${phaseConfig.color.text} opacity-90`}>
            {post.summary}
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
        {(searchFields.age || searchFields.amount || searchFields.period) && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
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
