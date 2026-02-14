import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // public.usersテーブルにレコードを作成（外部キー制約エラー回避）
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .insert(({
            id: user.id,
            phase_level: 1, // デフォルトはLv1
          }) as any)
          .select()
          .single()
          .then(({ error: userError }) => {
            // 既に存在する場合は無視（ON CONFLICT相当）
            if (userError && userError.code !== '23505') {
              console.error('Failed to create user profile:', userError)
            }
          })
      }

      // TODO: 将来の実装 - OAuth初回ログイン時の分岐
      // 初回ログイン（新規ユーザー）の場合は /onboarding にリダイレクト
      // 既存ユーザーの場合は /dashboard にリダイレクト

      const redirectUrl = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // エラーがある場合やcodeがない場合は、ログインページにリダイレクト
  return NextResponse.redirect(new URL('/auth/signin', requestUrl.origin))
}
