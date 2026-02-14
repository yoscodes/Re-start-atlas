/**
 * 通報リンク（投稿詳細ページ下部に静かに配置）
 * 思想: 目立たせない・感情を煽らない
 */

'use client'

import { useState } from 'react'
import { reportPost } from '@/lib/actions/report'
import type { ReportReason } from '@/lib/types/report'
import { useToast } from './Toast'

interface ReportPostLinkProps {
  postId: string
}

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'hate', label: 'ヘイト' },
  { value: 'personal_info', label: '個人情報の過剰露出' },
  { value: 'spam', label: 'スパム' },
  { value: 'other', label: 'その他' },
]

export default function ReportPostLink({ postId }: ReportPostLinkProps) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    setLoading(true)
    try {
      const result = await reportPost({
        postId,
        reason: reason as ReportReason,
        note: note.trim() || null,
      })

      if (result.success) {
        showToast('通報を受け付けました。')
        setIsOpen(false)
        setReason('')
        setNote('')
      } else {
        showToast(result.error || '通報の送信に失敗しました', 'error')
      }
    } catch {
      showToast('通報の送信に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition"
      >
        問題のある内容を報告する
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              問題のある内容を報告する
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  理由
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason | '')}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  メモ（任意・短文のみ）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="簡潔に記入してください"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {note.length}/500文字
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? '送信中…' : '報告する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
