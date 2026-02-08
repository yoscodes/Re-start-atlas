/**
 * 「最初に誤解していたこと」コンポーネント
 * 目的: 個人の内側のズレを1つだけ可視化する
 * 
 * 思想:
 * - 教訓・HowToではなく、当時の認識のズレを共有
 * - 後出しの正解を言わない
 * - 行動に落とさない
 * - 読む側は「自分も、今こう勘違いしてないか？」と静かに内省するだけ
 * 
 * 絶対にやらないこと:
 * - 「〇〇すべきだった」「こうすればよかった」「学び」などの教訓
 * - 複数表示
 * - よくある誤解ランキング
 * - 読者向けアドバイス
 */

interface PostInitialMisconceptionProps {
  initialMisconception: string | null
}

export default function PostInitialMisconception({ initialMisconception }: PostInitialMisconceptionProps) {
  // なければ表示しない（ログは詳細ページ側で記録）
  if (!initialMisconception || initialMisconception.trim() === '') {
    return null
  }

  // テキストを「。」で分割して文を判定
  const sentences = initialMisconception
    .split('。')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + '。') // 分割時に削除された「。」を復元

  // 2文を超えた場合（3文以上）は、1文目と2文目を分けて表示
  const shouldSplit = sentences.length > 2
  const firstSentence = shouldSplit ? sentences[0] : null
  const secondSentence = shouldSplit ? sentences[1] : null
  const remainingText = shouldSplit 
    ? sentences.slice(2).join('') 
    : initialMisconception

  return (
    <div className="mb-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* 見出し（固定文言） */}
      {/* 「間違い」「失敗」「原因」は使わない。「勘違い」は責めない語彙 */}
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
        当時、本人が勘違いしていたこと
      </h3>

      {/* 本文（読みやすさの微調整） */}
      {/* 2文を超えた場合、1文目と2文目の間に改行と余白を追加 */}
      {/* 色は通常より少し薄い、アイコン・強調なし */}
      {shouldSplit ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {firstSentence}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            {secondSentence}
          </p>
          {remainingText && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {remainingText}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {initialMisconception}
        </p>
      )}
    </div>
  )
}
