// The slice of the research dataset that interactive (client) pages need.
// Built on the server at build time and passed down as props.
import type { Candidate, CandidatePosition, CandidateStatement, Domain, EvidenceSource, Meta, PolicyQuestion } from '@/data/schema'
import { getDataset } from '@/data/load'
import type { EvidenceCode } from '@/lib/evidence'

export interface OtherIssue {
  id: string
  slug: string
  title: string
  evidence: { candidateId: string; codes: EvidenceCode[] }[]
}

export interface ClientData {
  meta: Meta
  /** Named framework issues outside every question; rated for importance only. */
  otherIssues: OtherIssue[]
  candidates: Candidate[]
  questions: PolicyQuestion[]
  positions: CandidatePosition[]
  statements: CandidateStatement[]
  sources: EvidenceSource[]
}

export function getClientData(): ClientData {
  const ds = getDataset()
  const covered = new Set(ds.questions.flatMap((q) => q.issueIds))
  return {
    meta: ds.meta,
    otherIssues: ds.issues
      .filter((i) => !covered.has(i.id) && (i.title || i.groupTitle))
      .map((i) => ({
        id: i.id, slug: i.slug, title: (i.title ?? i.groupTitle)!,
        evidence: ds.issueEvidence.filter((e) => e.issueId === i.id).map((e) => ({ candidateId: e.candidateId, codes: e.evidenceCodes })),
      })),
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
