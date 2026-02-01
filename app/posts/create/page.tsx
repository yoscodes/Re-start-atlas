/**
 * 投稿作成ページ
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePostForm from '@/components/CreatePostForm'

export default async function CreatePostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          新規投稿
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          回復の経験を共有しましょう
        </p>
      </div>

      <CreatePostForm />
    </main>
  )
}
