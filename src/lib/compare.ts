// Comparison between a user's policy choice and a candidate's documented record.
// Produces labels, never numbers. Missing evidence is its own state and can
// never become agreement or disagreement.
import type { CandidatePosition, CandidateStatement, OptionRelation } from '@/data/schema'

export type UserChoice =
  | { kind: 'option'; optionId: string }
  | { kind: 'unsure' }
  | { kind: 'skipped' }

export type EvidenceState =
  | 'documented'          // EP, SP, or DA, verified
  | 'general-only'        // GS: discussed the subject, no commitment on this policy
  | 'declined-to-commit'  // asked, explicitly declined (not opposition)
  | 'indirect'            // IND: related context only
  | 'conflicting'         // CF: verified statements that don't reconcile
  | 'unverified'          // SNV, or verification incomplete
  | 'not-found'           // NDP, or no record at all

export function evidenceState(position: CandidatePosition | undefined): EvidenceState {
  if (!position || position.evidenceClass === 'NDP') return 'not-found'
  if (position.evidenceClass === 'SNV' || position.verificationStatus !== 'verified') return 'unverified'
  if (position.declinedToCommit) return 'declined-to-commit'
  switch (position.evidenceClass) {
    case 'CF': return 'conflicting'
    case 'GS': return 'general-only'
    case 'IND': return 'indirect'
    default: return 'documented'
  }
}

export type Comparison =
  | { kind: 'relation'; relation: OptionRelation }
  | {
      kind: 'none'
      reason: 'user-unsure' | 'user-skipped' | 'not-comparable' | Exclude<EvidenceState, 'documented'>
    }

/**
 * Relation between the user's choice and the candidate's documented stance.
 * Only a verified, position-establishing record with editorial option
 * relations can produce aligned/partial/conflicting.
 */
export function compare(choice: UserChoice, position: CandidatePosition | undefined): Comparison {
  if (choice.kind === 'unsure') return { kind: 'none', reason: 'user-unsure' }
  if (choice.kind === 'skipped') return { kind: 'none', reason: 'user-skipped' }
  const state = evidenceState(position)
  if (state !== 'documented') return { kind: 'none', reason: state }
  const relation = position?.optionRelations?.[choice.optionId]
  return relation ? { kind: 'relation', relation } : { kind: 'none', reason: 'not-comparable' }
}

export const EVIDENCE_STATE_COPY: Record<EvidenceState, { label: string; explanation: (cutoff: string) => string }> = {
  documented: {
    label: 'Documented position',
    explanation: () => 'Supported by the candidate’s own statement, proposal, or recorded action.',
  },
  'general-only': {
    label: 'General statement only',
    explanation: () =>
      'The candidate has discussed this subject but has not committed to a position on this specific policy.',
  },
  'declined-to-commit': {
    label: 'No definite stance established',
    explanation: () =>
      'The candidate declined to commit to a position on this specific proposal. Declining to commit is not the same as opposing it.',
  },
  indirect: {
    label: 'Indirect evidence only',
    explanation: () => 'Related context exists, but it does not establish a position on this specific policy.',
  },
  conflicting: {
    label: 'Conflicting statements',
    explanation: () => 'Verified statements point in different directions. All are shown in date order.',
  },
  unverified: {
    label: 'Source not verified',
    explanation: () => 'A possible position was found, but the source could not be fully verified. It is not treated as established.',
  },
  'not-found': {
    label: 'No public position found',
    explanation: (cutoff) =>
      `We could not establish this candidate’s position on this specific policy from the available public research as of ${cutoff}.`,
  },
}

export const RELATION_COPY: Record<OptionRelation, string> = {
  aligned: 'Documented alignment with your choice',
  partial: 'Partial overlap with your choice',
  conflicting: 'Documented difference from your choice',
}

/** Oldest first; undated statements last. Used for conflicting evidence and timelines. */
export function chronological<T extends Pick<CandidateStatement, 'date' | 'id'>>(statements: T[]): T[] {
  return [...statements].sort((a, b) => {
    if (a.date === b.date) return a.id.localeCompare(b.id)
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date.localeCompare(b.date)
  })
}
