'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type StuckAnswer = 'yes' | 'unsure' | null

type OnboardingStateV1 = {
  answer: StuckAnswer
  tags: string[]
  phase: 'lv1'
  updatedAt: string
}

const LS_KEY = 'restartAtlas:onboarding:v1'
const LS_COMPLETED_KEY = 'restartAtlas:onboarding_completed'

const TAG_OPTIONS = [
  'お金のこと',
  '仕事・将来',
  '学校・中退',
  '人間関係',
  '生活が回らない',
  'うまく言えない',
] as const

function markCompleted() {
  try {
    localStorage.setItem(LS_COMPLETED_KEY, 'true')
  } catch {
    // noop
  }
}

function isCompleted(): boolean {
  try {
    return localStorage.getItem(LS_COMPLETED_KEY) === 'true'
  } catch {
    return false
  }
}

export default function OnboardingClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [answer, setAnswer] = useState<StuckAnswer>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [limitHit, setLimitHit] = useState(false)
  const [skipping, setSkipping] = useState(false)

  // ① オンボーディング再表示条件
  // - /onboarding?auto=1 のときのみ、completed があればスキップ
  // - URL直打ち（autoなし）では常に見られる
  useEffect(() => {
    const isAuto = searchParams.get('auto') === '1'
    if (!isAuto) return
    if (!isCompleted()) return

    setSkipping(true)
    router.replace('/posts')
  }, [router, searchParams])

  // 前回選択の復元（completed とは独立）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<OnboardingStateV1>
      if (parsed.phase !== 'lv1') return
      if (parsed.answer === 'yes' || parsed.answer === 'unsure' || parsed.answer === null) {
        setAnswer(parsed.answer ?? null)
      }
      if (Array.isArray(parsed.tags)) {
        setSelectedTags(parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 3))
      }
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    const state: OnboardingStateV1 = {
      answer,
      tags: selectedTags,
      phase: 'lv1',
      updatedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      // noop
    }
  }, [answer, selectedTags])

  const toggleTag = (tag: string) => {
    setLimitHit(false)
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 3) {
        setLimitHit(true)
        return prev
      }
      return [...prev, tag]
    })
  }

  const postsHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('phase', 'lv1')
    selectedTags.forEach((t) => params.append('tags', t))
    const qs = params.toString()
    return qs ? `/posts?${qs}` : '/posts'
  }, [selectedTags])

  const draftHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('phase', 'lv1')
    selectedTags.forEach((t) => params.append('tags', t))
    const qs = params.toString()
    return qs ? `/draft/new?${qs}` : '/draft/new'
  }, [selectedTags])

  if (skipping) return null

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* ① 一文（世界観の固定） */}
        <div className="space-y-6">
          <p className="text-xl leading-relaxed text-gray-900 dark:text-gray-100">
            詰んだと感じた瞬間から、
            <br />
            立て直し始めるまでの記録があります。
          </p>
        </div>

        {/* ② 静かな問い（Yes / No） ※「いいえ」は置かない */}
        <section className="mt-12">
          <p className="text-base text-gray-800 dark:text-gray-200 mb-4">
            いま、少し行き詰まっていますか？
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAnswer('yes')}
              className={`px-4 py-2 rounded border transition text-sm ${
                answer === 'yes'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              はい
            </button>
            <button
              type="button"
              onClick={() => setAnswer('unsure')}
              className={`px-4 py-2 rounded border transition text-sm ${
                answer === 'unsure'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              わからない
            </button>
          </div>
        </section>

        {/* ③ 状態チェック（選択は3つまで） */}
        <section className="mt-12">
          <p className="text-base text-gray-800 dark:text-gray-200 mb-2">
            近いものを選んでください（複数可）
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            3つまで
          </p>

          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded border text-sm transition ${
                    active
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>

          {limitHit && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              いまは3つまでで大丈夫です。
            </p>
          )}
        </section>

        {/* ④ 位置づけの提示（診断ではない／断定しない） */}
        <section className="mt-12 space-y-3">
          <p className="text-base text-gray-800 dark:text-gray-200">
            似た状態の人は、
            <br />
            ここから立て直し始めています。
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            今は、近い状態かもしれません。
          </p>
        </section>

        {/* ⑤ 次の一歩（強制しない） */}
        <section className="mt-12">
          <div className="grid gap-3">
            <Link
              href={postsHref}
              onClick={() => markCompleted()}
              className="block w-full text-center px-4 py-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              同じ状態の記録を見る
            </Link>
            <Link
              href={draftHref}
              onClick={() => markCompleted()}
              className="block w-full text-center px-4 py-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              自分の状況をメモとして残す（非公開）
            </Link>
          </div>

          {/* ③ 何も選ばなかった人の逃げ道（小さく） */}
          <div className="mt-10">
            <Link
              href="/posts"
              onClick={() => markCompleted()}
              className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              今は、何も選ばずに見てみる
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

