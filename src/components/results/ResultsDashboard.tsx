'use client'
import Link from 'next/link'
import { choiceLabel, importanceLabel } from '@/components/assessment/AssessmentFlow'
import EvidenceBadge from '@/components/evidence/EvidenceBadge'
import RatioBar from '@/components/viz/RatioBar'
import type { Domain } from '@/data/schema'
import {
  candidateCoverage, choiceOf, compareWithCandidate, completeness, crossCandidate, domainImportance,
  importanceDistribution, importanceOf, importantUnknowns, positionFor, topPriorities, type Answers,
} from '@/lib/analytics'
import { useCandidateOrder } from '@/lib/assessment/candidate-order'
import { useAssessment } from '@/lib/assessment/store'
import { RELATION_COPY } from '@/lib/compare'
import { DOMAIN_LABELS, type ClientData } from '@/lib/client-data'
import { formatRatio, ratio } from '@/lib/percent'
import { formatDate } from '@/lib/site'
import { HEAT, ImportanceSelect, Panel, Section, heatText } from './shared'

const DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[]

// Question sets for the area detail views (analytics 8–13).
const DETAIL_VIEWS: { n: number; title: string; qids: string[] }[] = [
  { n: 8, title: 'Economy: taxes, affordability, wages, and spending', qids: ['q01', 'q02', 'q03', 'q18'] },
  { n: 9, title: 'Agriculture and rural Iowa: farming, land, water, rural care', qids: ['q04', 'q05', 'q06', 'q08'] },
  { n: 10, title: 'Education: funding, school choice, parental rights', qids: ['q10', 'q11', 'q12'] },
  { n: 11, title: 'Health care: coverage, rural care, cancer', qids: ['q09', 'q08', 'q07'] },
  { n: 12, title: 'Rights and protections', qids: ['q13', 'q14', 'q15'] },
  { n: 13, title: 'Government accountability and authority', qids: ['q19', 'q20', 'q16'] },
]

