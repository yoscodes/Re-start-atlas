'use client'

import { useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/useSupabaseClient'
import { useRouter } from 'next/navigation'
import { useToast } from './Toast'

interface VerifyEmailFormProps {
  email: string
}

export default function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = useSupabaseClient()

  const handleResendEmail = async () => {
    if (!supabase) return
    
    setError(null)
    setLoading(true)

    try {
      // 現在のセッションを取得して、メール再送信
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('ログインが必要です')
      }

      // メール確認メールを再送信
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      })

      if (error) throw error

      setEmailSent(true)
      showToast('確認メールを再送信しました', 'success')
    } catch (error: any) {
      setError(error.message || 'メールの再送信に失敗しました')
      showToast(error.message || 'メールの再送信に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!supabase) return
    
    setError(null)
    setLoading(true)

    try {
      // セッションを更新して確認状態をチェック
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('ログインが必要です')
      }

      if (user.email_confirmed_at) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('まだメール確認が完了していません。メール内のリンクをクリックしてください。')
      }
    } catch (error: any) {
      setError(error.message || '確認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
          <p className="font-semibold mb-2">確認メールを再送信しました</p>
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
          <button
            onClick={handleCheckVerification}
            disabled={!supabase || loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '確認中...' : '確認済みの場合はこちら'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
      
      <div className="p-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
        <p className="font-semibold mb-2">メール確認が必要です</p>
        <p className="text-sm">
          {email} に確認メールを送信しました。
          <br />
          メール内のリンクをクリックして、アカウントを有効化してください。
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleResendEmail}
          disabled={!supabase || loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '送信中...' : '確認メールを再送信'}
        </button>
        
        <button
          onClick={handleCheckVerification}
          disabled={!supabase || loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '確認中...' : '確認済みの場合はこちら'}
        </button>
      </div>

      <div className="text-center">
        <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
          ログインページに戻る
        </a>
      </div>
    </div>
  )
}
