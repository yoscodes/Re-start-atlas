/**
 * 投稿削除ボタンコンポーネント
 * 確認ダイアログ付き
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRecoveryPost } from '@/lib/actions/recovery-post'
import ErrorDisplay from './ErrorDisplay'
import { isPermissionError } from '@/lib/errors/recovery-post'

interface DeletePostButtonProps {
  postId: string
  postTitle?: string
  onDeleted?: () => void
  className?: string
}

export default function DeletePostButton({
  postId,
  postTitle,
  onDeleted,
  className = '',
}: DeletePostButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setError(null)
    setLoading(true)

    try {
      const result = await deleteRecoveryPost(postId)

      if (!result.success) {
        setError({
          code: result.errorCode,
          message: result.error,
        })

        // 権限エラーの場合、投稿一覧にリダイレクト
        if (isPermissionError(result.errorCode)) {
          setTimeout(() => {
            router.push('/posts')
          }, 3000)
        }

        setShowConfirm(false)
        return
      }

      // 成功時
      setShowConfirm(false)
      
      if (onDeleted) {
        onDeleted()
      } else {
        // デフォルトのリダイレクト
        router.push('/posts')
        router.refresh()
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : '投稿の削除に失敗しました',
      })
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
      >
        削除
      </button>

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">投稿を削除しますか？</h2>
            
            {postTitle && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                「{postTitle}」を削除しますか？
              </p>
            )}
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              この操作は取り消せません。投稿は論理削除され、検索結果から除外されます。
            </p>

            {/* エラー表示 */}
            {error && (
              <div className="mb-4">
                <ErrorDisplay error={error} />
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
