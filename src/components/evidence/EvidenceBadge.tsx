import { EVIDENCE_STATE_COPY, type EvidenceState } from '@/lib/compare'

// Neutral by design: no state is styled as an error. "Not found" is quiet gray.
const STYLE: Record<EvidenceState, string> = {
  documented: 'border-ink-soft text-ink',
  'general-only': 'border-rule text-ink-soft',
  'declined-to-commit': 'border-rule text-ink-soft',
  indirect: 'border-rule text-ink-soft',
  conflicting: 'border-ink-soft text-ink border-double border-[3px]',
  unverified: 'border-dashed border-ink-soft text-ink-soft',
  'not-found': 'border-transparent bg-unknown-wash text-unknown',
}

export default function EvidenceBadge({ state }: { state: EvidenceState }) {
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${STYLE[state]}`}>
      {EVIDENCE_STATE_COPY[state].label}
    </span>
  )
}
