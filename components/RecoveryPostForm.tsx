/**
 * 回復投稿フォーム（共通コンポーネント）
 * CreateとUpdateで同じ構造・挙動を保証
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateRecoveryPostInput } from '@/lib/types/recovery-post'
import { FAILED_REASON_TYPES } from '@/lib/constants/failed-reason-types'
import ErrorDisplay from './ErrorDisplay'
import { useToast } from './Toast'
import {
  getErrorField,
  isValidationError,
  isPermissionError,
} from '@/lib/errors/recovery-post'

interface RecoveryPostFormProps {
  mode: 'create' | 'update'
  postId?: string
  initialData?: CreateRecoveryPostInput
  createdAt?: string // 編集時の時差演出用（投稿作成日時）
  onSubmit: (
    data: CreateRecoveryPostInput,
    postId?: string
  ) => Promise<
    | { success: true; postId: string; createdAt?: string; updatedAt?: string }
    | { success: false; error: string; errorCode?: string }
  >
  /** create 時のみ。下書きとして保存（toast のみ、遷移なし） */
  onSubmitDraft?: (data: CreateRecoveryPostInput) => Promise<
    | { success: true; postId: string; createdAt?: string }
    | { success: false; error: string; errorCode?: string }
  >
  /** postId と保存後の status（draft→公開時は Toast を「投稿を公開しました。」にするため） */
  onSuccess?: (postId: string, newStatus?: 'draft' | 'published') => void
}

const emptyFormData: CreateRecoveryPostInput = {
  title: '',
  summary: '',
  problemCategory: 'debt',
  phaseAtPost: 2,
  startedAt: null,
  recoveredAt: null,
  currentStatus: '',
  steps: [{ order: 1, content: '', isFailure: false, failedReasonType: null, failedReasonDetail: null }],
  regionIds: [],
  tagNames: [],
  ageAtThatTime: null,
  debtAmount: null,
  unemployedMonths: null,
  recoveryMonths: null,
  initialMisconception: null,
}

