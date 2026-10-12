import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'Issues' }

export default function IssuesPage() {
  return (
    <>
      <PageIntro eyebrow="Issue explorer" title="Iowa’s policy issues">
        Search and filter every issue in the research database, with the current legal framework, policy
        alternatives, and each candidate’s statements.
      </PageIntro>
      <InProgress what="The issue explorer" />
    </>
  )
}
