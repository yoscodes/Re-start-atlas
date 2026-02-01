'use client'

import { useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/useSupabaseClient'
import { useToast } from './Toast'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = useSupabaseClient()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
      showToast('パスワードリセット用のメールを送信しました', 'success')
    } catch (error: any) {
      setError(error.message || 'パスワードリセットメールの送信に失敗しました')
      showToast(error.message || 'パスワードリセットメールの送信に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
          パスワードリセット用のメールを送信しました。
          <br />
          メール内のリンクをクリックして、新しいパスワードを設定してください。
        </div>
        <div className="text-center">
          <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
            ログインページに戻る
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleForgotPassword} className="space-y-4">
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

      <button
        type="submit"
        disabled={!supabase || loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '送信中...' : 'パスワードリセットメールを送信'}
      </button>

      <div className="text-center">
        <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
          ログインページに戻る
        </a>
      </div>
    </form>
  )
}
