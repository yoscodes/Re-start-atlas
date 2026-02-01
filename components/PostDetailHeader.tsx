/**
 * [A] ヘッダー（状況の即理解）
 * フェーズバッジ、カテゴリ、地域、タイトル
 * author_phase / credit_score は出さない（権威化防止）
 */

import type { PostDetail } from '@/lib/types/post-detail'
import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'
import { getRelativeTime } from '@/lib/utils/format'

interface PostDetailHeaderProps {
  post: PostDetail
}

const problemCategoryLabels: Record<string, string> = {
  debt: '借金',
  unemployed: '失業',
  dropout: '中退',
  addiction: '依存症',
  relationship: '人間関係',
}

export default function PostDetailHeader({ post }: PostDetailHeaderProps) {
  const phaseConfig = getPhaseConfig(post.phase_at_post as PhaseLevel)

  return (
    <div className="mb-8">
      {/* フェーズバッジ・カテゴリ・地域 */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className={`px-3 py-1.5 text-sm font-bold rounded border ${phaseConfig.color.badge}`}>
          {phaseConfig.icon} {phaseConfig.label}
        </span>
        <span className="px-3 py-1.5 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          {problemCategoryLabels[post.problem_category] || post.problem_category}
        </span>
        {post.region_names.length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {post.region_names.join('、')}
          </span>
        )}
      </div>

      {/* タイトル（全文） */}
      <h1 className={`text-3xl font-bold mb-2 ${phaseConfig.color.text}`}>
        {post.title}
      </h1>

      {/* 投稿日（SEO構造化データ用） */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {getRelativeTime(post.created_at)}
      </p>

      {/* サマリー（is_summary_only時は🔒表示） */}
      {post.is_summary_only ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-gray-500 dark:text-gray-400">🔒</span>
            <p className={`text-base ${phaseConfig.color.text} opacity-75`}>
              {post.summary}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            この投稿は現在サマリーのみ閲覧可能です
          </p>
        </div>
      ) : (
        <p className={`text-lg ${phaseConfig.color.text} opacity-90`}>
          {post.summary}
        </p>
      )}
    </div>
  )
}
