import { Suspense } from 'react'
import OnboardingClient from './OnboardingClient'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">読み込み中...</div>}>
      <OnboardingClient />
    </Suspense>
  )
}

