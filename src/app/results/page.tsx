import type { Metadata } from 'next'
import ResultsDashboard from '@/components/results/ResultsDashboard'
import { getClientData } from '@/lib/client-data'

export const metadata: Metadata = { title: 'My results' }

export default function ResultsPage() {
  return <ResultsDashboard data={getClientData()} />
}
