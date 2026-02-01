/**
 * エラー表示コンポーネント
 * エラーコードに基づいて適切なスタイルとメッセージを表示
 */

'use client'

import { getUserErrorMessage, getErrorSeverity, getErrorField } from '@/lib/errors/recovery-post'
import type { ErrorSeverity } from '@/lib/errors/recovery-post'

interface ErrorDisplayProps {
  error: { code?: string; message?: string } | string | null | undefined
  className?: string
  showIcon?: boolean
  onDismiss?: () => void
}

export default function ErrorDisplay({
  error,
  className = '',
  showIcon = true,
  onDismiss,
}: ErrorDisplayProps) {
  if (!error) {
    return null
  }

  const errorMessage = getUserErrorMessage(error)
  const severity = typeof error === 'object' && error?.code
    ? getErrorSeverity(error.code)
    : 'error'
  const field = typeof error === 'object' && error?.code
    ? getErrorField(error.code)
    : null

  // スタイルの決定
  const severityStyles = {
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  }

  const iconStyles = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  }

  return (
    <div
      className={`p-4 rounded-lg border ${severityStyles[severity]} ${className} ${
        field ? 'mb-2' : ''
      }`}
      role="alert"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className={`flex-shrink-0 mr-3 ${iconStyles[severity]}`}>
            {severity === 'error' && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {severity === 'warning' && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {severity === 'info' && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium">{errorMessage}</p>
          {field && (
            <p className="text-sm mt-1 opacity-75">
              {field === 'steps' && '回復ステップのセクションを確認してください'}
              {field === 'title' && 'タイトルのセクションを確認してください'}
              {field === 'summary' && '概要のセクションを確認してください'}
              {field === 'currentStatus' && '現在の状況のセクションを確認してください'}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="エラーを閉じる"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
