/**
 * 下書き削除リンク
 * 編集画面（draft のときだけ）に静かに置く。確認ダイアログなし・即削除。
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRecoveryPost } from '@/lib/actions/recovery-post'
import { useToast } from './Toast'

interface DeleteDraftLinkProps {
  postId: string
}

export default function DeleteDraftLink({ postId }: DeleteDraftLinkProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const result = await deleteRecoveryPost(postId)
      if (result.success) {
        showToast('下書きを削除しました。')
        router.push('/dashboard/posts')
        router.refresh()
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition disabled:opacity-50 mt-4 block"
    >
      {loading ? '削除中…' : '下書きを削除'}
    </button>
  )
}
