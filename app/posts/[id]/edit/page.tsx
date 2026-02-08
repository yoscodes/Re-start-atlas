/**
 * 投稿編集ページ
 * 思想: 編集は「訂正」ではなく「認識の更新」「言語化し直す行為」
 * アクセス: ログイン必須・投稿者本人のみ。条件NG → /posts/[id] にリダイレクト
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPostForEdit } from '@/lib/actions/post-detail'
import UpdatePostForm from '@/components/UpdatePostForm'
import DeleteDraftLink from '@/components/DeleteDraftLink'

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params
  const result = await getPostForEdit(id)

  if (!result.success) {
    redirect(`/posts/${id}`)
  }

  const { post, createdAt } = result

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      {/* ヘッダー: 落ち着いたトーン、余白広め、アイコンなし */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          投稿を編集
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
          時間が経って、考えが変わった場合は書き直して大丈夫です。
        </p>
      </div>

      <UpdatePostForm
        postId={id}
        initialData={post}
        createdAt={createdAt}
      />

      {/* フッター: 保存しなくても戻れる安心感（編集＝覚悟にしない） */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link
          href={`/posts/${id}`}
          className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          投稿詳細に戻る
        </Link>
        {post.status === 'draft' && <DeleteDraftLink postId={id} />}
      </footer>
    </main>
  )
}
