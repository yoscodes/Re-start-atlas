/**
 * 検索条件の意味づけテキストを表示するコンポーネント
 * URL同期と相性抜群、SNS引用耐性が上がる、SEOにも効く
 */

import { generateSearchDescription } from '@/lib/utils/search-description'
import type { FilterState } from './PostListFilters'

interface SearchDescriptionProps {
  filters: FilterState
  totalCount?: number
  regions?: Array<{ id: number; prefecture: string }>
}

export default function SearchDescription({ filters, totalCount, regions }: SearchDescriptionProps) {
  const { description, hasFilters } = generateSearchDescription(filters, totalCount, regions)

  if (!hasFilters) {
    return null
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400 text-lg">🔍</span>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {description}
        </h2>
        {totalCount !== undefined && (
          <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            {totalCount}件
          </span>
        )}
      </div>
    </div>
  )
}
