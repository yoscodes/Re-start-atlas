'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Component 用の Supabase クライアントフック。
 * マウント後、さらにイベントループ1ティック遅延してからクライアントを作成し、
 * "Access to storage is not allowed from this context" を防ぎます。
 * （ハイドレーション直後の文脈ではストレージがブロックされる環境があるため）
 */
export function useSupabaseClient(): SupabaseClient | null {
  const [client, setClient] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setClient(createClient())
      } catch (e) {
        console.error('[useSupabaseClient] createClient failed:', e)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [])

  return client
}
