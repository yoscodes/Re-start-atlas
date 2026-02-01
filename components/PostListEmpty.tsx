/**
 * 投稿一覧の空状態コンポーネント
 */

interface PostListEmptyProps {
  hasFilters: boolean
}

export default function PostListEmpty({ hasFilters }: PostListEmptyProps) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          条件に一致する投稿が見つかりませんでした
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          フィルタを解除してみてください
        </p>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="mb-4">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        投稿がまだありません
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        最初の投稿を作成してみましょう
      </p>
    </div>
  )
}
