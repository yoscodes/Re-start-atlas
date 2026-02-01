/**
 * 投稿作成フォーム
 * RecoveryPostFormのラッパー（Create専用）
 */

'use client'

import { createRecoveryPost } from '@/lib/actions/recovery-post'
import RecoveryPostForm from './RecoveryPostForm'

export default function CreatePostForm() {
  return (
    <RecoveryPostForm
      mode="create"
      onSubmit={async (data) => {
        return await createRecoveryPost(data)
      }}
    />
  )
}
