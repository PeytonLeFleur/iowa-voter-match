import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CodeList from '@/components/evidence/CodeList'
import StatementItem from '@/components/evidence/StatementItem'
import { getDataset } from '@/data/load'
import { chronological, EVIDENCE_STATE_COPY } from '@/lib/compare'
import { issueName, issueTitlePending } from '@/lib/issues'
import { formatDate } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return getDataset().issues.map((i) => ({ slug: i.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const i = getDataset().issues.find((x) => x.slug === slug)
  return { title: i ? `${i.id} ${issueName(i)}` : 'Issue' }
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ds = getDataset()
  const issue = ds.issues.find((i) => i.slug === slug)
  if (!issue) notFound()
  const category = ds.categories.find((c) => c.id === issue.categoryId)
  const related = ds.questions.filter((q) => q.issueIds.includes(issue.id))
  const laws = ds.legislation.filter((l) => issue.legislationIds.includes(l.id))
  const cutoff = formatDate(ds.meta.researchCutoff)
  const idx = ds.issues.findIndex((i) => i.id === issue.id)
  const prev = ds.issues[idx - 1]
  const next = ds.issues[idx + 1]

  return (
    <article className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        <Link href="/issues/" className="text-accent no-underline">Issues</Link> · {category?.name} · {issue.id}
      </p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{issueName(issue)}</h1>
      {issueTitlePending(issue) && (
        <p className="mt-4 text-ink-soft">The candidate research refers to this issue only by its framework number. Its title and description are pending the issue framework document.</p>
      )}
      {issue.groupTitle && issue.title && <p className="mt-2 text-ink-soft">Covered in the research together under “{issue.groupTitle}.”</p>}

      <div className="mt-10 space-y-10">
        {issue.legalFramework && (
          <section>
            <h2 className="text-2xl">Current Iowa legal framework</h2>
            <p className="mt-2 text-ink-soft">{issue.legalFramework}</p>
          </section>
        )}
        {laws.length > 0 && (
          <section>
            <h2 className="text-2xl">Related legislation</h2>
            <ul className="mt-2 space-y-1">
              {laws.map((l) => <li key={l.id}><strong>{l.citation}</strong>{l.summary && <span className="text-ink-soft">: {l.summary}</span>}</li>)}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-2xl">What the candidates have said</h2>
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            {ds.candidates.map((c) => {
              const ev = ds.issueEvidence.find((e) => e.issueId === issue.id && e.candidateId === c.id)
              const statements = chronological(ds.statements.filter((s) => s.candidateId === c.id && s.issueIds.includes(issue.id)))
              const ndpOnly = ev?.evidenceCodes.length === 1 && ev.evidenceCodes[0] === 'NDP'
              return (
                <div key={c.id} className="border-t-2 border-ink-soft pt-3">
                  <h3 className="font-serif text-xl">{c.name}</h3>
                  {ev && <p className="mt-2"><CodeList codes={ev.evidenceCodes} /></p>}
                  {ndpOnly ? (
                    <p className="mt-2 text-sm text-unknown">
                      {EVIDENCE_STATE_COPY['not-found'].explanation(cutoff)}{' '}
                      <Link href="/methodology/#unknown-positions" className="text-unknown">About research limitations</Link>
                    </p>
                  ) : (
                    ev?.detail && <p className="mt-2 text-sm text-ink-soft"><span className="text-xs font-semibold uppercase tracking-wide text-muted">Research summary: </span>{ev.detail}</p>
                  )}
                  {statements.length > 0 && (
                    <ul className="mt-4 space-y-4">
                      {statements.map((s) => <StatementItem key={s.id} s={s} source={ds.sources.find((x) => x.id === s.sourceId)} />)}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {(issue.similarities.length > 0 || issue.differences.length > 0) && (
          <section className="grid gap-6 md:grid-cols-2">
            {issue.similarities.length > 0 && <div><h2 className="text-xl">Documented similarity</h2><ul className="mt-2 list-disc pl-5 text-ink-soft">{issue.similarities.map((s) => <li key={s}>{s}</li>)}</ul></div>}
            {issue.differences.length > 0 && <div><h2 className="text-xl">Documented differences</h2><ul className="mt-2 list-disc pl-5 text-ink-soft">{issue.differences.map((s) => <li key={s}>{s}</li>)}</ul></div>}
          </section>
        )}

        {related.length > 0 && (
          <section>
            <h2 className="text-2xl">Policy alternatives</h2>
            {related.map((q) => (
              <details key={q.id} className="mt-3 border-y border-rule py-3" open={related.length === 1}>
                <summary className="cursor-pointer font-medium">Assessment question {q.order}: {q.prompt}</summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {q.options.map((o) => <li key={o.id}><strong>{o.label}.</strong> <span className="text-ink-soft">{o.description}</span></li>)}
                </ul>
                <p className="mt-3 text-sm"><Link href={`/compare/#${q.slug}`}>Compare documented positions</Link> · <Link href={`/assessment/?q=${q.order}`}>Answer this question</Link></p>
              </details>
            ))}
          </section>
        )}

        {issue.unansweredQuestions.length > 0 && (
          <section>
            <h2 className="text-2xl">Unanswered questions</h2>
            <ul className="mt-2 list-disc pl-5 text-ink-soft">{issue.unansweredQuestions.map((u) => <li key={u}>{u}</li>)}</ul>
          </section>
        )}

        <p className="text-sm text-muted">Research verified as of {cutoff}. <Link href="/sources/">All sources</Link>.</p>

        <nav aria-label="Adjacent issues" className="flex justify-between gap-4 border-t border-rule pt-4 text-sm">
          {prev ? <Link href={`/issues/${prev.slug}/`}>← {prev.id} {issueName(prev)}</Link> : <span />}
          {next ? <Link href={`/issues/${next.slug}/`}>{next.id} {issueName(next)} →</Link> : <span />}
        </nav>
      </div>
    </article>
  )
}
