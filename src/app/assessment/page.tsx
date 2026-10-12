import type { Metadata } from 'next'
import { Suspense } from 'react'
import AssessmentFlow from '@/components/assessment/AssessmentFlow'
import { getClientData } from '@/lib/client-data'

export const metadata: Metadata = { title: 'Assessment' }

export default function AssessmentPage() {
  const { questions } = getClientData()
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <AssessmentFlow questions={questions} />
    </Suspense>
  )
}
