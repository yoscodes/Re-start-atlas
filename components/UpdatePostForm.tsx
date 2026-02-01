/**
 * 投稿更新フォーム
 * RecoveryPostFormのラッパー（Update専用）
 */

'use client'

import { updateRecoveryPost } from '@/lib/actions/recovery-post'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'
import RecoveryPostForm from './RecoveryPostForm'

interface UpdatePostFormProps {
  postId: string
  initialData: CreateRecoveryPostInput
}

export default function UpdatePostForm({ postId, initialData }: UpdatePostFormProps) {
  return (
    <RecoveryPostForm
      mode="update"
      postId={postId}
      initialData={initialData}
      onSubmit={async (data, id) => {
        if (!id) {
          return {
            success: false,
            error: '投稿IDが指定されていません',
          }
        }
        return await updateRecoveryPost(id, data)
      }}
    />
  )
}
