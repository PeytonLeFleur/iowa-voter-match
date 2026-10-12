import type { Metadata } from 'next'
import { Suspense } from 'react'
import AssessmentFlow from '@/components/assessment/AssessmentFlow'
import { getDataset } from '@/data/load'
import { getClientData } from '@/lib/client-data'

export const metadata: Metadata = { title: 'Assessment' }

export default function AssessmentPage() {
  const { questions } = getClientData()
  const covered = new Set(questions.flatMap((q) => q.issueIds))
  // Named framework issues no question covers: rated for importance only.
  const otherIssues = getDataset().issues.filter((i) => !covered.has(i.id) && (i.title || i.groupTitle))
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <AssessmentFlow questions={questions} otherIssues={otherIssues} />
    </Suspense>
  )
}
