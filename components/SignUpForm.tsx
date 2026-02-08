'use client'

import { useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/useSupabaseClient'
import { useRouter } from 'next/navigation'
import { useToast } from './Toast'
import type { Database } from '@/lib/supabase/types'

export default function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = useSupabaseClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setError(null)

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上である必要があります')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // public.usersテーブルにレコードを作成（外部キー制約エラー回避）
      if (data.user) {
        const userRecord: Database['public']['Tables']['users']['Insert'] = {
          id: data.user.id,
          phase_level: 1, // デフォルトはLv1
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase型とDatabase型の不一致を回避
        const { error: userError } = await supabase.from('users').insert(userRecord as any).select().single()

        // 既に存在する場合は無視（ON CONFLICT相当）
        if (userError && userError.code !== '23505') {
          console.error('Failed to create user profile:', userError)
          // エラーを無視せず、ユーザーに通知するか、再試行する
        }
      }

      // メール確認が必要な場合（email_confirmed_atがnull）
      if (data.user && !data.user.email_confirmed_at) {
        setEmailSent(true)
        showToast('確認メールを送信しました', 'success')
      } else {
        // メール確認が不要な場合（開発環境など）
        showToast('サインアップが完了しました', 'success')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      setError(error.message || 'サインアップに失敗しました')
      showToast(error.message || 'サインアップに失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!supabase) return
    
    setError(null)
    setLoading(true)

    try {
      showToast('Googleログインを開始しています...', 'info')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Googleログインに失敗しました')
      showToast(error.message || 'Googleログインに失敗しました', 'error')
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
          <p className="font-semibold mb-2">確認メールを送信しました</p>
          <p className="text-sm">
            {email} に確認メールを送信しました。
            <br />
            メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
            ログインページに戻る
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="6文字以上"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          パスワード（確認）
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="パスワードを再入力"
        />
      </div>

      <button
        type="submit"
        disabled={!supabase || loading}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '登録中...' : 'サインアップ'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">または</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={!supabase || loading}
        className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Googleでサインアップ
      </button>

      <div className="text-center">
        <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
          既にアカウントをお持ちの方はこちら
        </a>
      </div>
    </form>
  )
}
