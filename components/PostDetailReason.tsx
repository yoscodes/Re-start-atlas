/**
 * [C] 詰んだ理由（言語化ゾーン）
 * 引用ブロック風、行間広め、「重さ」を感じる余白
 * 
 * 注意: 現時点では summary を使用。将来的に専用フィールドを追加する想定
 */

interface PostDetailReasonProps {
  content: string
  isBlurred?: boolean
}

export default function PostDetailReason({ content, isBlurred = false }: PostDetailReasonProps) {
  if (!content) {
    return null
  }

  return (
    <div className={`mb-8 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        詰んだ理由
      </h2>
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border-l-4 border-gray-400 dark:border-gray-600">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-base">
          {content}
        </p>
      </div>
    </div>
  )
}
