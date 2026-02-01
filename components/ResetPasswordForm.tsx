'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@/lib/supabase/useSupabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (!supabase) return
    // セッションを確認して、リセットトークンが有効かチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('無効または期限切れのリンクです。パスワードリセットメールを再送信してください。')
      }
    })
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'パスワードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          新しいパスワード
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
        {loading ? '更新中...' : 'パスワードを更新'}
      </button>

      <div className="text-center">
        <a href="/auth/signin" className="text-blue-500 hover:text-blue-600">
          ログインページに戻る
        </a>
      </div>
    </form>
  )
}
