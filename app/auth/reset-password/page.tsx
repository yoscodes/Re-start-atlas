import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from '@/components/ResetPasswordForm'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // リセットトークンがない場合は、パスワード忘れページにリダイレクト
  if (!session) {
    redirect('/auth/forgot-password')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center">新しいパスワードを設定</h1>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
