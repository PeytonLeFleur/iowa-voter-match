import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import InProgress from '@/components/InProgress'

export const metadata: Metadata = { title: 'Compare' }

export default function ComparePage() {
  return (
    <>
      <PageIntro eyebrow="Evidence" title="Compare documented positions">
        Your position next to each candidate’s documented record, with sources, dates, and what remains unknown.
      </PageIntro>
      <InProgress what="The candidate evidence comparison" />
    </>
  )
}
