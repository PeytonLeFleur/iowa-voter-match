import type { Metadata } from 'next'
import Link from 'next/link'
import PageIntro from '@/components/PageIntro'
import { getDataset } from '@/data/load'
import { coverage } from '@/lib/analytics/coverage'
import { formatRatio } from '@/lib/percent'

export const metadata: Metadata = { title: 'Candidates' }

export default function CandidatesPage() {
  const ds = getDataset()
  const qids = ds.questions.map((q) => q.id)
  const byLastName = [...ds.candidates].sort((a, b) => a.sortName.localeCompare(b.sortName))
  return (
    <>
      <PageIntro eyebrow="Research directory" title="Candidates">
        Each candidate’s documented statements, proposals, and actions, with original sources. Listed alphabetically by last name.
      </PageIntro>
      <ul className="grid gap-px border border-rule bg-rule md:grid-cols-2">
        {byLastName.map((c) => (
          <li key={c.id} className="bg-paper p-6">
            <h2 className="text-3xl"><Link href={`/candidates/${c.slug}/`} className="text-ink no-underline hover:underline">{c.name}</Link></h2>
            <p className="mt-1 text-sm text-muted">{c.party} nominee · Running mate: {c.runningMate}</p>
            <p className="mt-3 text-ink-soft">{c.summary}</p>
            <p className="mt-3 text-sm text-muted">Documented positions on {formatRatio(coverage(c.id, qids, ds.positions).documented, 'of the 20 assessment questions')}.</p>
            <Link href={`/candidates/${c.slug}/`} className="mt-3 inline-block text-sm">View source profile</Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm text-muted">
        Differences in the number of documented positions reflect what material exists (for example, published plans or an official
        record), not candidate quality or how hard each was researched. Minor-party candidates were not researched.
      </p>
    </>
  )
}
