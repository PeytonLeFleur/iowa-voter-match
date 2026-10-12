// Evidence classifications used by the candidate research. A code describes the
// *kind* of evidence, never whether it agrees with a user.
export const EVIDENCE_CODES = ['EP', 'SP', 'DA', 'GS', 'IND', 'CF', 'NDP', 'SNV'] as const
export type EvidenceCode = (typeof EVIDENCE_CODES)[number]

/** Codes that can establish a specific position on a specific question. */
export const POSITION_ESTABLISHING: ReadonlySet<EvidenceCode> = new Set(['EP', 'SP', 'DA'])

export const EVIDENCE_CLASSES: readonly { code: EvidenceCode; label: string; description: string }[] = [
  { code: 'EP', label: 'Explicit statement', description: 'The candidate directly stated a position on this specific policy.' },
  { code: 'SP', label: 'Specific documented proposal', description: 'The candidate published a concrete proposal, such as a plan, bill, or funding mechanism.' },
  { code: 'DA', label: 'Documented action', description: 'A recorded action by the candidate, such as a vote, official act, or signed pledge, that addresses this policy.' },
  { code: 'GS', label: 'General statement', description: 'The candidate discussed the subject without committing to this specific policy.' },
  { code: 'IND', label: 'Indirect evidence', description: 'Related context that does not by itself establish a position on this policy.' },
  { code: 'CF', label: 'Conflicting evidence', description: 'Verified statements that cannot yet be reconciled into one position. All are shown with their dates.' },
  { code: 'NDP', label: 'No public position found', description: 'The available research did not establish a position. This is missing evidence, not opposition or support.' },
  { code: 'SNV', label: 'Source not verified', description: 'A possible position was found, but verification of the source is incomplete. It is not treated as verified evidence.' },
]

export const evidenceLabel = (code: EvidenceCode) => EVIDENCE_CLASSES.find((e) => e.code === code)!.label
