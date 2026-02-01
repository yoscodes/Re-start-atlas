/**
 * [F] 今の状態（結果）
 * 成功談にはしない。完全回復/まだ途中を淡い背景で表示
 */

import type { PostDetail } from '@/lib/types/post-detail'

interface PostDetailCurrentStatusProps {
  post: PostDetail
  isBlurred?: boolean
}

export default function PostDetailCurrentStatus({ 
  post, 
  isBlurred = false 
}: PostDetailCurrentStatusProps) {
  // 完了/継続中の判定（recovered_atがあるかどうか）
  const isCompleted = post.recovered_at !== null

  return (
    <div className={`mb-8 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          今の状態
        </h2>
        {/* 完了/継続中バッジ */}
        <span
          className={`px-3 py-1 text-xs font-medium rounded border ${
            isCompleted
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
          }`}
        >
          {isCompleted ? '✓ 完了' : '継続中'}
        </span>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {post.current_status}
        </p>
      </div>
    </div>
  )
}
