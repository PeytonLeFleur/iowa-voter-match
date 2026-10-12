import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'Candidates' }

export default function CandidatesPage() {
  return (
    <>
      <PageIntro eyebrow="Research directory" title="Candidates">
        Each candidate’s documented statements, proposals, and actions, with original sources.
      </PageIntro>
      <InProgress what="Candidate source profiles" />
    </>
  )
}