export default function ResultsDashboard({ data }: { data: ClientData }) {
  const { state, hydrated, setImportance } = useAssessment()
  const { ordered, swap } = useCandidateOrder(data.candidates)
  const answers: Answers = state.answers
  const { questions } = data
  const cutoff = formatDate(data.meta.researchCutoff)

  if (!hydrated) return <p className="text-muted">Loading your answers…</p>

  const dist = importanceDistribution(questions, answers)
  const done = completeness(questions, answers)
  const ranked = topPriorities(questions, answers)
  const domains = domainImportance(questions, answers, DOMAINS)
  const cross = crossCandidate(data)
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]))
  const hasAnswers = Object.keys(answers).length > 0

  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your results</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Your priorities</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Your own answers come first. Candidate information follows, drawn only from documented public statements.
          This page does not recommend a candidate or calculate a match score.
        </p>
        {!hasAnswers && (
          <p className="mt-6 border-l-2 border-accent bg-accent-wash px-4 py-3">
            You haven’t answered any questions yet. <Link href="/assessment/">Start the 20 questions</Link> to see your profile.
          </p>
        )}
        {hasAnswers && done.screensCompleted.numerator < questions.length && (
          <p className="mt-6 border-l-2 border-rule bg-paper-deep px-4 py-3 text-sm text-ink-soft">
            Your assessment is incomplete ({formatRatio(done.screensCompleted, 'screens fully answered')}). Results use what you’ve
            answered so far; unanswered questions are left out, not counted as zero.{' '}
            <Link href="/assessment/?q=review">Continue the assessment</Link>.
          </p>
        )}
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="#priorities">1. My priorities</a>
          <a href="#preferences">2. My policy preferences</a>
          <a href="#positions">3. Candidates’ documented positions</a>
          <a href="#similarities">4. Similarities</a>
          <a href="#differences">5. Differences</a>
          <a href="#incomplete">6. Incomplete research</a>
        </nav>
      </header>

      {/* 1 ─────────────────────────────────────────────────────────────── */}
      <Section id="priorities" eyebrow="Part 1" title="My issue priorities"
        intro="How important each issue is to you, as you rated it. Change any rating here and every chart updates.">
        <Panel n={1} title="Overall importance profile" note={`How many of the 20 questions you rated at each level. ${dist.unanswered} not rated.`}>
          <div className="space-y-3">
            {dist.levels.map((l) => (
              <RatioBar key={l.value} label={l.label} ratio={ratio(l.count, questions.length)} noun="questions" />
            ))}
          </div>
        </Panel>

        <Panel n={2} title="Your highest-priority issues" note="Ordered by your own ratings. Issues you rated the same share a rank. Candidate evidence plays no part in this order.">
          {ranked.length === 0 ? <p className="text-muted">No issues rated yet.</p> : (
            <ol className="divide-y divide-rule border-y border-rule">
              {ranked.map((r) => (
                <li key={r.item.id} className="grid grid-cols-[2.5rem_1fr] items-center gap-3 py-3 sm:grid-cols-[2.5rem_1fr_auto]">
                  <span className="font-serif text-2xl tabular-nums text-muted">{r.rank}</span>
                  <span>
                    <span className="block font-medium">{r.item.title}</span>
                    <span className="block text-sm text-ink-soft">{choiceLabel(r.item, answers[r.item.id]?.choice)}</span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    <ImportanceSelect q={r.item} answers={answers} onChange={setImportance} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel n={3} title="Importance by policy area"
          note="Points you gave each area divided by the most it could receive (rated questions × 4), so areas with more questions aren’t automatically emphasized. Unrated questions are left out.">
          <div className="space-y-3">
            {[...domains].sort((a, b) => (b.normalized.value ?? -1) - (a.normalized.value ?? -1)).map((d) => (
              <RatioBar key={d.domain} label={DOMAIN_LABELS[d.domain]} ratio={ratio(d.points, d.answered * 4)} noun="points"
                detail={`${d.answered} of ${d.questionIds.length} questions rated · ${d.share.value === null ? '—' : `${Math.round(d.share.value * 100)}%`} of all your points`} />
            ))}
          </div>
        </Panel>

        <Panel n={4} title="Importance heatmap" note="Each square is one question, shaded by your rating. Select a square to revisit that question.">
          <ul className="grid grid-cols-4 gap-[2px] sm:grid-cols-5 lg:grid-cols-10">
            {questions.map((q) => {
              const v = importanceOf(answers, q.id)
              return (
                <li key={q.id}>
                  <Link href={`/assessment/?q=${q.order}`}
                    className={`flex aspect-square flex-col justify-between p-2 text-[11px] leading-tight no-underline ${v === null ? 'bg-paper-deep text-muted' : heatText(v)}`}
                    style={v === null ? undefined : { background: HEAT[v] }}
                    title={`${q.title}: ${importanceLabel(v)}`}>
                    <span className="font-semibold tabular-nums">{q.order}</span>
                    <span className="line-clamp-2">{q.title.split(',')[0]}</span>
                    <span className="sr-only">: {importanceLabel(v)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted" aria-hidden>
            <span>Not rated</span><span className="h-3 w-5 bg-paper-deep" />
            {HEAT.map((c, i) => <span key={c} className="flex items-center gap-1"><span className="h-3 w-5" style={{ background: c }} />{i}</span>)}
            <span>(0 = Doesn’t affect me … 4 = Extremely passionate)</span>
          </div>
        </Panel>

        <div className="grid gap-12 md:grid-cols-2">
          <Panel n={6} title="Response completeness" note="A survey completion measure.">
            <div className="space-y-3">
              <RatioBar label="Importance rated" ratio={done.importanceRated} tone="ink" />
              <RatioBar label="Policy option chosen" ratio={done.optionChosen} tone="ink" />
              <RatioBar label="Marked unsure" ratio={done.unsure} tone="muted" />
              <RatioBar label="No preference given" ratio={done.noPreference} tone="muted" />
            </div>
          </Panel>
          <Panel n={7} title="Share of issues you rated highly" note="Rated issues marked Very important or Extremely passionate.">
            <p className="font-serif text-5xl tabular-nums">
              {dist.highImportance.value === null ? '—' : `${Math.round(dist.highImportance.value * 100)}%`}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{formatRatio(dist.highImportance, 'rated issues')}</p>
          </Panel>
        </div>
      </Section>

      {/* 2 ─────────────────────────────────────────────────────────────── */}
      <Section id="preferences" eyebrow="Part 2" title="My stated policy preferences"
        intro="The options you chose, in your words. They are not translated into partisan or ideological labels.">
        <Panel n={5} title="Policy preference summary">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {DOMAINS.map((d) => (
              <div key={d}>
                <h4 className="border-b border-rule pb-1 text-sm font-semibold uppercase tracking-wide text-muted">{DOMAIN_LABELS[d]}</h4>
                <ul className="mt-2 space-y-2">
                  {questions.filter((q) => q.domain === d).map((q) => (
                    <li key={q.id}>
                      <span className="block text-sm text-muted">{q.title}</span>
                      <span className="block">{choiceLabel(q, answers[q.id]?.choice)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-12 lg:grid-cols-2">
          {DETAIL_VIEWS.map((v) => (
            <Panel key={v.n} n={v.n} title={v.title}>
              <table className="w-full text-left text-sm">
                <thead className="sr-only"><tr><th>Question</th><th>Importance</th><th>Your preference</th></tr></thead>
                <tbody className="divide-y divide-rule border-y border-rule">
                  {v.qids.map((id) => {
                    const q = byId[id]!
                    const imp = importanceOf(answers, id)
                    return (
                      <tr key={id}>
                        <th scope="row" className="py-2 pr-3 align-top font-medium">{q.title}</th>
                        <td className="w-28 py-2 pr-3 align-top">
                          <span className="inline-block h-2 w-16 rounded-sm bg-paper-deep align-middle">
                            <span className="block h-2 rounded-sm bg-accent" style={{ width: `${imp === null ? 0 : imp * 25}%` }} />
                          </span>
                          <span className="block text-xs text-muted">{importanceLabel(imp)}</span>
                        </td>
                        <td className="py-2 align-top text-ink-soft">{choiceLabel(q, answers[id]?.choice)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Panel>
          ))}
        </div>
      </Section>

      {/* 3 ─────────────────────────────────────────────────────────────── */}
      <Section id="positions" eyebrow="Part 3" title="Each candidate’s documented positions"
        intro={<>How the options you chose relate to what each candidate has documented. Counts only: questions without a documented position are reported separately and are never counted as agreement or disagreement. <button type="button" onClick={swap} className="text-accent-deep underline underline-offset-4">Swap column order</button></>}>
        <div className="grid gap-10 md:grid-cols-2">
          {ordered.map((c) => {
            const all = compareWithCandidate(data, answers, c.id)
            const important = compareWithCandidate(data, answers, c.id, 3)
            const cov = candidateCoverage(data, c.id, questions.map((q) => q.id))
            return (
              <div key={c.id} className="border-t-2 border-ink-soft pt-4">
                <h3 className="font-serif text-2xl">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  Documented positions on {formatRatio(cov.documented, 'of the 20 questions')}. This measures the research record, not the candidate.
                </p>
                <ComparisonCounts title="All questions where you chose a position" cmp={all} />
                <ComparisonCounts title="Only issues you rated Very important or higher" cmp={important} />
              </div>
            )
          })}
        </div>
        <p className="text-sm">
          <Link href="/compare/" className="font-medium">Compare the evidence side by side →</Link>
        </p>
      </Section>

      {/* 4 ─────────────────────────────────────────────────────────────── */}
      <Section id="similarities" eyebrow="Part 4" title="Documented similarities"
        intro="Questions where both candidates’ documented stances support the same option. Shown with your own choice and rating.">
        <CrossList data={data} answers={answers} rows={cross.filter((x) => x.sharedOptionIds.length > 0)} kind="shared" />
      </Section>

      {/* 5 ─────────────────────────────────────────────────────────────── */}
      <Section id="differences" eyebrow="Part 5" title="Documented differences"
        intro="Questions where one candidate’s documented stance supports an option the other’s conflicts with, grouped by how important the issue is to you. Neither side is presented as preferable.">
        <CrossList data={data} answers={answers} rows={cross.filter((x) => x.dividingOptionIds.length > 0)} kind="dividing" grouped />
      </Section>

      {/* 6 ─────────────────────────────────────────────────────────────── */}
      <Section id="incomplete" eyebrow="Part 6" title="Where the research is incomplete"
        intro={<>Issues you rated Very important or higher where a candidate’s specific position is not established as of {cutoff}. They stay visible here rather than being dropped. <Link href="/methodology/#unknown-positions">Why unknown is not opposition</Link>.</>}>
        <div className="grid gap-10 md:grid-cols-2">
          {ordered.map((c) => {
            const unknowns = importantUnknowns(data, answers, c.id)
            return (
              <div key={c.id}>
                <h3 className="font-serif text-xl">{c.name}</h3>
                {unknowns.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No gaps among the issues you rated Very important or higher.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {unknowns.map((u) => (
                      <li key={u.item.id} className="border-l-2 border-rule pl-3">
                        <p className="font-medium">{u.item.title}</p>
                        <p className="mt-1"><EvidenceBadge state={u.state} /></p>
                        <p className="mt-1 text-sm text-ink-soft">
                          This issue is important to you, but the available research does not establish this candidate’s specific position.
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <aside className="no-print flex flex-wrap items-center justify-between gap-4 border-t border-ink pt-8">
        <p className="text-ink-soft">Take it with you: a printable brief with your answers, both candidates’ documented positions, and every source.</p>
        <div className="flex gap-3">
          <Link href="/assessment/?q=review" className="rounded border border-ink px-5 py-3 font-medium text-ink no-underline hover:bg-paper-deep">Edit answers</Link>
          <Link href="/results/report/" className="rounded bg-ink px-5 py-3 font-medium text-paper no-underline hover:bg-ink-soft">Open my research brief</Link>
        </div>
      </aside>
    </div>
  )
}

function ComparisonCounts({ title, cmp }: { title: string; cmp: ReturnType<typeof compareWithCandidate> }) {
  const rows = [
    { key: 'aligned', label: RELATION_COPY.aligned },
    { key: 'partial', label: RELATION_COPY.partial },
    { key: 'conflicting', label: RELATION_COPY.conflicting },
  ] as const
  const comparable = cmp.comparable.numerator
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold">{title}</h4>
      {cmp.chosen === 0 ? (
        <p className="mt-2 text-sm text-muted">You haven’t chosen a specific position on any of these questions.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Documented, comparable positions found for {formatRatio(cmp.comparable, 'of your chosen positions')}. Research coverage, not agreement.
          </p>
          <div className="mt-3 space-y-2">
            {rows.map((r) => (
              <RatioBar key={r.key} label={r.label} ratio={ratio(cmp.counts[r.key], comparable)} noun="comparable" />
            ))}
            <RatioBar label="Documented, but doesn’t address your option" ratio={ratio(cmp.counts['not-comparable'], cmp.chosen)} noun="chosen" tone="muted" />
            <RatioBar label="No documented position" ratio={ratio(cmp.counts['no-documented-position'], cmp.chosen)} noun="chosen" tone="muted" />
          </div>
        </>
      )}
    </div>
  )
}

function CrossList({ data, answers, rows, kind, grouped = false }: {
  data: ClientData
  answers: Answers
  rows: ReturnType<typeof crossCandidate>
  kind: 'shared' | 'dividing'
  grouped?: boolean
}) {
  if (rows.length === 0) return <p className="text-muted">None found in the documented research.</p>
  const tiers = grouped
    ? [
        { label: 'Extremely passionate or very important to you', test: (v: number | null) => v !== null && v >= 3 },
        { label: 'Moderately or slightly important to you', test: (v: number | null) => v === 1 || v === 2 },
        { label: 'Doesn’t affect you, or not rated', test: (v: number | null) => v === null || v === 0 },
      ]
    : [{ label: '', test: () => true }]
  return (
    <div className="space-y-8">
      {tiers.map((t) => {
        const inTier = rows.filter((r) => t.test(importanceOf(answers, r.question.id)))
          .sort((a, b) => (importanceOf(answers, b.question.id) ?? -1) - (importanceOf(answers, a.question.id) ?? -1))
        if (grouped && inTier.length === 0) return null
        return (
          <div key={t.label}>
            {t.label && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t.label}</h3>}
            <ul className="divide-y divide-rule border-y border-rule">
              {inTier.map((r) => {
                const ids = kind === 'shared' ? r.sharedOptionIds : r.dividingOptionIds
                const choice = choiceOf(answers, r.question)
                return (
                  <li key={r.question.id} className="py-4">
                    <p className="font-medium">{r.question.title}</p>
                    <p className="text-sm text-ink-soft">
                      {kind === 'shared' ? 'Both support: ' : 'Divided on: '}
                      {ids.map((o) => r.question.options.find((x) => x.id === o)!.label).join('; ')}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {data.candidates.map((c) => {
                        const p = positionFor(data.positions, c.id, r.question.id)
                        return <li key={c.id}><span className="font-medium">{c.name}:</span> <span className="text-ink-soft">{p?.positionSummary}</span></li>
                      })}
                    </ul>
                    <p className="mt-2 text-xs text-muted">
                      You: {importanceLabel(importanceOf(answers, r.question.id))} · {choice.kind === 'option' ? r.question.options.find((o) => o.id === choice.optionId)!.label : choice.kind === 'unsure' ? 'Unsure' : 'No preference given'}
                      {' · '}<Link href={`/compare/#${r.question.slug}`}>See sources</Link>
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
