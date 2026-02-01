import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignUpForm from '@/components/SignUpForm'

export default async function SignUpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center">サインアップ</h1>
        <SignUpForm />
      </div>
    </main>
  )
}
