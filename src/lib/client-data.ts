// The slice of the research dataset that interactive (client) pages need.
// Built on the server at build time and passed down as props.
import type { Candidate, CandidatePosition, CandidateStatement, Domain, EvidenceSource, Meta, PolicyQuestion } from '@/data/schema'
import { getDataset } from '@/data/load'

export interface ClientData {
  meta: Meta
  candidates: Candidate[]
  questions: PolicyQuestion[]
  positions: CandidatePosition[]
  statements: CandidateStatement[]
  sources: EvidenceSource[]
}

export function getClientData(): ClientData {
  const ds = getDataset()
  return {
    meta: ds.meta,
    candidates: ds.candidates,
    questions: [...ds.questions].sort((a, b) => a.order - b.order),
    positions: ds.positions,
    statements: ds.statements,
    sources: ds.sources,
  }
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  economy: 'Economy',
  agriculture: 'Agriculture',
  education: 'Education',
  health: 'Health care',
  rights: 'Rights',
  environment: 'Environment and energy',
  government: 'Government',
}
