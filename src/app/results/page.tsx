import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'My results' }

export default function ResultsPage() {
  return (
    <>
      <PageIntro eyebrow="Your profile" title="Your priorities">
        Your own answers come first, before any candidate information.
      </PageIntro>
      <InProgress what="Your personal analytics" />
    </>
  )
}
