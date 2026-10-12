import type { Metadata } from 'next'
import CompareView from '@/components/compare/CompareView'
import { getClientData } from '@/lib/client-data'

export const metadata: Metadata = { title: 'Compare' }

export default function ComparePage() {
  return <CompareView data={getClientData()} />
}
