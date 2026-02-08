/**
 * 投稿一覧の空状態コンポーネント
 * 条件付き空状態（No Results）の思想UIを実装
 */

interface PostListEmptyProps {
  hasFilters: boolean
}

export default function PostListEmpty({ hasFilters }: PostListEmptyProps) {
  if (hasFilters) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          この条件では、まだ回復例が十分に集まっていません
        </h3>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto leading-relaxed">
          集合知はまだ成長の途中です。条件を少し緩めると、近い投稿が見つかるかもしれません。
        </p>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 ヒント: フィルタを1つずつ解除して、より多くの回復体験を探してみてください
          </p>
        </div>
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
