/**
 * [G] 過去の自分へ（魂の一文）
 * 最後に必ず置く。「もし◯年前の自分に言うなら」
 * 
 * 注意: 現時点では current_status の一部として扱う想定。
 * 将来的に専用フィールドを追加する想定
 */

import type { PostDetail } from '@/lib/types/post-detail'

interface PostDetailMessageProps {
  post: PostDetail
  isBlurred?: boolean
}

/**
 * 投稿作成時からの経過年数を計算
 */
function getYearsSincePost(createdAt: string): number {
  const postDate = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - postDate.getTime()
  const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365))
  return diffYears
}

export default function PostDetailMessage({ 
  post, 
  isBlurred = false 
}: PostDetailMessageProps) {
  // 将来的に専用フィールドが追加されるまでの暫定実装
  // 現時点では current_status を使用
  const message = post.current_status
  
  if (!message) {
    return null
  }

  const yearsAgo = getYearsSincePost(post.created_at)

  return (
    <div className={`mb-8 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        過去の自分へ
      </h2>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-l-4 border-blue-400 dark:border-blue-600">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-base italic mb-3">
          {message}
        </p>
        {/* 署名: 時間を強調 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
          — {yearsAgo > 0 ? `${yearsAgo}年前` : '今'}の自分へ
        </p>
      </div>
    </div>
  )
}
