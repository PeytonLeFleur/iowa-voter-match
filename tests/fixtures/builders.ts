// Test-only fixture builders. Nothing here is real candidate research.
import { CandidatePosition, CandidateStatement, Dataset, PolicyQuestion } from '@/data/schema'

export const CUTOFF = '2026-10-12'

export const minWageQuestion = PolicyQuestion.parse({
  id: 'q-min-wage', order: 1, slug: 'minimum-wage', title: 'Minimum wage', categoryId: 'cat-econ',
  prompt: 'What should Iowa do about the minimum wage?', context: 'Fixture context.', issueIds: ['ISS-1'],
  options: [
    { id: 'raise', label: 'Raise the state minimum wage', description: 'Fixture.' },
    { id: 'keep', label: 'Keep the current minimum wage', description: 'Fixture.' },
    { id: 'local', label: 'Let localities set their own', description: 'Fixture.' },
  ],
})

let n = 0
export function position(over: Partial<CandidatePosition> & Pick<CandidatePosition, 'evidenceClass'>): CandidatePosition {
  n += 1
  const found = ['EP', 'SP', 'DA', 'CF'].includes(over.evidenceClass) ? true : over.evidenceClass === 'NDP' ? false : null
  return CandidatePosition.parse({
    id: `pos-${n}`, candidateId: 'cand-a', questionId: minWageQuestion.id, positionFound: found,
    positionSummary: over.evidenceClass === 'NDP' ? null : 'Fixture summary.', comparableToUserPreference: null,
    verificationStatus: 'verified', researchCutoff: CUTOFF, ...over,
  })
}

export const supportsRaise = (over: Partial<CandidatePosition> = {}) =>
  position({
    evidenceClass: 'SP', statementIds: ['st-1'], comparableToUserPreference: true, relationRationale: 'Fixture.',
    optionRelations: { raise: 'aligned', keep: 'conflicting', local: 'partial' }, ...over,
  })

export const opposesRaise = (over: Partial<CandidatePosition> = {}) =>
  position({
    evidenceClass: 'EP', statementIds: ['st-1'], comparableToUserPreference: true, relationRationale: 'Fixture.',
    optionRelations: { raise: 'conflicting', keep: 'aligned', local: 'conflicting' }, ...over,
  })

export function statement(over: Partial<CandidateStatement> & Pick<CandidateStatement, 'id'>): CandidateStatement {
  return CandidateStatement.parse({
    candidateId: 'cand-a', quote: null, summary: 'Fixture.', date: '2026-01-01', sourceId: 'src-1',
    evidenceClass: 'EP', verificationStatus: 'verified', ...over,
  })
}

/** Smallest dataset that passes integrity checks; tests mutate copies of it. */
export function baseDataset(): Dataset {
  return Dataset.parse({
    meta: {
      datasetVersion: 'test', status: 'scaffold', researchCutoff: CUTOFF, expectedIssueCount: 1, expectedQuestionCount: 1,
      race: { id: 'race', state: 'Iowa', office: 'Governor', electionYear: 2026 },
    },
    candidates: [
      { id: 'cand-a', slug: 'cand-a', name: 'Candidate A', sortName: 'A' },
      { id: 'cand-b', slug: 'cand-b', name: 'Candidate B', sortName: 'B' },
    ],
    categories: [{ id: 'cat-econ', slug: 'economy', name: 'Economy', order: 1 }],
    issues: [{ id: 'ISS-1', slug: 'minimum-wage', title: 'Minimum wage', categoryId: 'cat-econ', summary: 'Fixture.' }],
    legislation: [],
    sources: [{ id: 'src-1', title: 'Fixture source', sourceType: 'news', url: 'https://example.org/a', publishedDate: '2026-01-01' }],
    statements: [statement({ id: 'st-1', quote: 'I will raise the wage' }), statement({ id: 'st-b', candidateId: 'cand-b' })],
    positions: [
      supportsRaise({ id: 'p-a' }),
      position({ id: 'p-b', candidateId: 'cand-b', evidenceClass: 'NDP' }),
    ],
    questions: [minWageQuestion],
    verifications: [],
  })
}

export const RAW_RESEARCH = 'Candidate A said: “I will raise the wage” at a town hall.'
