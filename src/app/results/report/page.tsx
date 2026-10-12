import type { Metadata } from 'next'
import ResearchBrief from '@/components/report/ResearchBrief'
import { getClientData } from '@/lib/client-data'

export const metadata: Metadata = { title: 'My research brief' }

export default function ReportPage() {
  return <ResearchBrief data={getClientData()} />
}
