/**
 * 投稿作成フォームの使用例（Client Component）
 * 実際の実装時の参考用
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRecoveryPost } from '@/lib/actions/recovery-post'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'

export default function CreatePostFormExample() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateRecoveryPostInput>({
    title: '',
    summary: '',
    problemCategory: 'debt',
    phaseAtPost: 2,
    startedAt: null,
    recoveredAt: null,
    currentStatus: '',
    steps: [
      { order: 1, content: '', isFailure: false },
    ],
    regionIds: [],
    tagNames: [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Server Actionを呼び出し
      const result = await createRecoveryPost(formData)

      if (!result.success) {
        setError(result.error)
        return
      }

      // 成功時は投稿詳細ページにリダイレクト
      router.push(`/posts/${result.postId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { order: formData.steps.length + 1, content: '', isFailure: false },
      ],
    })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index).map((step, i) => ({
        ...step,
        order: i + 1,
      })),
    })
  }

  const updateStep = (index: number, field: keyof typeof formData.steps[0], value: unknown) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          タイトル *
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
      </div>

      {/* 概要 */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium mb-2">
          概要 *
        </label>
        <textarea
          id="summary"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          required
          maxLength={5000}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
      </div>

      {/* 問題カテゴリ */}
      <div>
        <label htmlFor="problemCategory" className="block text-sm font-medium mb-2">
          問題カテゴリ *
        </label>
        <select
          id="problemCategory"
          value={formData.problemCategory}
          onChange={(e) =>
            setFormData({
              ...formData,
              problemCategory: e.target.value as CreateRecoveryPostInput['problemCategory'],
            })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="debt">借金</option>
          <option value="unemployed">失業</option>
          <option value="dropout">中退</option>
          <option value="addiction">依存症</option>
          <option value="relationship">人間関係</option>
        </select>
      </div>

      {/* フェーズレベル */}
      <div>
        <label htmlFor="phaseAtPost" className="block text-sm font-medium mb-2">
          投稿時の状態 *
        </label>
        <select
          id="phaseAtPost"
          value={formData.phaseAtPost}
          onChange={(e) =>
            setFormData({
              ...formData,
              phaseAtPost: Number(e.target.value) as 1 | 2 | 3,
            })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value={1}>フェーズ1</option>
          <option value={2}>フェーズ2</option>
          <option value={3}>フェーズ3</option>
        </select>
      </div>

      {/* ステップ */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">回復ステップ *</label>
          <button
            type="button"
            onClick={addStep}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            + ステップを追加
          </button>
        </div>
        {formData.steps.map((step, index) => (
          <div key={index} className="mb-4 p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">ステップ {step.order}</span>
              {formData.steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  削除
                </button>
              )}
            </div>
            <textarea
              value={step.content}
              onChange={(e) => updateStep(index, 'content', e.target.value)}
              required
              maxLength={5000}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-2"
              placeholder="ステップ内容を入力"
            />
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.isFailure}
                onChange={(e) => updateStep(index, 'isFailure', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">失敗行動として記録</span>
            </label>
          </div>
        ))}
      </div>

      {/* 現在の状況 */}
      <div>
        <label htmlFor="currentStatus" className="block text-sm font-medium mb-2">
          現在の状況 *
        </label>
        <textarea
          id="currentStatus"
          value={formData.currentStatus}
          onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
          required
          maxLength={5000}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '投稿中...' : '投稿を作成'}
      </button>
    </form>
  )
}
