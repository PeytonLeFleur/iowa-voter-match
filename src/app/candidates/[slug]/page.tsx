import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CodeList from '@/components/evidence/CodeList'
import EvidenceBadge from '@/components/evidence/EvidenceBadge'
import { getDataset } from '@/data/load'
import { coverage } from '@/lib/analytics/coverage'
import { evidenceState } from '@/lib/compare'
import { EVIDENCE_CODES, evidenceLabel } from '@/lib/evidence'
import { issueName } from '@/lib/issues'
import { formatRatio, ratio } from '@/lib/percent'
import { formatDate } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return getDataset().candidates.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: getDataset().candidates.find((c) => c.slug === slug)?.name ?? 'Candidate' }
}

export default async function CandidatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ds = getDataset()
  const c = ds.candidates.find((x) => x.slug === slug)
  if (!c) notFound()
  const cov = coverage(c.id, ds.questions.map((q) => q.id), ds.positions)
  const ev = ds.issueEvidence.filter((e) => e.candidateId === c.id)
  const primary = (codes: string[]) => codes[0]

  return (
    <article className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent"><Link href="/candidates/" className="text-accent no-underline">Candidates</Link></p>
      <h1 className="mt-2 text-5xl">{c.name}</h1>
      <p className="mt-2 text-muted">{c.party} nominee for governor · {c.role} · Running mate: {c.runningMate}</p>
      <p className="mt-4 max-w-3xl text-lg text-ink-soft">{c.summary}</p>
      {c.campaignUrl && <p className="mt-2 text-sm">Campaign site: <a href={c.campaignUrl} rel="noopener noreferrer">{c.campaignUrl.replace(/^https?:\/\//, '')}</a></p>}

      <section className="mt-12">
        <h2 className="text-2xl">Positions on the 20 assessment questions</h2>
        <p className="mt-1 text-sm text-muted">Documented positions on {formatRatio(cov.documented, 'questions')}. Research current as of {formatDate(ds.meta.researchCutoff)}.</p>
        <ol className="mt-4 divide-y divide-rule border-y border-rule">
          {ds.questions.map((q) => {
            const p = ds.positions.find((x) => x.candidateId === c.id && x.questionId === q.id)
            const st = evidenceState(p)
            return (
              <li key={q.id} className="grid gap-2 py-3 sm:grid-cols-[14rem_12rem_1fr]">
                <Link href={`/compare/#${q.slug}`} className="font-medium">{q.order}. {q.title}</Link>
                <span><EvidenceBadge state={st} /></span>
                <span className={`text-sm ${st === 'not-found' ? 'text-unknown' : 'text-ink-soft'}`}>{p?.positionSummary ?? 'No public position found.'}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Evidence across all 107 framework issues</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
          {EVIDENCE_CODES.map((code) => {
            const n = ev.filter((e) => primary(e.evidenceCodes) === code).length
            return n ? <li key={code}>{evidenceLabel(code)}: {formatRatio(ratio(n, ev.length), 'issues')}</li> : null
          })}
        </ul>
        <p className="mt-1 text-xs text-muted">Counted by the first evidence code the research lists for each issue.</p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Show all 107 issues</summary>
          <ul className="mt-3 divide-y divide-rule border-y border-rule text-sm">
            {ev.map((e) => {
              const i = ds.issues.find((x) => x.id === e.issueId)!
              return (
                <li key={e.id} className="grid gap-1 py-2 sm:grid-cols-[16rem_1fr]">
                  <Link href={`/issues/${i.slug}/`}>{i.id} {issueName(i)}</Link>
                  <span><CodeList codes={e.evidenceCodes} />{e.detail && <span className="ml-2 text-ink-soft">{e.detail}</span>}</span>
                </li>
              )
            })}
          </ul>
        </details>
      </section>

      {c.unansweredTopics.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl">Questions the research could not answer</h2>
          <ul className="mt-3 list-disc pl-5 text-ink-soft">{c.unansweredTopics.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}
    </article>
  )
}
