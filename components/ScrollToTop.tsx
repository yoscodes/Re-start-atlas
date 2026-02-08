/**
 * ページ遷移時にスクロール位置をトップに固定するコンポーネント
 * 一覧→詳細遷移のUX調整の一部
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // ページ遷移時にスクロール位置をトップに固定
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
