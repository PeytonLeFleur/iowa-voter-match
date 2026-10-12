'use client'
import Link from 'next/link'
import { choiceLabel, importanceLabel } from '@/components/assessment/AssessmentFlow'
import type { Candidate } from '@/data/schema'
import {
  MIN_COMPARABLE, matchOutcome, matchScore, positionFor, type Answers, type CandidateMatch, type MatchItem,
} from '@/lib/analytics'
import type { ClientData } from '@/lib/client-data'

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

/** The quiz result: who the voter's answers point to, by how much, and why. */
export default function MatchSummary({ data, answers, ordered }: { data: ClientData; answers: Answers; ordered: Candidate[] }) {
  const matches = ordered.map((c) => matchScore(data, answers, c.id))
  const outcome = matchOutcome(matches)
  const cand = (id: string) => data.candidates.find((c) => c.id === id)!
  const matchOf = (id: string) => matches[ordered.findIndex((c) => c.id === id)]!

  return (
    <div>
      <div className="border-2 border-ink bg-paper-deep p-6 sm:p-8">
        {outcome.kind === 'recommend' && (() => {
          const win = cand(outcome.candidateId)
          const lose = cand(outcome.otherId)
          const wm = matchOf(win.id)
          const lm = matchOf(lose.id)
          return (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Based on your answers, you should vote for</p>
              <p className="mt-2 font-serif text-5xl sm:text-6xl">{win.name}</p>
              <p className="mt-3 text-lg text-ink">
                {win.name} agrees with you on <strong>{pct(wm.value)}</strong> of what you care about, compared with{' '}
                <strong>{pct(lm.value)}</strong> for {lose.name}
                {outcome.strength === 'narrow' ? ': a narrow edge. Look closely at the issues below.' : '.'}
              </p>
              <Why winner={win} loser={lose} wm={wm} lm={lm} data={data} answers={answers} />
            </>
          )
        })()}
        {outcome.kind === 'tie' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your result</p>
            <p className="mt-2 font-serif text-4xl">A dead heat</p>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Both candidates agree with you equally often on the issues that can be compared. Answer more questions
              (try <Link href="/assessment/?q=21">Go deeper</Link>) or compare the issues you care most about below.
            </p>
          </>
        )}
        {outcome.kind === 'not-enough' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your result</p>
            <p className="mt-2 font-serif text-3xl">Answer a few more questions</p>
            <p className="mt-3 max-w-2xl text-ink-soft">
              {outcome.reason === 'no-choices'
                ? <>Pick a position on the questions to see who you should vote for. <Link href="/assessment/">Take the quiz</Link>.</>
                : <>We need at least {MIN_COMPARABLE} issues where each candidate’s position is known to compare them fairly. <Link href="/assessment/?q=review">Answer more questions</Link> or try <Link href="/assessment/?q=21">Go deeper</Link>.</>}
            </p>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {ordered.map((c, i) => <CandidateCard key={c.id} candidate={c} m={matches[i]!} />)}
      </div>

      <details className="mt-8 text-sm text-ink-soft">
        <summary className="cursor-pointer font-medium text-ink">How these percentages are calculated</summary>
        <div className="mt-3 max-w-3xl space-y-2">
          <p>
            For each issue where you chose a position, a candidate earns full credit if their documented position matches
            your choice, half credit if it partly matches, and none if it differs. Each issue counts by how important you
            said it is (Extremely passionate counts 4 times as much as Slightly important; “Doesn’t affect me” counts zero;
            unrated issues count as Moderately important). The candidate with the higher percentage is the one we say you
            should vote for.
          </p>
          <p>
            Issues where a candidate’s position isn’t documented, is only a general statement, is unverified, or is
            conflicting are <strong>left out of that candidate’s percentage</strong> rather than counted as disagreement, so
            each percentage shows how many issues it is based on. We need at least {MIN_COMPARABLE} comparable issues for
            each candidate before naming one.
          </p>
          <p>
            Answers from the optional Go deeper round count too. When you feel strongly about a core question (Very
            important or higher), closely related deeper questions are filled in with the matching answer and marked
            Assumed until you change them.
          </p>
          <p>
            This reflects your answers and the candidates’ public statements as of the research date. It can’t predict
            what anyone will do in office. <Link href="/methodology/#match">Full methodology</Link>.
          </p>
        </div>
      </details>
    </div>
  )
}

function Why({ winner, loser, wm, lm, data, answers }: {
  winner: Candidate; loser: Candidate; wm: CandidateMatch; lm: CandidateMatch; data: ClientData; answers: Answers
}) {
  const reasons = wm.agree.slice(0, 3)
  const shown = new Set(reasons.map((i) => i.question.id))
  const theyDiffer = lm.disagree.filter((i) => !shown.has(i.question.id)).slice(0, 2)
  const caveats = wm.disagree.slice(0, 2)
  const stance = (cid: string, i: MatchItem) => positionFor(data.positions, cid, i.question.id)?.positionSummary
  const yourChoice = (i: MatchItem) => choiceLabel(i.question, answers[i.question.id]?.choice)
  return (
    <div className="mt-6 grid gap-6 border-t border-rule pt-5 md:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink">Why</p>
        {reasons.length > 0 && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">You agree with {winner.name} on</p>}
        <ul className="mt-1 space-y-3 text-sm">
          {reasons.map((i) => (
            <li key={i.question.id}>
              <span className="font-medium">{i.question.title}</span>
              <span className="text-muted"> · {importanceLabel(i.importance)}{i.assumedFrom && ' · assumed'}</span>
              <span className="block text-ink-soft">You: {yourChoice(i)}. {winner.name}: {stance(winner.id, i)}</span>
            </li>
          ))}
        </ul>
        {theyDiffer.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{loser.name} differs from you on</p>
            <ul className="mt-1 space-y-3 text-sm">
              {theyDiffer.map((i) => (
                <li key={i.question.id}>
                  <span className="font-medium">{i.question.title}</span>
                  <span className="text-muted"> · {importanceLabel(i.importance)}{i.assumedFrom && ' · assumed'}</span>
                  <span className="block text-ink-soft">You: {yourChoice(i)}. {loser.name}: {stance(loser.id, i)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink">Where you and {winner.name} disagree</p>
        {caveats.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">None among the issues that can be compared.</p>
        ) : (
          <ul className="mt-2 space-y-3 text-sm">
            {caveats.map((i) => (
              <li key={i.question.id}>
                <span className="font-medium">{i.question.title}</span>
                <span className="text-muted"> · {importanceLabel(i.importance)}</span>
                <span className="block text-ink-soft">You: {yourChoice(i)}. {winner.name}: {stance(winner.id, i)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          {winner.name}’s percentage is based on {wm.basis} issues and {loser.name}’s on {lm.basis}. <Link href="/compare/">See every issue side by side</Link>.
        </p>
      </div>
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
