/**
 * 投稿復元ボタンコンポーネント
 * 削除された投稿を復元する
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreRecoveryPost } from '@/lib/actions/recovery-post'
import ErrorDisplay from './ErrorDisplay'

interface RestorePostButtonProps {
  postId: string
  onRestored?: () => void
  className?: string
}

export default function RestorePostButton({
  postId,
  onRestored,
  className = '',
}: RestorePostButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null)

  const handleRestore = async () => {
    setError(null)
    setLoading(true)

    try {
      const result = await restoreRecoveryPost(postId)

      if (!result.success) {
        setError({
          code: result.errorCode,
          message: result.error,
        })
        return
      }

      // 成功時
      if (onRestored) {
        onRestored()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : '投稿の復元に失敗しました',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}
      <button
        type="button"
        onClick={handleRestore}
        disabled={loading}
        className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
      >
        {loading ? '復元中...' : '復元する'}
      </button>
    </div>
  )
}