export default function RecoveryPostForm({
  mode,
  postId,
  initialData,
  createdAt,
  onSubmit,
  onSubmitDraft,
  onSuccess,
}: RecoveryPostFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null)
  const [formData, setFormData] = useState<CreateRecoveryPostInput>(
    initialData || { ...emptyFormData }
  )

  // 初期データが変更された場合にフォームを更新
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  // 編集ページを開いたときのログ（思想検証用・UIなし）
  useEffect(() => {
    if (mode === 'update' && postId) {
      console.log('[PostEdit] 開いた')
    }
  }, [mode, postId])

  const runSubmit = async (dataToSend: CreateRecoveryPostInput, isDraftCreate = false) => {
    setError(null)
    setLoading(true)
    try {
      const result = isDraftCreate && onSubmitDraft
        ? await onSubmitDraft(dataToSend)
        : await onSubmit(dataToSend, postId)

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

      // 思想検証用ログ（内容は記録しない）
      if (mode === 'update') {
        console.log('[PostEdit] 保存完了')
        const hadMisconception = !!initialData?.initialMisconception?.trim()
        const hasMisconception = !!formData.initialMisconception?.trim()
        if (!hadMisconception && hasMisconception) {
          console.log('[PostEdit] initial_misconception 追加された')
        }
        const initialStepsCount = initialData?.steps?.length ?? 0
        if (formData.steps.length !== initialStepsCount) {
          console.log('[PostEdit] recovery_steps が増減した')
        }
      }

      // 成功時の処理
      if (isDraftCreate) {
        showToast('下書きとして保存しました。')
        setFormData({ ...emptyFormData })
      } else if (onSuccess) {
        onSuccess(result.postId)
      } else {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSend: CreateRecoveryPostInput =
      mode === 'create'
        ? { ...formData, status: 'published' }
        : { ...formData, status: formData.status }
    await runSubmit(dataToSend, false)
  }

  const handleSubmitWithStatus = async (status: 'draft' | 'published') => {
    await runSubmit({ ...formData, status }, false)
  }

  const handleDraftSave = async () => {
    if (!onSubmitDraft) return
    await runSubmit({ ...formData, status: 'draft' }, true)
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { order: formData.steps.length + 1, content: '', isFailure: false, failedReasonType: null, failedReasonDetail: null },
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

  // 時差演出の表示判定（編集時のみ、7日以上経過かつinitial_misconception IS NULL）
  const [showTimePassedMessage, setShowTimePassedMessage] = useState(false)
  useEffect(() => {
    if (mode === 'update' && createdAt && !formData.initialMisconception) {
      // sessionStorageで一度表示したかチェック
      const storageKey = `time-passed-message-${postId}`
      const hasShown = sessionStorage.getItem(storageKey)
      
      if (!hasShown) {
        // 7日以上経過しているかチェック
        const createdDate = new Date(createdAt)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff >= 7) {
          setShowTimePassedMessage(true)
          // sessionStorageに記録（1回だけ表示）
          sessionStorage.setItem(storageKey, 'true')
        }
      }
    }
  }, [mode, createdAt, formData.initialMisconception, postId])

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
                      // 失敗行動を解除した場合、失敗理由もクリア
                      if (!e.target.checked) {
                        updateStep(index, 'failedReasonType', null)
                        updateStep(index, 'failedReasonDetail', null)
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
                  <div className="space-y-3 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <label htmlFor={`failed-reason-type-${index}`} className="block text-sm font-medium mb-1 text-red-600 dark:text-red-400">
                      なぜそれは失敗だったと思いますか？
                    </label>
                    <select
                      id={`failed-reason-type-${index}`}
                      value={step.failedReasonType || ''}
                      onChange={(e) => updateStep(index, 'failedReasonType', e.target.value || null)}
                      disabled={isDisabled}
                      className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">選択してください</option>
                      {FAILED_REASON_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      id={`failed-reason-detail-${index}`}
                      value={step.failedReasonDetail || ''}
                      onChange={(e) => updateStep(index, 'failedReasonDetail', e.target.value)}
                      required={step.isFailure}
                      maxLength={1000}
                      rows={3}
                      disabled={isDisabled}
                      className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="具体的に何が問題だったのか、どうなったのかを記録してください（例: 借金を返すためにまた借金をした。返済計画が甘く、収入が減った時に返せなくなった。）"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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

      {/* 「最初に誤解していたこと」（編集時のみ） */}
      {mode === 'update' && (
        <div className="border-t border-gray-300 dark:border-gray-700 pt-6 mt-6">
          <label htmlFor="initialMisconception" className="block text-sm font-medium mb-2">
            当時、本人が勘違いしていたこと
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            当時は正しいと思っていたが、今振り返るとズレていた認識があれば書いてください。任意。1〜2文。教訓・アドバイスは書かず、当時の認識のズレだけにしてください。
          </p>
          <textarea
            id="initialMisconception"
            value={formData.initialMisconception || ''}
            onChange={(e) =>
              setFormData({ ...formData, initialMisconception: e.target.value || null })
            }
            maxLength={1000}
            rows={3}
            disabled={isDisabled}
            className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="例: 努力量が足りないのが原因だと思い込んでいたが、実際は「続け方」の問題だった。"
          />
          {/* 後出し許可文（入力欄の下に配置） */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            あとから振り返って「当時、勘違いしていたかも」と思ったことがあれば、追記できます。
          </p>
          {/* 時差演出（1回だけ表示） */}
          {showTimePassedMessage && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                時間が経って、見え方が変わった部分があれば、追記しても大丈夫です。
              </p>
            </div>
          )}
        </div>
      )}

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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {mode === 'create' && onSubmitDraft && (
          <button
            type="button"
            onClick={handleDraftSave}
            disabled={loading || isDisabled}
            className="order-2 sm:order-1 text-sm px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '保存中…' : '下書きとして保存'}
          </button>
        )}
        {mode === 'update' && initialData?.status === 'draft' && (
          <>
            <button
              type="button"
              onClick={() => handleSubmitWithStatus('draft')}
              disabled={loading || isDisabled}
              className="order-2 sm:order-1 text-sm px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '保存中…' : '下書きとして保存'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmitWithStatus('published')}
              disabled={loading || isDisabled}
              className="order-1 sm:order-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '公開中…' : 'この内容で公開する'}
            </button>
          </>
        )}
        {(mode === 'create') || (mode === 'update' && initialData?.status !== 'draft') ? (
          <button
            type="submit"
            disabled={loading || isDisabled}
            className="order-1 sm:order-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading
              ? mode === 'create'
                ? '投稿中...'
                : '保存中…'
              : mode === 'create'
                ? '投稿を作成'
                : '変更を保存'}
          </button>
        ) : null}
      </div>
    </form>
  )
}
