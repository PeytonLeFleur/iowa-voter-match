'use client'
import Link from 'next/link'
import { useState } from 'react'
import { choiceLabel, importanceLabel } from '@/components/assessment/AssessmentFlow'
import EvidenceBadge from '@/components/evidence/EvidenceBadge'
import StatementItem from '@/components/evidence/StatementItem'
import { Panel } from '@/components/results/shared'
import RatioBar from '@/components/viz/RatioBar'
import {
  candidateCoverage, choiceOf, importanceOf, positionFor, proposalSpecificity, timeline, type Answers,
} from '@/lib/analytics'
import { useCandidateOrder } from '@/lib/assessment/candidate-order'
import { useAssessment } from '@/lib/assessment/store'
import type { EvidenceState } from '@/lib/compare'
import type { ClientData } from '@/lib/client-data'
import { formatDate } from '@/lib/site'
import CandidateColumn from './CandidateColumn'

const STATES: EvidenceState[] = ['documented', 'general-only', 'declined-to-commit', 'indirect', 'conflicting', 'unverified', 'not-found']

export default function CompareView({ data }: { data: ClientData }) {
  const { state, hydrated } = useAssessment()
  const { ordered, swap } = useCandidateOrder(data.candidates)
  const [filter, setFilter] = useState<'important' | 'all'>('all')
  const [timelineQ, setTimelineQ] = useState(data.questions[0]!.id)
  const answers: Answers = state.answers
  const cutoff = formatDate(data.meta.researchCutoff)
  const allIds = data.questions.map((q) => q.id)

  const sorted = [...data.questions].sort(
    (a, b) => (importanceOf(answers, b.id) ?? -1) - (importanceOf(answers, a.id) ?? -1) || a.order - b.order,
  )
  const shown = filter === 'important' ? sorted.filter((q) => (importanceOf(answers, q.id) ?? -1) >= 3) : sorted

  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Evidence</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Compare documented positions</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Your choice next to each candidate’s documented record, with original sources and dates. Research current as of {cutoff}.
        </p>
      </header>

      <section aria-labelledby="know-h" className="space-y-12 border-t border-ink pt-8">
        <h2 id="know-h" className="text-3xl">How much do we actually know?</h2>
        <div className="grid gap-10 md:grid-cols-2">
          {ordered.map((c) => {
            const cov = candidateCoverage(data, c.id, allIds)
            const spec = proposalSpecificity(data, c.id)
            return (
              <div key={c.id} className="space-y-8 border-t-2 border-ink-soft pt-4">
                <h3 className="font-serif text-2xl">{c.name}</h3>
                <Panel n={14} title="Position availability" note="Questions with an explicit, verified documented position. This measures the available research record, not candidate quality.">
                  <RatioBar label="Documented positions" ratio={cov.documented} noun="questions" tone="ink" />
                </Panel>
                <Panel n={15} title="Proposal specificity" note="Counts by evidence category. Not a score.">
                  <div className="space-y-2">
                    <RatioBar label="Specific documented proposal" ratio={spec.specificProposal} noun="questions" tone="ink" />
                    <RatioBar label="Proposal text recorded" ratio={spec.proposalText} noun="questions" tone="ink" />
                    <RatioBar label="Documented action" ratio={spec.documentedAction} noun="questions" tone="ink" />
                  </div>
                </Panel>
                <Panel n={19} title="Evidence by status" note="Every one of the 20 questions falls into exactly one status.">
                  <ul className="divide-y divide-rule border-y border-rule text-sm">
                    {STATES.map((s) => (
                      <li key={s}>
                        <details className="group py-2">
                          <summary className="flex cursor-pointer items-center justify-between gap-3">
                            <EvidenceBadge state={s} />
                            <span className="tabular-nums text-ink-soft">{cov.byState[s].length}</span>
                          </summary>
                          {cov.byState[s].length > 0 && (
                            <ul className="mt-2 space-y-1 pl-1 text-ink-soft">
                              {cov.byState[s].map((qid) => {
                                const q = data.questions.find((x) => x.id === qid)!
                                return <li key={qid}><a href={`#${q.slug}`}>{q.title}</a></li>
                              })}
                            </ul>
                          )}
                        </details>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            )
          })}
        </div>

        <Panel n={16} title="Statement timeline" note="Dated statements on one question, oldest first. Undated statements are listed last.">
          <label className="text-sm">
            <span className="mr-2 text-muted">Question</span>
            <select value={timelineQ} onChange={(e) => setTimelineQ(e.target.value)} className="rounded border border-rule bg-paper px-2 py-1">
              {data.questions.map((q) => <option key={q.id} value={q.id}>{q.order}. {q.title}</option>)}
            </select>
          </label>
          <ol className="mt-4 space-y-4 border-l border-rule pl-4">
            {timeline(data, timelineQ).map((s) => (
              <li key={s.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {data.candidates.find((c) => c.id === s.candidateId)?.name}
                </p>
                <ul className="mt-1"><StatementItem s={s} source={data.sources.find((x) => x.id === s.sourceId)} /></ul>
              </li>
            ))}
            {timeline(data, timelineQ).length === 0 && <li className="text-sm text-muted">No statements recorded for this question.</li>}
          </ol>
        </Panel>
      </section>

      <section aria-labelledby="viewer-h" className="border-t border-ink pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="viewer-h" className="text-3xl">Side-by-side evidence</h2>
            <p className="mt-2 text-ink-soft">Ordered by your importance ratings. Candidate columns appear in a randomized order for each visitor.</p>
          </div>
          <div className="no-print flex flex-wrap gap-3 text-sm">
            <div role="group" aria-label="Filter questions" className="inline-flex overflow-hidden rounded border border-ink">
              {(['all', 'important'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 ${filter === f ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep'}`}>
                  {f === 'all' ? 'All 20 questions' : 'Very important to me'}
                </button>
              ))}
            </div>
            <button type="button" onClick={swap} className="rounded border border-ink px-3 py-2 text-ink hover:bg-paper-deep">Swap candidate columns</button>
          </div>
        </div>

        {hydrated && filter === 'important' && shown.length === 0 && (
          <p className="mt-8 text-muted">You haven’t rated any issue Very important or higher. <Link href="/assessment/">Take the assessment</Link>.</p>
        )}

        <div className="mt-8 space-y-12">
          {shown.map((q) => {
            const choice = choiceOf(answers, q)
            return (
              <article key={q.id} id={q.slug} className="scroll-mt-6 border-t border-rule pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Question {q.order} · {q.title}</p>
                <h3 className="mt-1 text-2xl">{q.prompt}</h3>
                <div className="mt-6 grid gap-8 md:grid-cols-3 md:gap-6">
                  <div className="flex flex-col gap-3 bg-paper-deep p-4">
                    <h4 className="font-serif text-xl">You</h4>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Importance</dt>
                        <dd className="mt-0.5">{importanceLabel(importanceOf(answers, q.id))}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Your preference</dt>
                        <dd className="mt-0.5">{choiceLabel(q, answers[q.id]?.choice)}</dd>
                        {choice.kind === 'option' && (
                          <dd className="mt-1 text-ink-soft">{q.options.find((o) => o.id === choice.optionId)?.description}</dd>
                        )}
                      </div>
                    </dl>
                    <Link href={`/assessment/?q=${q.order}`} className="mt-auto text-sm">Change my answer</Link>
                  </div>
                  {ordered.map((c) => (
                    <CandidateColumn key={c.id} candidate={c} position={positionFor(data.positions, c.id, q.id)}
                      choice={choice} data={data} cutoff={cutoff} />
                  ))}
                </div>
                {q.unansweredQuestions.length > 0 && (
                  <div className="mt-6 text-sm text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Unanswered by the research</p>
                    <ul className="mt-1 list-disc pl-5">{q.unansweredQuestions.map((u) => <li key={u}>{u}</li>)}</ul>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
