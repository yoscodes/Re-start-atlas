/**
 * 投稿更新フォーム
 * RecoveryPostFormのラッパー（Update専用）
 * 成功時: draft→公開なら「投稿を公開しました。」、それ以外は「投稿を更新しました」→ /posts/[id] へリダイレクト
 */

'use client'

import { useRouter } from 'next/navigation'
import { updateRecoveryPost } from '@/lib/actions/recovery-post'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'
import RecoveryPostForm from './RecoveryPostForm'
import { useToast } from './Toast'

interface UpdatePostFormProps {
  postId: string
  initialData: CreateRecoveryPostInput
  createdAt?: string // 時差演出用（投稿作成日時）
}

export default function UpdatePostForm({ postId, initialData, createdAt }: UpdatePostFormProps) {
  const router = useRouter()
  const { showToast } = useToast()

  return (
    <RecoveryPostForm
      mode="update"
      postId={postId}
      initialData={initialData}
      createdAt={createdAt}
      onSubmit={async (data, id) => {
        if (!id) {
          return {
            success: false,
            error: '投稿IDが指定されていません',
          }
        }
        return await updateRecoveryPost(id, data)
      }}
      onSuccess={(id, newStatus) => {
        if (initialData.status === 'draft' && newStatus === 'published') {
          showToast('投稿を公開しました。')
        } else {
          showToast('投稿を更新しました')
        }
        window.scrollTo(0, 0)
        router.push(`/posts/${id}`)
        router.refresh()
      }}
    />
  )
}
