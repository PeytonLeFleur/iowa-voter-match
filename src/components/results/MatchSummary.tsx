'use client'
import Link from 'next/link'
import { importanceLabel } from '@/components/assessment/AssessmentFlow'
import type { Candidate } from '@/data/schema'
import {
  MIN_COMPARABLE, matchOutcome, matchScore, type Answers, type CandidateMatch, type MatchItem,
} from '@/lib/analytics'
import type { ClientData } from '@/lib/client-data'

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

/** Headline match: importance-weighted agreement with each candidate's documented positions. */
export default function MatchSummary({ data, answers, ordered }: { data: ClientData; answers: Answers; ordered: Candidate[] }) {
  const matches = ordered.map((c) => matchScore(data, answers, c.id))
  const outcome = matchOutcome(matches)
  const name = (id: string) => data.candidates.find((c) => c.id === id)!.name

  return (
    <div>
      <div className="border-2 border-ink bg-paper-deep p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your closest match</p>
        {outcome.kind === 'closest' && (
          <>
            <p className="mt-2 font-serif text-4xl sm:text-5xl">{name(outcome.candidateId)}</p>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Based on the positions you chose and how important each issue is to you, {name(outcome.candidateId)}’s
              documented record lines up with yours more often, by {outcome.margin} percentage points.
            </p>
          </>
        )}
        {outcome.kind === 'near-tie' && (
          <>
            <p className="mt-2 font-serif text-4xl">Close to even</p>
            <p className="mt-3 max-w-2xl text-ink-soft">
              The two candidates’ documented records match your answers within {outcome.margin} percentage
              {outcome.margin === 1 ? ' point' : ' points'}. Look at the specific issues below to see where they differ.
            </p>
          </>
        )}
        {outcome.kind === 'not-enough' && (
          <>
            <p className="mt-2 font-serif text-3xl">Not enough to compare yet</p>
            <p className="mt-3 max-w-2xl text-ink-soft">
              {outcome.reason === 'no-choices'
                ? <>Choose a position on some questions to see your match. <Link href="/assessment/">Take the assessment</Link>.</>
                : <>A closest match is named only when both candidates have documented positions on at least {MIN_COMPARABLE} of the issues you chose a position on. Answer more questions, or see the details below.</>}
            </p>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {ordered.map((c, i) => <CandidateCard key={c.id} candidate={c} m={matches[i]!} />)}
      </div>

      <details className="mt-8 text-sm text-ink-soft">
        <summary className="cursor-pointer font-medium text-ink">How this percentage is calculated</summary>
        <div className="mt-3 max-w-3xl space-y-2">
          <p>
            For each issue where you chose a position, a candidate earns full credit if their documented position aligns
            with your choice, half credit if it partly overlaps, and no credit if it differs. Each issue counts by how
            important you said it is (Extremely passionate counts 4 times as much as Slightly important; “Doesn’t affect
            me” counts zero; unrated issues count as Moderately important).
          </p>
          <p>
            Issues where a candidate’s position is not documented, is only a general statement, is unverified, or is
            conflicting are <strong>left out of that candidate’s percentage entirely</strong>. They are never counted as
            disagreement. Because each candidate is scored only on the issues where their position is known, check how
            many issues each percentage is based on.
          </p>
          <p>
            If you did the optional Go deeper round, those answers count too. When you feel strongly about a core question
            (Very important or higher), closely related deeper questions are filled in with the matching answer and marked
            Assumed. They count in your match until you change them.
          </p>
          <p>
            This compares your answers with public statements as of the research date. It cannot tell you what a
            candidate will do in office. <Link href="/methodology/#match">Full methodology</Link>.
          </p>
        </div>
      </details>
    </div>
  )
}

function CandidateCard({ candidate, m }: { candidate: Candidate; m: CandidateMatch }) {
  const width = m.value === null ? 0 : Math.round(m.value * 100)
  return (
    <div className="border-t-2 border-ink-soft pt-4">
      <h3 className="font-serif text-2xl">{candidate.name}</h3>
      <div className="mt-3 flex items-center gap-4">
        <span className="relative h-4 flex-1 overflow-hidden rounded-r-[4px] bg-paper-deep" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-accent" style={{ width: `${width}%` }} />
        </span>
        <span className="font-serif text-4xl tabular-nums">{pct(m.value)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        agreement, based on <strong>{m.basis} of {m.eligible}</strong> issues you chose a position on where{' '}
        {candidate.name.split(' ')[0]}’s position is documented
      </p>
      {m.basis > 0 && m.basis < MIN_COMPARABLE && (
        <p className="mt-1 text-xs text-muted">Based on very few issues; treat this percentage with caution.</p>
      )}
      {m.assumed > 0 && (
        <p className="mt-1 text-xs text-muted">Includes {m.assumed} assumed {m.assumed === 1 ? 'answer' : 'answers'}, marked below.</p>
      )}
      <IssueList title="You agree on" items={m.agree} />
      <IssueList title="You partly agree on" items={m.partly} />
      <IssueList title="You disagree on" items={m.disagree} />
      {m.eligible > m.basis && (
        <p className="mt-4 text-xs text-muted">
          {m.eligible - m.basis} of your issues aren’t counted for {candidate.name} because that position isn’t documented
          clearly enough to compare. <a href="#incomplete">See which ones</a>.
        </p>
      )}
    </div>
  )
}

function IssueList({ title, items }: { title: string; items: MatchItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title} ({items.length})</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {items.map((i) => (
          <li key={i.question.id}>
            <Link href={`/compare/#${i.question.slug}`}>{i.question.title}</Link>
            <span className="text-muted"> · {importanceLabel(i.importance)}</span>
            {i.assumedFrom && <span className="ml-1 rounded-sm bg-accent-wash px-1 text-[10px] font-semibold uppercase tracking-wide text-accent-deep">Assumed</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
