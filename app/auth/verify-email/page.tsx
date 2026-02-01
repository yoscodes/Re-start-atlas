import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VerifyEmailForm from '@/components/VerifyEmailForm'

export default async function VerifyEmailPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // 既にメール確認済みの場合はダッシュボードへ
  if (user.email_confirmed_at) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center">メール確認が必要です</h1>
        <VerifyEmailForm email={user.email || ''} />
      </div>
    </main>
  )
}
