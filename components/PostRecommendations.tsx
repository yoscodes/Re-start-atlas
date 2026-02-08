/**
 * 似た状況の投稿レコメンド
 * 詳細ページの体験を"終わらせない"ための機能
 * 
 * UIルール:
 * - 3件まで
 * - タイトル + フェーズ + 数字1つ
 * - CTAなし / 自動再生なし
 */

import Link from 'next/link'
import type { SimilarPost } from '@/lib/types/post-recommendation'
import { getPhaseConfig, type PhaseLevel } from '@/lib/utils/phase'

interface PostRecommendationsProps {
  posts: SimilarPost[]
}

export default function PostRecommendations({ 
  posts
}: PostRecommendationsProps) {
  // 投稿がない場合は何も表示しない（ページ構造が崩れないように）
  if (!posts.length) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        似た状況の投稿
      </h2>
      <div className="space-y-3">
        {posts.map((post) => {
          const phaseConfig = getPhaseConfig(post.phase_at_post as PhaseLevel)
          
          return (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* フェーズバッジ */}
                <span className={`px-2 py-1 text-xs font-bold rounded border flex-shrink-0 ${phaseConfig.color.badge}`}>
                  {phaseConfig.icon} {phaseConfig.label}
                </span>
                
                {/* タイトル + 数字 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.display_number && post.display_label && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {post.display_label}: {post.display_number}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
