// Research data model. These Zod schemas are the single source of truth for the
// JSON in data/; TypeScript types are inferred from them and db/schema.ts mirrors
// them for PostgreSQL. Unknown facts are always `null`, never false/0/"".
import { z } from 'zod'
import { EVIDENCE_CODES } from '@/lib/evidence'

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'ids are URL-safe')
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugs are lowercase-hyphenated')
/** YYYY, YYYY-MM, or YYYY-MM-DD: sources often give only a year or month. Never pad a guess. */
const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'dates are YYYY, YYYY-MM, or YYYY-MM-DD')
const url = z.url()
const text = z.string().trim().min(1)

export const EvidenceCode = z.enum(EVIDENCE_CODES)
export const VerificationStatus = z.enum(['verified', 'unverified', 'source-unavailable'])
export const ReviewStatus = z.enum(['draft', 'reviewed'])
/** `unaddressed`: the documented stance does not speak to this option; no relation is inferred. */
export const OptionRelation = z.enum(['aligned', 'partial', 'conflicting', 'unaddressed'])

/** The seven analytic domains used to aggregate the 20 assessment questions. */
export const Domain = z.enum(['economy', 'agriculture', 'education', 'health', 'rights', 'environment', 'government'])

export const Meta = z.object({
  datasetVersion: z.string(),
  /** "scaffold" while research is being imported; "release" enforces completeness rules. */
  status: z.enum(['scaffold', 'release']),
  researchCutoff: isoDate,
  expectedIssueCount: z.number().int().positive(),
  expectedQuestionCount: z.number().int().positive(),
  race: z.object({ id, state: text, office: text, electionYear: z.number().int() }),
})

export const Candidate = z.object({
  id,
  slug,
  name: text,
  sortName: text,
  party: text.nullable().default(null),
  role: text.nullable().default(null),
  runningMate: text.nullable().default(null),
  summary: text.nullable().default(null),
  campaignUrl: url.nullable().default(null),
  /** Topics the research lists as unanswered for this candidate. */
  unansweredTopics: z.array(text).default([]),
})

export const IssueCategory = z.object({
  id,
  slug,
  name: text,
  description: text.nullable().default(null),
  order: z.number().int(),
})

export const Legislation = z.object({
  id,
  /** Bill or code citation as written, e.g. "HF 2104". */
  citation: text,
  title: text.nullable().default(null),
  session: text.nullable().default(null),
  status: text.nullable().default(null),
  summary: text.nullable().default(null),
  url: url.nullable().default(null),
})

export const SourceType = z.enum([
  'campaign', 'news', 'video', 'debate', 'interview', 'social', 'official-record',
  'legislation', 'government-data', 'research', 'other',
])

export const EvidenceSource = z.object({
  id,
  title: text,
  publisher: text.nullable().default(null),
  sourceType: SourceType,
  url: url.nullable(),
  publishedDate: isoDate.nullable(),
  accessedDate: isoDate.nullable().default(null),
  availability: z.enum(['available', 'unavailable', 'unknown']).default('unknown'),
  archiveUrl: url.nullable().default(null),
  /** Citation exactly as it appeared in the research document. */
  originalCitation: text.nullable().default(null),
})

export const Issue = z.object({
  /** Original research ID, preserved verbatim. */
  id,
  slug,
  /** null when the research references the issue only by ID; never invented. */
  title: text.nullable(),
  /** Set when the research covers several issues together under one heading. */
  groupTitle: text.nullable().default(null),
  categoryId: id,
  summary: text.nullable().default(null),
  legalFramework: text.nullable().default(null),
  concerns: z.array(text).default([]),
  policyAlternatives: z.array(z.object({ label: text, description: text.nullable().default(null) })).default([]),
  status: text.nullable().default(null),
  legislationIds: z.array(id).default([]),
  sourceIds: z.array(id).default([]),
  unansweredQuestions: z.array(text).default([]),
  /** Documented overlap or difference notes from the research. */
  similarities: z.array(text).default([]),
  differences: z.array(text).default([]),
  verifiedDate: isoDate.nullable().default(null),
})

/** A candidate's evidence on a framework issue, as classified in the research matrix. */
export const IssueEvidence = z.object({
  id,
  issueId: id,
  candidateId: id,
  /** One or more codes, in the order the research lists them (e.g. EP and SP). */
  evidenceCodes: z.array(EvidenceCode).min(1),
  /** The research's description, verbatim. null for NDP with no further detail. */
  detail: text.nullable(),
  statementIds: z.array(id).default([]),
})

export const PolicyOption = z.object({
  id,
  label: text,
  description: text,
  relatedIssueIds: z.array(id).default([]),
  legislationIds: z.array(id).default([]),
  sourceIds: z.array(id).default([]),
  explanation: text.nullable().default(null),
  /**
   * Pre-fill this option for a voter who chose one of `optionIds` on a core question and rated it
   * Very important or higher. Always shown as an assumption the voter can change.
   */
  assumeFrom: z.array(z.object({ questionId: id, optionIds: z.array(id).min(1) })).default([]),
})

