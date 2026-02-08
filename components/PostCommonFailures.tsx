/**
 * よくある失敗の傾向（非数値）コンポーネント
 * 目的: 「あ、これ多いんだ」と気づかせる（数を出さない）
 * 
 * 絶対にやらないこと:
 * - 教育しない
 * - 行動を指示しない
 * - 数で殴らない
 * - 自分を責めさせない
 * - 他人事にもしない
 */

interface PostCommonFailuresProps {
  failedReasons: string[]
}

/**
 * 失敗理由タイプを表示用の文言に変換
 * DBに保存されている値（例: "情報不足（調べなかった）"）を
 * より読みやすい形式に変換
 */
function formatFailedReasonType(type: string): string {
  // 括弧内の説明を削除して、より自然な表現に
  // 例: "情報不足（調べなかった）" → "焦って十分に調べないまま決断してしまう"
  const typeMap: Record<string, string> = {
    '情報不足（調べなかった）': '焦って十分に調べないまま決断してしまう',
    '情報不足': '焦って十分に調べないまま決断してしまう',
    '焦り・短絡判断': '焦って十分に調べないまま決断してしまう',
    '人に頼らなかった': '一人で抱え込み、誰にも相談しなかった',
    '環境に甘えた': '環境が変わるのを待ち続けてしまった',
    'その他': 'その他の理由',
  }

  // 完全一致を優先
  if (typeMap[type]) {
    return typeMap[type]
  }

  // 部分一致で検索
  for (const [key, value] of Object.entries(typeMap)) {
    if (type.includes(key) || key.includes(type)) {
      return value
    }
  }

  // マッピングがない場合は、そのまま返す（ただし括弧内は削除）
  return type.replace(/（.*?）/g, '').trim()
}

export default function PostCommonFailures({ failedReasons }: PostCommonFailuresProps) {
  // 空配列なら何も表示しない
  if (!failedReasons || failedReasons.length === 0) {
    return null
  }

  return (
    <div className="mb-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* 見出し（固定文言） */}
      {/* 意味は変えず、トーンだけ1段抽象化（SNS引用耐性を上げる） */}
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
        似た状況で、多くの人がつまずいた点
      </h3>

      {/* 本文（箇条書き） */}
      <ul className="space-y-2">
        {failedReasons.map((reason, index) => (
          <li
            key={index}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {/* 箇条書き（・） */}
            <span className="mr-2">・</span>
            {formatFailedReasonType(reason)}
          </li>
        ))}
      </ul>
    </div>
  )
}
