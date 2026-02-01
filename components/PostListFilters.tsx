/**
 * 投稿一覧検索・フィルタコンポーネント
 */

'use client'

import { useState } from 'react'
import type { problem_category_enum } from '@/lib/supabase/types'

interface PostListFiltersProps {
  onFilterChange: (filters: FilterState) => void
  regions: Array<{ id: number; prefecture: string }>
  tags: Array<{ id: string; name: string }>
}

export interface FilterState {
  keyword: string
  problemCategory: problem_category_enum | null
  phaseAtPost: number | null
  regionIds: number[]
  tagNames: string[]
  sort: 'new' | 'old'
}

const problemCategoryOptions: Array<{ value: problem_category_enum; label: string }> = [
  { value: 'debt', label: '借金' },
  { value: 'unemployed', label: '失業' },
  { value: 'dropout', label: '中退' },
  { value: 'addiction', label: '依存症' },
  { value: 'relationship', label: '人間関係' },
]

const phaseOptions = [
  { value: null, label: 'すべて' },
  { value: 1, label: 'フェーズ1' },
  { value: 2, label: 'フェーズ2' },
  { value: 3, label: 'フェーズ3' },
]

export default function PostListFilters({
  onFilterChange,
  regions,
  tags,
}: PostListFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    problemCategory: null,
    phaseAtPost: null,
    regionIds: [],
    tagNames: [],
    sort: 'new',
  })

  const handleFilterChange = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleRegion = (regionId: number) => {
    const newRegionIds = filters.regionIds.includes(regionId)
      ? filters.regionIds.filter((id) => id !== regionId)
      : [...filters.regionIds, regionId]
    handleFilterChange({ regionIds: newRegionIds })
  }

  const toggleTag = (tagName: string) => {
    const newTagNames = filters.tagNames.includes(tagName)
      ? filters.tagNames.filter((name) => name !== tagName)
      : [...filters.tagNames, tagName]
    handleFilterChange({ tagNames: newTagNames })
  }

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      keyword: '',
      problemCategory: null,
      phaseAtPost: null,
      regionIds: [],
      tagNames: [],
      sort: 'new',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.problemCategory ||
    filters.phaseAtPost !== null ||
    filters.regionIds.length > 0 ||
    filters.tagNames.length > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="space-y-4">
        {/* キーワード検索 */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            キーワード検索
          </label>
          <input
            id="keyword"
            type="text"
            value={filters.keyword}
            onChange={(e) => handleFilterChange({ keyword: e.target.value })}
            placeholder="タイトル・概要で検索"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 問題カテゴリ */}
        <div>
          <label htmlFor="problemCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            問題カテゴリ
          </label>
          <select
            id="problemCategory"
            value={filters.problemCategory || ''}
            onChange={(e) =>
              handleFilterChange({
                problemCategory: e.target.value ? (e.target.value as problem_category_enum) : null,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">すべて</option>
            {problemCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* フェーズ */}
        <div>
          <label htmlFor="phaseAtPost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            フェーズ
          </label>
          <select
            id="phaseAtPost"
            value={filters.phaseAtPost ?? ''}
            onChange={(e) =>
              handleFilterChange({
                phaseAtPost: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {phaseOptions.map((option) => (
              <option key={option.value ?? 'all'} value={option.value ?? ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 地域 */}
        {regions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              地域
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => toggleRegion(region.id)}
                    className={`px-3 py-1 text-sm rounded-lg transition ${
                      filters.regionIds.includes(region.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {region.prefecture}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* タグ */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タグ
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`px-3 py-1 text-sm rounded-lg transition ${
                      filters.tagNames.includes(tag.name)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ソート */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            並び順
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value as 'new' | 'old' })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="new">新しい順</option>
            <option value="old">古い順</option>
          </select>
        </div>

        {/* フィルタクリア */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            フィルタをクリア
          </button>
        )}
      </div>
    </div>
  )
}