/** One assessment screen. "Unsure" and "Skip" are built into the UI, not data. */
export const PolicyQuestion = z.object({
  id,
  order: z.number().int().min(1),
  slug,
  title: text,
  categoryId: id,
  domain: Domain,
  prompt: text,
  context: text,
  learnMore: text.nullable().default(null),
  issueIds: z.array(id).min(1),
  options: z.array(PolicyOption).min(2),
  /** Specific sub-questions the research could not answer for either candidate. */
  unansweredQuestions: z.array(text).default([]),
  reviewStatus: ReviewStatus.default('draft'),
  /** core: the 20-question assessment. deep: the optional "Go deeper" round. */
  tier: z.enum(['core', 'deep']).default('core'),
})

export const CandidateStatement = z.object({
  id,
  candidateId: id,
  /** Verbatim words. Only set when the research quotes the candidate directly. */
  quote: text.nullable(),
  summary: text,
  /** How the research obtained it: the candidate's own words, or another outlet's paraphrase. */
  attribution: z.enum(['direct', 'paraphrase']).default('direct'),
  /** Outlet that reported it when different from the source (e.g. "via The Hill"). */
  reportedVia: text.nullable().default(null),
  date: isoDate.nullable(),
  sourceId: id,
  videoTimestamp: z.string().regex(/^\d{1,2}(:\d{2}){1,2}$/).nullable().default(null),
  issueIds: z.array(id).default([]),
  questionIds: z.array(id).default([]),
  evidenceClass: EvidenceCode,
  verificationStatus: VerificationStatus,
  supersededByIds: z.array(id).default([]),
  conflictsWithIds: z.array(id).default([]),
})

/** A candidate's documented record on one assessment question. */
export const CandidatePosition = z.object({
  id,
  candidateId: id,
  questionId: id,
  issueIds: z.array(id).default([]),
  evidenceClass: EvidenceCode,
  /** true: research established a position; false: none found (NDP); null: not established either way. */
  positionFound: z.boolean().nullable(),
  positionSummary: text.nullable(),
  documentedStance: text.nullable().default(null),
  /** The candidate was asked and explicitly declined to commit. Not opposition. */
  declinedToCommit: z.boolean().default(false),
  /** Proposal, funding mechanism, or implementation detail, if documented. */
  proposal: text.nullable().default(null),
  comparableToUserPreference: z.boolean().nullable(),
  /** How the documented stance relates to each policy option. Editorial; must cite statements. */
  optionRelations: z.record(id, OptionRelation).nullable().default(null),
  relationRationale: text.nullable().default(null),
  statementIds: z.array(id).default([]),
  sourceIds: z.array(id).default([]),
  statementDate: isoDate.nullable().default(null),
  verificationStatus: VerificationStatus,
  researchCutoff: isoDate,
  evidenceLimitations: text.nullable().default(null),
  reviewStatus: ReviewStatus.default('draft'),
})

export const ResearchVerification = z.object({
  id,
  entityType: z.enum(['statement', 'position', 'source', 'issue', 'legislation']),
  entityId: id,
  verifiedDate: isoDate,
  method: text,
  result: z.enum(['confirmed', 'corrected', 'unconfirmed', 'source-unavailable']),
  notes: text.nullable().default(null),
})

export const Dataset = z.object({
  meta: Meta,
  candidates: z.array(Candidate),
  categories: z.array(IssueCategory),
  issues: z.array(Issue),
  issueEvidence: z.array(IssueEvidence),
  legislation: z.array(Legislation),
  sources: z.array(EvidenceSource),
  statements: z.array(CandidateStatement),
  positions: z.array(CandidatePosition),
  questions: z.array(PolicyQuestion),
  verifications: z.array(ResearchVerification),
})

export type Meta = z.infer<typeof Meta>
export type Candidate = z.infer<typeof Candidate>
export type IssueCategory = z.infer<typeof IssueCategory>
export type Legislation = z.infer<typeof Legislation>
export type EvidenceSource = z.infer<typeof EvidenceSource>
export type Issue = z.infer<typeof Issue>
export type IssueEvidence = z.infer<typeof IssueEvidence>
export type Domain = z.infer<typeof Domain>
export type PolicyOption = z.infer<typeof PolicyOption>
export type PolicyQuestion = z.infer<typeof PolicyQuestion>
export type CandidateStatement = z.infer<typeof CandidateStatement>
export type CandidatePosition = z.infer<typeof CandidatePosition>
export type ResearchVerification = z.infer<typeof ResearchVerification>
export type OptionRelation = z.infer<typeof OptionRelation>
export type Dataset = z.infer<typeof Dataset>
