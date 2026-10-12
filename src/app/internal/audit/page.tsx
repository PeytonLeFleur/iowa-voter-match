import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { checkIntegrity } from '@/data/integrity'
import { getDataset } from '@/data/load'

export const metadata: Metadata = { title: 'Data audit', robots: { index: false, follow: false } }

function rawResearch() {
  const dir = join(process.cwd(), 'research', 'raw')
  return readdirSync(dir).filter((f) => /\.(md|txt)$/.test(f)).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n\n')
}

/** Internal review page: validation results and every editorial draft awaiting sign-off. */
export default function AuditPage() {
  const ds = getDataset()
  const { errors, warnings } = checkIntegrity(ds, rawResearch())
  const drafts = ds.positions.filter((p) => p.reviewStatus === 'draft' && p.optionRelations)
  return (
    <article className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Internal</p>
      <h1 className="mt-2 text-4xl">Data audit</h1>
      <p className="mt-3 text-ink-soft">
        Dataset {ds.meta.datasetVersion} ({ds.meta.status}) · {ds.issues.length} issues · {ds.questions.length} questions ·{' '}
        {ds.statements.length} statements · {ds.positions.length} positions · {ds.sources.length} sources
      </p>
      <p className="mt-2 font-medium">{errors.length} errors · {warnings.length} warnings</p>

      <section className="mt-10">
        <h2 className="text-2xl">Editorial drafts awaiting review ({drafts.length})</h2>
        <p className="mt-1 text-sm text-muted">How each documented stance was mapped to the policy options. Review each rationale against its cited statements.</p>
        <div className="mt-4 space-y-6">
          {drafts.map((p) => {
            const q = ds.questions.find((x) => x.id === p.questionId)!
            return (
              <div key={p.id} className="border-t border-rule pt-3 text-sm">
                <p className="font-medium">{q.order}. {q.title} · {ds.candidates.find((c) => c.id === p.candidateId)?.name} · {p.evidenceClass}</p>
                <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
                  {q.options.map((o) => <li key={o.id}><span className="text-muted">{o.label}:</span> {p.optionRelations![o.id]}</li>)}
                </ul>
                <p className="mt-1 text-ink-soft">{p.relationRationale}</p>
                <p className="mt-1 text-xs text-muted">Statements: {p.statementIds.join(', ')}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Warnings</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {warnings.map((w, i) => <li key={i}><code>{w.rule}</code> {w.entity}: {w.message}</li>)}
        </ul>
      </section>
    </article>
  )
}
