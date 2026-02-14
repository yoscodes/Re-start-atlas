'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type DraftV1 = {
  text: string
  phase: 'lv1'
  tags: string[]
  createdAt: string
  updatedAt: string
}

const LS_KEY = 'restartAtlas:draft:v1:current'
const LS_ONBOARDING_KEY = 'restartAtlas:onboarding:v1'

function parseTagsFromSearchParams(sp: ReturnType<typeof useSearchParams>) {
  const raw = [
    ...sp.getAll('tags'),
    ...(sp.get('tags') ? [sp.get('tags') as string] : []),
  ]
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean)
  return Array.from(new Set(raw)).slice(0, 3)
}

export default function DraftNewClient() {
  const searchParams = useSearchParams()
  const initialTags = useMemo(() => parseTagsFromSearchParams(searchParams), [searchParams])

  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>(initialTags)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // 既存ドラフト or オンボーディング状態を読み込み
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(LS_KEY)
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as Partial<DraftV1>
        if (typeof parsed.text === 'string') setText(parsed.text)
        if (Array.isArray(parsed.tags)) {
          setTags(parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 3))
        }
        return
      }
    } catch {
      // noop
    }

    try {
      const rawOnb = localStorage.getItem(LS_ONBOARDING_KEY)
      if (!rawOnb) return
      const parsed = JSON.parse(rawOnb) as { tags?: unknown }
      if (Array.isArray(parsed.tags)) {
        const t = parsed.tags.filter((x): x is string => typeof x === 'string').slice(0, 3)
        if (t.length > 0) setTags(t)
      }
    } catch {
      // noop
    }
  }, [])

  // クエリtagsがある場合は上書き（画面遷移時の意図を優先）
  useEffect(() => {
    if (initialTags.length > 0) setTags(initialTags)
  }, [initialTags])

  // 自動保存（localStorage）
  useEffect(() => {
    const now = new Date().toISOString()
    const timer = setTimeout(() => {
      try {
        const existing = localStorage.getItem(LS_KEY)
        let createdAt = now
        if (existing) {
          try {
            const parsed = JSON.parse(existing) as Partial<DraftV1>
            if (typeof parsed.createdAt === 'string') createdAt = parsed.createdAt
          } catch {
            // noop
          }
        }

        const payload: DraftV1 = {
          text,
          phase: 'lv1',
          tags,
          createdAt,
          updatedAt: now,
        }
        localStorage.setItem(LS_KEY, JSON.stringify(payload))
        setSavedAt(now)
      } catch {
        // noop
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [text, tags])

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            メモ（非公開）
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            保存したい場合は、あとで登録できます。
          </p>
        </div>

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="いまの状況を、メモとして。"
            rows={10}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 focus:border-transparent"
          />
          {savedAt && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              この端末に残っています。
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Link
            href="/onboarding"
            className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            戻る
          </Link>
          <Link
            href="/posts"
            className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            記録を見る
          </Link>
        </div>
      </div>
    </main>
  )
}

