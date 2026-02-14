/**
 * 投稿一覧クライアントコンポーネント
 * 検索・フィルタ・ページング機能を含む
 */

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { getRecoveryPosts } from '@/lib/actions/post-list'
import type { PostListItem as PostListItemType } from '@/lib/types/post-list'
import type { PhaseLevel } from '@/lib/utils/phase'
import type { FilterState } from './PostListFilters'
import PostListFilters from './PostListFilters'
import PostListItem from './PostListItem'
import PostListEmpty from './PostListEmpty'
import SearchDescription from './SearchDescription'

interface PostListClientProps {
  regions: Array<{ id: number; prefecture: string }>
  tags: Array<{ id: string; name: string }>
  userPhaseLevel?: PhaseLevel | null
}

export default function PostListClient({ regions, tags, userPhaseLevel }: PostListClientProps) {
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<PostListItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    problemCategory: null,
    phaseAtPost: null,
    regionIds: [],
    tagNames: [],
    sort: 'new',
  })
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  // URLクエリ（例: /posts?phase=lv1&tags=...）を初期フィルタに反映
  useEffect(() => {
    const phaseParam = searchParams.get('phase')
    const rawTags = [
      ...searchParams.getAll('tags'),
      ...(searchParams.get('tags') ? [searchParams.get('tags') as string] : []),
    ]
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean)

    const next: Partial<FilterState> = {}

    if (phaseParam) {
      if (phaseParam === 'lv1') next.phaseAtPost = 1
      else if (phaseParam === 'lv2') next.phaseAtPost = 2
      else if (phaseParam === 'lv3') next.phaseAtPost = 3
      else {
        const n = parseInt(phaseParam, 10)
        if (!Number.isNaN(n)) next.phaseAtPost = n
      }
    }

    if (rawTags.length > 0) {
      // tags は「タグ名」そのものを渡す想定（DB側tag.nameと一致させる）
      next.tagNames = Array.from(new Set(rawTags))
    }

    // クエリがあるときだけ上書き（既存フィルタ操作を潰さない）
    if (Object.keys(next).length > 0) {
      setFilters((prev) => ({
        ...prev,
        ...next,
      }))
    }
  }, [searchParams])

  // フィルタ変更時に投稿を再読み込み
  useEffect(() => {
    let cancelled = false
    setPage(0)
    setLoading(true)
    setError(null)

    startTransition(() => {
      const loadWithFilters = async () => {
        try {
          const result = await getRecoveryPosts({
            keyword: filters.keyword || null,
            problemCategory: filters.problemCategory,
            phaseAtPost: filters.phaseAtPost,
            regionIds: filters.regionIds.length > 0 ? filters.regionIds : null,
            tagNames: filters.tagNames.length > 0 ? filters.tagNames : null,
            sort: filters.sort,
            limit: 20,
            offset: 0,
          })

          if (cancelled) return

          if (!result.success) {
            setError(result.error)
            return
          }

          setPosts(result.posts)
          setHasMore(result.hasMore)
          setTotalCount(result.totalCount)
        } catch (err) {
          if (cancelled) return
          setError(err instanceof Error ? err.message : '投稿の取得に失敗しました')
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }
      loadWithFilters()
    })

    return () => {
      cancelled = true
    }
  }, [filters])

  const loadMorePosts = async () => {
    if (loading || !hasMore) return

    const nextPage = page + 1
    setLoading(true)
    setError(null)

    try {
      const result = await getRecoveryPosts({
        keyword: filters.keyword || null,
        problemCategory: filters.problemCategory,
        phaseAtPost: filters.phaseAtPost,
        regionIds: filters.regionIds.length > 0 ? filters.regionIds : null,
        tagNames: filters.tagNames.length > 0 ? filters.tagNames : null,
        sort: filters.sort,
        limit: 20,
        offset: nextPage * 20,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setPosts((prev) => [...prev, ...result.posts])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    loadMorePosts()
  }

  const hasActiveFilters = Boolean(
    filters.keyword ||
      filters.problemCategory ||
      filters.phaseAtPost !== null ||
      filters.regionIds.length > 0 ||
      filters.tagNames.length > 0
  )

  return (
    <div>
      {/* フィルタ */}
      <PostListFilters
        regions={regions}
        tags={tags}
        filters={filters}
        onFilterChange={(newFilters) => {
          setFilters(newFilters)
        }}
      />

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700">
          {error}
        </div>
      )}

      {/* 検索条件の意味づけテキスト */}
      {!loading && posts.length > 0 && (
        <SearchDescription filters={filters} totalCount={totalCount} regions={regions} />
      )}

      {/* 投稿一覧 */}
      {loading && posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      ) : posts.length === 0 ? (
        <PostListEmpty hasFilters={hasActiveFilters} />
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostListItem 
                key={post.id} 
                post={post} 
                userPhaseLevel={userPhaseLevel}
                totalCount={totalCount}
              />
            ))}
          </div>

          {/* もっと見るボタン */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading || isPending}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading || isPending ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}

          {/* 読み込み中（追加読み込み時） */}
          {loading && posts.length > 0 && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
