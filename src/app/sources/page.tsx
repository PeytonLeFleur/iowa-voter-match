import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'Sources' }

export default function SourcesPage() {
  return (
    <>
      <PageIntro eyebrow="Bibliography" title="Research sources">
        Every source used on this site, with its original link and date.
      </PageIntro>
      <InProgress what="The bibliography" />
    </>
  )
}
