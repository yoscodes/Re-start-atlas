/**
 * 投稿詳細ページ
 * 7ブロック構成: スクロールするほど「時間が進む」構成
 */

import { notFound } from 'next/navigation'
import { getPostDetail } from '@/lib/actions/post-detail'
import PostDetailHeader from '@/components/PostDetailHeader'
import PostDetailStats from '@/components/PostDetailStats'
import PostDetailReason from '@/components/PostDetailReason'
import PostDetailSteps from '@/components/PostDetailSteps'
import PostDetailTurningPoint from '@/components/PostDetailTurningPoint'
import PostDetailCurrentStatus from '@/components/PostDetailCurrentStatus'
import PostDetailMessage from '@/components/PostDetailMessage'
import { getPostVisibilityWithRPCFlag } from '@/lib/domain/visibility'
import { shouldBlurSection, PHASE_VISIBILITY_CONFIG, PHASE_LOCK_MESSAGE } from '@/lib/domain/phase-visibility'
import type { PhaseLevel } from '@/lib/utils/phase'
import { createClient } from '@/lib/supabase/server'

interface PostDetailPageProps {
  params: Promise<{ id: string }>
}

async function getUserPhaseLevel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('phase_level')
    .eq('id', user.id)
    .single()

  return userProfile?.phase_level ?? null
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params
  const result = await getPostDetail(id)

  if (!result.success) {
    notFound()
  }

  const post = result.post
  const userPhaseLevel = await getUserPhaseLevel()

  // フェーズ制御: Lv1ユーザーがLv3投稿を見る場合
  const visibility = getPostVisibilityWithRPCFlag(
    (userPhaseLevel ?? 1) as PhaseLevel,
    post.phase_at_post as PhaseLevel,
    post.is_summary_only
  )

  // 各セクションのぼかし判定（境界値を定数化）
  const shouldBlurReason = shouldBlurSection(post.is_summary_only, PHASE_VISIBILITY_CONFIG.SECTION_LEVELS.REASON)
  const shouldBlurSteps = shouldBlurSection(post.is_summary_only, PHASE_VISIBILITY_CONFIG.SECTION_LEVELS.STEPS)
  const shouldBlurTurningPoint = shouldBlurSection(post.is_summary_only, PHASE_VISIBILITY_CONFIG.SECTION_LEVELS.TURNING_POINT)
  const shouldBlurCurrentStatus = shouldBlurSection(post.is_summary_only, PHASE_VISIBILITY_CONFIG.SECTION_LEVELS.CURRENT_STATUS)
  const shouldBlurMessage = shouldBlurSection(post.is_summary_only, PHASE_VISIBILITY_CONFIG.SECTION_LEVELS.MESSAGE)

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* [A] ヘッダー */}
      <PostDetailHeader post={post} />

      {/* [B] 当時の状況（数字） */}
      <PostDetailStats post={post} />

      {/* [C] 詰んだ理由（言語化） */}
      <PostDetailReason 
        content={post.summary} 
        isBlurred={shouldBlurReason}
      />

      {/* ぼかし表示時のメッセージ（固定文言） */}
      {post.is_summary_only && (
        <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
            {PHASE_LOCK_MESSAGE.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {PHASE_LOCK_MESSAGE.description}
          </p>
        </div>
      )}

      {/* [D] 行動ログ */}
      <PostDetailSteps 
        steps={post.steps} 
        isBlurred={shouldBlurSteps}
      />

      {/* [E] 転機ポイント */}
      <PostDetailTurningPoint 
        steps={post.steps} 
        isBlurred={shouldBlurTurningPoint}
      />

      {/* [F] 今の状態 */}
      <PostDetailCurrentStatus 
        post={post} 
        isBlurred={shouldBlurCurrentStatus}
      />

      {/* [G] 過去の自分へ */}
      <PostDetailMessage 
        post={post} 
        isBlurred={shouldBlurMessage}
      />
    </main>
  )
}
