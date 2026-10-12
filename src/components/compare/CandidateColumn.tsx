import Link from 'next/link'
import EvidenceBadge from '@/components/evidence/EvidenceBadge'
import StatementItem from '@/components/evidence/StatementItem'
import type { Candidate, CandidatePosition } from '@/data/schema'
import { chronological, compare, EVIDENCE_STATE_COPY, evidenceState, RELATION_COPY, type UserChoice } from '@/lib/compare'
import type { ClientData } from '@/lib/client-data'

const NONE_COPY: Record<string, string> = {
  'user-unsure': 'You marked yourself unsure, so no comparison is made.',
  'user-skipped': 'You didn’t choose a position, so no comparison is made.',
  'not-comparable': 'The documented position doesn’t speak to the option you chose.',
}

/** Identical structure for every candidate; only the evidence differs. */
export default function CandidateColumn({ candidate, position, choice, data, cutoff }: {
  candidate: Candidate
  position: CandidatePosition | undefined
  choice: UserChoice
  data: ClientData
  cutoff: string
}) {
  const state = evidenceState(position)
  const cmp = compare(choice, position)
  const statements = chronological(data.statements.filter((s) => position?.statementIds.includes(s.id)))
  const source = (id: string) => data.sources.find((x) => x.id === id)

  return (
    <div className="flex flex-col gap-3">
      <h4 className="font-serif text-xl">{candidate.name}</h4>
      <div><EvidenceBadge state={state} /></div>

      {state === 'not-found' ? (
        <p className="text-sm text-unknown">
          {EVIDENCE_STATE_COPY['not-found'].explanation(cutoff)}{' '}
          <Link href="/methodology/#unknown-positions" className="text-unknown">About research limitations</Link>
        </p>
      ) : (
        <>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Public position</dt>
              <dd className="mt-0.5 text-ink">{position?.positionSummary}</dd>
              {state !== 'documented' && <dd className="mt-1 text-ink-soft">{EVIDENCE_STATE_COPY[state].explanation(cutoff)}</dd>}
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Proposal</dt>
              <dd className="mt-0.5 text-ink-soft">{position?.proposal ?? 'Not established'}</dd>
            </div>
            {position?.evidenceLimitations && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Limitations</dt>
                <dd className="mt-0.5 text-ink-soft">{position.evidenceLimitations}</dd>
              </div>
            )}
          </dl>
          {statements.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {state === 'conflicting' ? 'Statements, oldest first' : 'Evidence'}
              </p>
              <ul className="mt-2 space-y-4">
                {statements.map((s) => <StatementItem key={s.id} s={s} source={source(s.sourceId)} />)}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="mt-auto border-t border-rule pt-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Compared with your choice</span>
        <span className="mt-0.5 block text-ink">
          {cmp.kind === 'relation' ? RELATION_COPY[cmp.relation] : NONE_COPY[cmp.reason] ?? 'No comparison: the position is not documented.'}
        </span>
        {cmp.kind === 'relation' && position?.relationRationale && (
          <span className="mt-1 block text-xs text-muted">{position.relationRationale}</span>
        )}
      </p>
    </div>
  )
}
