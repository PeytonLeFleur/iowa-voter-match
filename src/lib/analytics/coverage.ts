import type { CandidatePosition } from '@/data/schema'
import { evidenceState, type EvidenceState } from '@/lib/compare'
import { ratio, type Ratio } from '@/lib/percent'

export interface Coverage {
  candidateId: string
  /** Questions considered (the denominator). */
  questionIds: string[]
  byState: Record<EvidenceState, string[]>
  /** Documented positions among the considered questions. Research coverage, not agreement. */
  documented: Ratio
}

const STATES: EvidenceState[] = [
  'documented', 'general-only', 'declined-to-commit', 'indirect', 'conflicting', 'unverified', 'not-found',
]

/** "How much do we actually know?" for one candidate over a set of questions. */
export function coverage(candidateId: string, questionIds: string[], positions: CandidatePosition[]): Coverage {
  const byState = Object.fromEntries(STATES.map((s) => [s, [] as string[]])) as Record<EvidenceState, string[]>
  for (const qid of questionIds) {
    const p = positions.find((x) => x.candidateId === candidateId && x.questionId === qid)
    byState[evidenceState(p)].push(qid)
  }
  return { candidateId, questionIds, byState, documented: ratio(byState.documented.length, questionIds.length) }
}
