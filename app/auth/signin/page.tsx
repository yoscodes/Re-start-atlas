import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignInForm from '@/components/SignInForm'

export default async function SignInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center">ログイン</h1>
        <SignInForm />
      </div>
    </main>
  )
}
