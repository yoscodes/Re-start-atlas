import { Suspense } from 'react'
import DraftNewClient from './DraftNewClient'

export default function DraftNewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">読み込み中...</div>}>
      <DraftNewClient />
    </Suspense>
  )
}

