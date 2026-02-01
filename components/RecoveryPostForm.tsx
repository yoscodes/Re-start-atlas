/**
 * 回復投稿フォーム（共通コンポーネント）
 * CreateとUpdateで同じ構造・挙動を保証
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'
import ErrorDisplay from './ErrorDisplay'
import {
  getErrorField,
  isValidationError,
  isPermissionError,
} from '@/lib/errors/recovery-post'

interface RecoveryPostFormProps {
  mode: 'create' | 'update'
  postId?: string
  initialData?: CreateRecoveryPostInput
  onSubmit: (
    data: CreateRecoveryPostInput,
    postId?: string
  ) => Promise<
    | { success: true; postId: string; createdAt?: string; updatedAt?: string }
    | { success: false; error: string; errorCode?: string }
  >
  onSuccess?: (postId: string) => void
}

export default function RecoveryPostForm({
  mode,
  postId,
  initialData,
  onSubmit,
  onSuccess,
}: RecoveryPostFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null)
  const [formData, setFormData] = useState<CreateRecoveryPostInput>(
    initialData || {
      title: '',
      summary: '',
      problemCategory: 'debt',
      phaseAtPost: 2,
      startedAt: null,
      recoveredAt: null,
      currentStatus: '',
      steps: [{ order: 1, content: '', isFailure: false, failedReason: null }],
      regionIds: [],
      tagNames: [],
      ageAtThatTime: null,
      debtAmount: null,
      unemployedMonths: null,
      recoveryMonths: null,
    }
  )

  // 初期データが変更された場合にフォームを更新
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await onSubmit(formData, postId)

      if (!result.success) {
        // エラーコードに基づいた処理
        setError({
          code: result.errorCode,
          message: result.error,
        })

        // バリデーションエラーの場合、該当フィールドにスクロール
        if (isValidationError(result.errorCode)) {
          const errorField = getErrorField(result.errorCode)
          if (errorField) {
            const elementId = `${errorField}-section`
            document.getElementById(elementId)?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
          }
        }

        // 権限エラーの場合（Updateのみ）
        if (mode === 'update' && isPermissionError(result.errorCode)) {
          // 3秒後に投稿一覧にリダイレクト
          setTimeout(() => {
            router.push('/posts')
          }, 3000)
        }

        return
      }

      // 成功時の処理
      if (onSuccess) {
        onSuccess(result.postId)
      } else {
        // デフォルトのリダイレクト
        router.push(`/posts/${result.postId}`)
        router.refresh()
      }
    } catch (err) {
      setError({
        message:
          err instanceof Error
            ? err.message
            : mode === 'create'
              ? '投稿作成に失敗しました'
              : '投稿の更新に失敗しました',
      })
    } finally {
      setLoading(false)
    }
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { order: formData.steps.length + 1, content: '', isFailure: false, failedReason: null },
      ],
    })
  }

  const removeStep = (index: number) => {
    if (formData.steps.length <= 1) {
      return // 最低1つは必要
    }
    setFormData({
      ...formData,
      steps: formData.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({
          ...step,
          order: i + 1,
        })),
    })
  }

  const updateStep = (
    index: number,
    field: keyof typeof formData.steps[0],
    value: unknown
  ) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  // エラーに基づいたフィールドのハイライト
  const errorField = error?.code ? getErrorField(error.code) : null
  const stepsHasError = errorField === 'steps'
  const isPermissionErr = error?.code ? isPermissionError(error.code) : false
  const isDisabled = isPermissionErr && mode === 'update'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <ErrorDisplay error={error} onDismiss={() => setError(null)} />
      )}

      {/* 権限エラーの場合の追加メッセージ（Updateのみ） */}
      {mode === 'update' && isPermissionErr && (
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg border border-yellow-300 dark:border-yellow-700">
          <p className="font-medium">編集権限がありません</p>
          <p className="text-sm mt-1">3秒後に投稿一覧ページにリダイレクトします。</p>
        </div>
      )}

      {/* タイトル */}
      <div id="title-section">
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
          disabled={isDisabled}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${
            errorField === 'title'
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-700'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* 概要 */}
      <div id="summary-section">
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
          disabled={isDisabled}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${
            errorField === 'summary'
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-700'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          disabled={isDisabled}
          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
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
          disabled={isDisabled}
          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <option value={1}>フェーズ1</option>
          <option value={2}>フェーズ2</option>
          <option value={3}>フェーズ3</option>
        </select>
      </div>

      {/* 開始時期 */}
      <div>
        <label htmlFor="startedAt" className="block text-sm font-medium mb-2">
          詰み始めた時期
        </label>
        <input
          id="startedAt"
          type="date"
          value={formData.startedAt || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              startedAt: e.target.value || null,
            })
          }
          disabled={isDisabled}
          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* 回復時期 */}
      <div>
        <label htmlFor="recoveredAt" className="block text-sm font-medium mb-2">
          回復した時期
        </label>
        <input
          id="recoveredAt"
          type="date"
          value={formData.recoveredAt || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              recoveredAt: e.target.value || null,
            })
          }
          disabled={isDisabled}
          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* ステップ */}
      <div id="steps-section">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            回復ステップ *{' '}
            {stepsHasError && (
              <span className="text-red-500 ml-2">（エラーがあります）</span>
            )}
          </label>
          {!isDisabled && (
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + ステップを追加
            </button>
          )}
        </div>
        <div
          className={`space-y-4 p-4 rounded-lg border ${
            stepsHasError
              ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10'
              : 'border-gray-300 dark:border-gray-700'
          } ${isDisabled ? 'opacity-50' : ''}`}
        >
          {formData.steps.map((step, index) => (
            <div
              key={index}
              className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">ステップ {step.order}</span>
                {formData.steps.length > 1 && !isDisabled && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                disabled={isDisabled}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-2"
                placeholder="ステップ内容を入力"
              />
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={step.isFailure}
                    onChange={(e) => {
                      updateStep(index, 'isFailure', e.target.checked)
                      // 失敗行動を解除した場合、failedReasonもクリア
                      if (!e.target.checked) {
                        updateStep(index, 'failedReason', null)
                      }
                    }}
                    disabled={isDisabled}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    失敗行動として記録（やってはいけない地雷マップ用）
                  </span>
                </label>
                {step.isFailure && (
                  <div>
                    <label htmlFor={`failed-reason-${index}`} className="block text-sm font-medium mb-1 text-red-600 dark:text-red-400">
                      失敗した理由 *
                    </label>
                    <textarea
                      id={`failed-reason-${index}`}
                      value={step.failedReason || ''}
                      onChange={(e) => updateStep(index, 'failedReason', e.target.value)}
                      required={step.isFailure}
                      maxLength={1000}
                      rows={2}
                      disabled={isDisabled}
                      className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="なぜ失敗したのか、何が問題だったのかを記録してください（例: 借金を返すためにまた借金をした。返済計画が甘かった。）"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      この情報は「やってはいけない地雷マップ」として他のユーザーに共有されます
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 現在の状況 */}
      <div id="currentStatus-section">
        <label htmlFor="currentStatus" className="block text-sm font-medium mb-2">
          現在の状況 *
        </label>
        <textarea
          id="currentStatus"
          value={formData.currentStatus}
          onChange={(e) =>
            setFormData({ ...formData, currentStatus: e.target.value })
          }
          required
          maxLength={5000}
          rows={3}
          disabled={isDisabled}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${
            errorField === 'currentStatus'
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-700'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* 検索特化フィールド（SEO用） */}
      <div className="border-t border-gray-300 dark:border-gray-700 pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          検索特化情報（SEO用・任意）
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          これらの情報を入力すると、検索エンジンでの検索性が向上します。
        </p>

        {/* その時の年齢 */}
        <div className="mb-4">
          <label htmlFor="ageAtThatTime" className="block text-sm font-medium mb-2">
            その時の年齢
          </label>
          <input
            id="ageAtThatTime"
            type="number"
            min="0"
            max="150"
            value={formData.ageAtThatTime || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                ageAtThatTime: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            disabled={isDisabled}
            placeholder="例: 25"
            className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            問題が発生した時点での年齢を入力してください
          </p>
        </div>

        {/* 借金額（借金カテゴリの場合） */}
        {formData.problemCategory === 'debt' && (
          <div className="mb-4">
            <label htmlFor="debtAmount" className="block text-sm font-medium mb-2">
              借金額（万円）
            </label>
            <input
              id="debtAmount"
              type="number"
              min="0"
              value={formData.debtAmount || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  debtAmount: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              disabled={isDisabled}
              placeholder="例: 300"
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              借金額を万円単位で入力してください（例: 300万円の場合は300）
            </p>
          </div>
        )}

        {/* 無職期間（失業カテゴリの場合） */}
        {formData.problemCategory === 'unemployed' && (
          <div className="mb-4">
            <label htmlFor="unemployedMonths" className="block text-sm font-medium mb-2">
              無職期間（月）
            </label>
            <input
              id="unemployedMonths"
              type="number"
              min="0"
              value={formData.unemployedMonths || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unemployedMonths: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              disabled={isDisabled}
              placeholder="例: 12"
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              無職期間を月単位で入力してください（例: 1年間の場合は12）
            </p>
          </div>
        )}

        {/* 回復期間 */}
        {formData.recoveredAt && (
          <div className="mb-4">
            <label htmlFor="recoveryMonths" className="block text-sm font-medium mb-2">
              回復期間（月）
            </label>
            <input
              id="recoveryMonths"
              type="number"
              min="0"
              value={formData.recoveryMonths || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recoveryMonths: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              disabled={isDisabled}
              placeholder="例: 24"
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              開始から回復までの期間を月単位で入力してください（例: 2年間の場合は24）
            </p>
          </div>
        )}
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={loading || isDisabled}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading
          ? mode === 'create'
            ? '投稿中...'
            : '更新中...'
          : mode === 'create'
            ? '投稿を作成'
            : '投稿を更新'}
      </button>
    </form>
  )
}
