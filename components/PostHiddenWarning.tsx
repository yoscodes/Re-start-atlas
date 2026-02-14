/**
 * 非公開警告文（投稿者本人のみ表示）
 * 思想: 「違反」「通報された」は言わない。評価しない。
 */

interface PostHiddenWarningProps {
  className?: string
}

export default function PostHiddenWarning({ className = '' }: PostHiddenWarningProps) {
  return (
    <div className={`mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        この投稿は、現在公開されていません。
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        内容に確認が必要なため、表示を制限しています。
      </p>
    </div>
  )
}
