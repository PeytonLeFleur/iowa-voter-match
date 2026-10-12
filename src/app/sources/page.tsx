import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'
import { getDataset } from '@/data/load'
import { formatDate, formatPartialDate } from '@/lib/site'

export const metadata: Metadata = { title: 'Sources' }

export default function SourcesPage() {
  const ds = getDataset()
  const rows = [...ds.sources]
    .map((s) => ({ s, n: ds.statements.filter((x) => x.sourceId === s.id).length }))
    .filter((r) => r.n > 0)
    .sort((a, b) => (b.s.publishedDate ?? '').localeCompare(a.s.publishedDate ?? ''))
  const withUrl = rows.filter((r) => r.s.url).length
  return (
    <>
      <PageIntro eyebrow="Bibliography" title="Research sources">
        Every source cited for a candidate statement, newest first. Research current as of {formatDate(ds.meta.researchCutoff)}.
      </PageIntro>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        {withUrl} of {rows.length} sources include an original link in the research. Sources without a link are named as the research
        cites them; statements the research did not attribute to any source are marked “Source not verified” wherever they appear.
      </p>
      <ol className="max-w-4xl divide-y divide-rule border-y border-rule">
        {rows.map(({ s, n }) => (
          <li key={s.id} id={s.id} className="py-3">
            <p className="font-medium">{s.url ? <a href={s.url} rel="noopener noreferrer">{s.title}</a> : s.title}</p>
            <p className="text-sm text-ink-soft">
              {[s.publisher, s.publishedDate ? formatPartialDate(s.publishedDate) : 'Date not given', `${n} statement${n === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            </p>
            {!s.url && <p className="text-xs text-muted">No original link in the research{s.originalCitation ? ` (cited as “${s.originalCitation}”)` : ''}.</p>}
          </li>
        ))}
      </ol>
    </>
  )
}
