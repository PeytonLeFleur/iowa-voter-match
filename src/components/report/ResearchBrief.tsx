'use client'
import Link from 'next/link'
import { choiceLabel, importanceLabel } from '@/components/assessment/AssessmentFlow'
import {
  candidateCoverage, choiceOf, crossCandidate, importanceOf, importantUnknowns, matchOutcome, matchScore, positionFor,
  topPriorities, type Answers,
} from '@/lib/analytics'
import { effectiveAnswers } from '@/lib/assessment/assume'
import { useCandidateOrder } from '@/lib/assessment/candidate-order'
import { useAssessment } from '@/lib/assessment/store'
import { compare, EVIDENCE_STATE_COPY, evidenceState, RELATION_COPY } from '@/lib/compare'
import type { ClientData } from '@/lib/client-data'
import { formatRatio } from '@/lib/percent'
import { formatDate, formatPartialDate } from '@/lib/site'

/** Analytic 20: a personal research brief that prints cleanly and exports as Markdown or JSON. */
export default function ResearchBrief({ data }: { data: ClientData }) {
  const { state, hydrated } = useAssessment()
  const { ordered } = useCandidateOrder(data.candidates)
  const answers: Answers = effectiveAnswers(data.questions, state.answers)
  // Core questions always; deeper questions only where the voter has (or is assumed to have) an answer.
  const shownQuestions = data.questions.filter((q) => q.tier === 'core' || answers[q.id]?.choice != null)
  const cutoff = formatDate(data.meta.researchCutoff)
  if (!hydrated) return <p className="text-muted">Loading your answers…</p>

  const ranked = topPriorities(data.questions, answers)
  const top = ranked.filter((r) => r.rank <= 5)
  const cross = crossCandidate(data)
  const sourceOf = (id: string) => data.sources.find((s) => s.id === id)
  const usedSourceIds = [...new Set(data.positions.flatMap((p) => p.statementIds)
    .map((sid) => data.statements.find((s) => s.id === sid)!.sourceId))]

  const matches = ordered.map((c) => ({ c, m: matchScore(data, answers, c.id) }))
  const outcome = matchOutcome(matches.map((x) => x.m))
  const matchLine = (x: (typeof matches)[number]) =>
    `${x.c.name}: ${x.m.value === null ? 'no comparable positions' : `${Math.round(x.m.value * 100)}% agreement`}, based on ${x.m.basis} of ${x.m.eligible} issues where the position is documented.`
  const outcomeLine = outcome.kind === 'recommend'
    ? `Based on your answers, you should vote for ${data.candidates.find((c) => c.id === outcome.candidateId)!.name}${outcome.strength === 'narrow' ? ` (a narrow edge of ${outcome.margin} points)` : ` (by ${outcome.margin} points)`}.`
    : outcome.kind === 'tie' ? 'A dead heat: both candidates agree with you equally often.' : 'Not enough documented positions to compare yet.'

  const describe = (cid: string, qid: string) => {
    const p = positionFor(data.positions, cid, qid)
    const st = evidenceState(p)
    if (st === 'not-found') return `${EVIDENCE_STATE_COPY['not-found'].label}.`
    return `${EVIDENCE_STATE_COPY[st].label}. ${p?.positionSummary ?? ''}`
  }

  const toMarkdown = () => {
    const lines = [`# My Iowa Voter Match research brief`, '', `Research current as of ${cutoff}. Generated ${new Date().toLocaleDateString('en-US')}.`, '',
      '## Who I should vote for', '', outcomeLine, ...matches.map((x) => `- ${matchLine(x)}`),
      'Undocumented positions are left out of each percentage, not counted as disagreement.', '', '## My 20 answers', '']
    for (const q of shownQuestions) lines.push(`- **${q.title}**: ${importanceLabel(importanceOf(answers, q.id))}; ${choiceLabel(q, answers[q.id]?.choice)}${answers[q.id]?.assumedFrom ? ' (assumed)' : ''}`)
    lines.push('', '## Documented positions on my answers', '')
    for (const q of shownQuestions) {
      lines.push(`### ${q.order}. ${q.title}`, `You: ${choiceLabel(q, answers[q.id]?.choice)}`)
      for (const c of ordered) {
        const cmp = compare(choiceOf(answers, q), positionFor(data.positions, c.id, q.id))
        lines.push(`- ${c.name}: ${describe(c.id, q.id)}${cmp.kind === 'relation' ? ` (${RELATION_COPY[cmp.relation]})` : ''}`)
      }
      lines.push('')
    }
    lines.push('## Sources', '')
    for (const id of usedSourceIds) { const s = sourceOf(id)!; lines.push(`- ${s.title}${s.publisher ? `, ${s.publisher}` : ''}${s.publishedDate ? `, ${s.publishedDate}` : ''}${s.url ? ` <${s.url}>` : ' (no link in research)'}`) }
    return lines.join('\n')
  }

  const download = (name: string, body: string, type: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([body], { type }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <article className="mx-auto max-w-4xl print:max-w-none">
      <div className="no-print mb-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => window.print()} className="rounded bg-ink px-5 py-3 font-medium text-paper hover:bg-ink-soft">Print or save as PDF</button>
        <button type="button" onClick={() => download('iowa-voter-match-brief.md', toMarkdown(), 'text/markdown')} className="rounded border border-ink px-5 py-3 font-medium text-ink hover:bg-paper-deep">Download Markdown</button>
        <button type="button" onClick={() => download('iowa-voter-match-answers.json', JSON.stringify({ researchCutoff: data.meta.researchCutoff, answers }, null, 2), 'application/json')} className="rounded border border-ink px-5 py-3 font-medium text-ink hover:bg-paper-deep">Download my answers (JSON)</button>
        <Link href="/results/" className="self-center text-sm">Back to results</Link>
      </div>

      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Iowa Voter Match · Personal research brief</p>
        <h1 className="mt-2 text-4xl">My Iowa governor research brief</h1>
        <p className="mt-3 text-ink-soft">
          Research current as of {cutoff}. This brief summarizes your answers, each candidate’s documented positions, and how
          closely each matches you. “No public position found” means missing evidence, not opposition.
        </p>
      </header>

      <section className="mt-8 break-inside-avoid">
        <h2 className="text-2xl">Who I should vote for</h2>
        <p className="mt-2 font-medium">{outcomeLine}</p>
        <ul className="mt-2 space-y-1">{matches.map((x) => <li key={x.c.id}>{matchLine(x)}</li>)}</ul>
        <p className="mt-2 text-sm text-ink-soft">Weighted by your importance ratings. Undocumented positions are left out of each percentage, not counted as disagreement.</p>
      </section>

      <section className="mt-8 break-inside-avoid">
        <h2 className="text-2xl">My most important issues</h2>
        {top.length === 0 ? <p className="mt-2 text-muted">No issues rated.</p> : (
          <ol className="mt-3 list-decimal space-y-1 pl-6">
            {top.map((r) => <li key={r.item.id}><strong>{r.item.title}</strong> ({importanceLabel(r.importance)}): {choiceLabel(r.item, answers[r.item.id]?.choice)}</li>)}
          </ol>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Research coverage</h2>
        <ul className="mt-2 space-y-1">
          {ordered.map((c) => <li key={c.id}>{c.name}: documented positions on {formatRatio(candidateCoverage(data, c.id, data.questions.filter((q) => q.tier === 'core').map((q) => q.id)).documented, 'of the 20 main questions')}.</li>)}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">My answers and the documented record</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="py-2 pr-3">Question</th>
              <th scope="col" className="py-2 pr-3">You</th>
              {ordered.map((c) => <th key={c.id} scope="col" className="py-2 pr-3">{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {shownQuestions.map((q) => (
              <tr key={q.id} className="break-inside-avoid border-b border-rule align-top">
                <th scope="row" className="py-2 pr-3 font-medium">{q.tier === 'core' ? `${q.order}. ` : ''}{q.title}</th>
                <td className="py-2 pr-3">{importanceLabel(importanceOf(answers, q.id))}<br /><span className="text-ink-soft">{choiceLabel(q, answers[q.id]?.choice)}{answers[q.id]?.assumedFrom && ' (assumed)'}</span></td>
                {ordered.map((c) => {
                  const cmp = compare(choiceOf(answers, q), positionFor(data.positions, c.id, q.id))
                  return (
                    <td key={c.id} className={`py-2 pr-3 ${evidenceState(positionFor(data.positions, c.id, q.id)) === 'not-found' ? 'text-unknown' : 'text-ink-soft'}`}>
                      {describe(c.id, q.id)}
                      {cmp.kind === 'relation' && <span className="mt-1 block text-xs font-medium text-ink">{RELATION_COPY[cmp.relation]}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 print:grid-cols-2">
        <div>
          <h2 className="text-2xl">Documented similarities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {cross.filter((x) => x.sharedOptionIds.length).map((x) => <li key={x.question.id}>{x.question.title}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl">Documented differences</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {cross.filter((x) => x.dividingOptionIds.length).map((x) => <li key={x.question.id}>{x.question.title}</li>)}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Important missing evidence</h2>
        {ordered.map((c) => {
          const gaps = importantUnknowns(data, answers, c.id)
          return <p key={c.id} className="mt-2"><strong>{c.name}:</strong> {gaps.length ? gaps.map((g) => `${g.item.title} (${EVIDENCE_STATE_COPY[g.state].label})`).join('; ') : 'none among your Very important issues.'}</p>
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Sources</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-6 text-sm">
          {usedSourceIds.map((id) => {
            const s = sourceOf(id)!
            return (
              <li key={id}>
                {s.title}{s.publisher && `, ${s.publisher}`}{s.publishedDate && `, ${formatPartialDate(s.publishedDate)}`}.{' '}
                {s.url ? <a href={s.url} className="break-all">{s.url}</a> : <span className="text-muted">No original link in the research.</span>}
              </li>
            )
          })}
        </ol>
      </section>
    </article>
  )
}
