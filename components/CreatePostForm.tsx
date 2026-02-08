/**
 * 投稿作成フォーム
 * RecoveryPostFormのラッパー（Create専用）
 * 下書き＝保存のみ・toast・遷移なし / 投稿＝published で作成・詳細へ遷移
 */

'use client'

import { createRecoveryPost } from '@/lib/actions/recovery-post'
import RecoveryPostForm from './RecoveryPostForm'

export default function CreatePostForm() {
  return (
    <RecoveryPostForm
      mode="create"
      onSubmit={async (data) => {
        return await createRecoveryPost({ ...data, status: data.status ?? 'published' })
      }}
      onSubmitDraft={async (data) => {
        return await createRecoveryPost({ ...data, status: 'draft' })
      }}
    />
  )
}
