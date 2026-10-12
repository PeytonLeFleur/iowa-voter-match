import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'Assessment' }

export default function AssessmentPage() {
  return (
    <>
      <PageIntro eyebrow="20 questions" title="Your Iowa priorities">
        For each issue, tell us how important it is to you and which direction you think Iowa should take.
      </PageIntro>
      <InProgress what="The assessment" />
    </>
  )
}
