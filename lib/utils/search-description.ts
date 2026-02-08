/**
 * 検索条件の意味づけテキストを生成するユーティリティ
 * 例：「借金 × フェーズ2 × 30代前半の回復体験」
 * URL同期と相性抜群、SNS引用耐性が上がる、SEOにも効く
 */

import type { problem_category_enum } from '@/lib/supabase/types'
import type { FilterState } from '@/components/PostListFilters'

const problemCategoryLabels: Record<problem_category_enum, string> = {
  debt: '借金',
  unemployed: '失業',
  dropout: '中退',
  addiction: '依存症',
  relationship: '人間関係',
}

const phaseLabels: Record<number, string> = {
  1: 'フェーズ1',
  2: 'フェーズ2',
  3: 'フェーズ3',
}

/**
 * 年齢を年代表記に変換
 */
function formatAgeRange(age: number | null): string | null {
  if (age === null) return null
  if (age < 20) return '10代'
  if (age < 30) return '20代'
  if (age < 40) return '30代'
  if (age < 50) return '40代'
  if (age < 60) return '50代'
  return '60代以上'
}

/**
 * 検索条件の意味づけテキストを生成
 */
export function generateSearchDescription(
  filters: FilterState,
  totalCount?: number,
  regions?: Array<{ id: number; prefecture: string }>
): {
  description: string
  hasFilters: boolean
} {
  const parts: string[] = []

  // 問題カテゴリ
  if (filters.problemCategory) {
    parts.push(problemCategoryLabels[filters.problemCategory])
  }

  // フェーズ
  if (filters.phaseAtPost !== null) {
    parts.push(phaseLabels[filters.phaseAtPost])
  }

  // キーワード（簡潔に）
  if (filters.keyword) {
    parts.push(`「${filters.keyword}」`)
  }

  // 地域（最初の1つだけ）
  if (filters.regionIds.length > 0 && regions) {
    const firstRegion = regions.find((r) => r.id === filters.regionIds[0])
    if (firstRegion) {
      parts.push(firstRegion.prefecture)
    } else {
      parts.push('地域指定')
    }
  } else if (filters.regionIds.length > 0) {
    parts.push('地域指定')
  }

  // タグ（最初の1つだけ）
  if (filters.tagNames.length > 0) {
    parts.push(`#${filters.tagNames[0]}`)
  }

  const hasFilters = parts.length > 0

  if (!hasFilters) {
    return {
      description: 'すべての回復体験',
      hasFilters: false,
    }
  }

  // パーツを「 × 」で結合
  const description = parts.join(' × ') + 'の回復体験'

  return {
    description,
    hasFilters: true,
  }
}

/**
 * 条件一致投稿数に基づいて「多い/少ない」を判定
 */
export function getConditionPopularity(totalCount: number | undefined): {
  label: string
  isPopular: boolean
} {
  if (totalCount === undefined) {
    return {
      label: '',
      isPopular: false,
    }
  }

  if (totalCount >= 10) {
    return {
      label: 'この条件で投稿が多い',
      isPopular: true,
    }
  } else if (totalCount >= 3) {
    return {
      label: '',
      isPopular: false,
    }
  } else {
    return {
      label: 'まだ少ない',
      isPopular: false,
    }
  }
}
