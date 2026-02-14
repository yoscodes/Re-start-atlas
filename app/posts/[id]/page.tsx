/**
 * 投稿詳細ページ
 * 7ブロック構成: スクロールするほど「時間が進む」構成
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostDetail, getSimilarPosts, getCommonFailedReasons } from '@/lib/actions/post-detail'
import PostDetailHeader from '@/components/PostDetailHeader'
import PostDetailStats from '@/components/PostDetailStats'
import PostDetailReason from '@/components/PostDetailReason'
import PostDetailSteps from '@/components/PostDetailSteps'
import PostDetailTurningPoint from '@/components/PostDetailTurningPoint'
import PostDetailCurrentStatus from '@/components/PostDetailCurrentStatus'
import PostDetailMessage from '@/components/PostDetailMessage'
import PostCommonFailures from '@/components/PostCommonFailures'
import PostInitialMisconception from '@/components/PostInitialMisconception'
import PostRecommendations from '@/components/PostRecommendations'
import PhaseUpgradeGuide from '@/components/PhaseUpgradeGuide'
import PostHiddenWarning from '@/components/PostHiddenWarning'
import ReportPostLink from '@/components/ReportPostLink'
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

/** 投稿者本人かどうか（編集リンク表示用） */
async function isCurrentUserAuthor(postId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('recovery_posts')
    .select('user_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .single()

  return data?.user_id === user.id
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params
  const result = await getPostDetail(id)

  if (!result.success) {
    notFound()
  }

  const post = result.post
  const [userPhaseLevel, isAuthor] = await Promise.all([
    getUserPhaseLevel(),
    isCurrentUserAuthor(post.id),
  ])

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

  // 似た状況の投稿を取得（レコメンド）
  const similarPostsResult = await getSimilarPosts(post.id, 3)
  const similarPosts = similarPostsResult.success ? similarPostsResult.posts : []

  // よくある失敗の傾向（非数値）を取得
  const commonFailedReasons = await getCommonFailedReasons(post.problem_category)

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 投稿者本人のみ編集リンク（静かな導線） */}
      {isAuthor && (
        <div className="mb-6 text-right">
          <Link
            href={`/posts/${post.id}/edit`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            投稿を編集
          </Link>
        </div>
      )}

      {/* [A] ヘッダー */}
      <PostDetailHeader post={post} />

      {/* 非公開警告（投稿者本人のみ） */}
      {isAuthor && post.is_hidden && <PostHiddenWarning />}

      {/* 詳細ページの"入り口"を1段落で固定 */}
      {/* フェーズに依存しない、説明しすぎない、世界観を一気に揃える */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 italic">
        この投稿は、ある人が「詰んだ瞬間」から回復するまでの記録です。
      </p>

      {/* [B] 当時の状況（数字） */}
      <PostDetailStats post={post} />

      {/* [C] 詰んだ理由（言語化） */}
      <PostDetailReason 
        content={post.summary} 
        isBlurred={shouldBlurReason}
      />

      {/* ぼかし表示時のメッセージ（固定文言） */}
      {post.is_summary_only && (
        <>
          <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
              {PHASE_LOCK_MESSAGE.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {PHASE_LOCK_MESSAGE.description}
            </p>
          </div>
          
          {/* フェーズアップ導線（なぜ見れないか・どうすれば解除されるのか） */}
          <PhaseUpgradeGuide
            currentPhaseLevel={userPhaseLevel}
            postPhaseLevel={post.phase_at_post as PhaseLevel}
            isLocked={post.is_summary_only}
          />
        </>
      )}

      {/* ロック直前の予告ライン（落胆させない） */}
      {/* 「読めなかった」ではなく「ここまで来た自分」を肯定する */}
      {post.is_summary_only && shouldBlurSteps && (
        <div className="mb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 italic">
            ここから先は、回復のプロセスがより具体になります。
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

      {/* 「最初に誤解していたこと」（個人の内側のズレ） */}
      {/* 読み切った人だけが辿り着く、感情が落ち着いたあと */}
      {/* 「自分の話」→「他人の集合知」への自然な移行 */}
      <PostInitialMisconception initialMisconception={post.initial_misconception} />

      {/* よくある失敗の傾向（非数値）（集合知） */}
      {commonFailedReasons && (
        <PostCommonFailures failedReasons={commonFailedReasons} />
      )}

      {/* 似た状況の投稿レコメンド */}
      <PostRecommendations posts={similarPosts} />

      {/* フッター: 通報リンク（静かに） */}
      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
        <ReportPostLink postId={post.id} />
      </footer>
    </main>
  )
}
