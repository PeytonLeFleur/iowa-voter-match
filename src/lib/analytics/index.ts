// Descriptive analytics over the user's answers and the documented research.
// Pure functions: same inputs, same outputs. Every percentage is a Ratio that
// carries its numerator and denominator. Nothing here scores a candidate.
import type { CandidatePosition, Domain, PolicyQuestion } from '@/data/schema'
import type { Answer } from '@/lib/assessment/store'
import { coverage } from '@/lib/analytics/coverage'
import { rankByImportance } from '@/lib/analytics/priorities'
import { chronological, compare, evidenceState, type Comparison, type EvidenceState, type UserChoice } from '@/lib/compare'
import type { ClientData } from '@/lib/client-data'
import { IMPORTANCE_LEVELS, type ImportanceValue } from '@/lib/importance'
import { ratio, type Ratio } from '@/lib/percent'

export type Answers = Record<string, Answer | undefined>

export const importanceOf = (answers: Answers, qid: string): ImportanceValue | null => answers[qid]?.importance ?? null

export function choiceOf(answers: Answers, q: PolicyQuestion): UserChoice {
  const c = answers[q.id]?.choice
  if (c === 'unsure') return { kind: 'unsure' }
  if (c && q.options.some((o) => o.id === c)) return { kind: 'option', optionId: c }
  return { kind: 'skipped' }
}

export const positionFor = (positions: CandidatePosition[], candidateId: string, qid: string) =>
  positions.find((p) => p.candidateId === candidateId && p.questionId === qid)

// 1 + 7. Importance profile ---------------------------------------------------
export function importanceDistribution(questions: PolicyQuestion[], answers: Answers) {
  const values = questions.map((q) => importanceOf(answers, q.id))
  const answered = values.filter((v) => v !== null).length
  return {
    answered,
    unanswered: questions.length - answered,
    levels: IMPORTANCE_LEVELS.map((l) => {
      const count = values.filter((v) => v === l.value).length
      return { ...l, count, share: ratio(count, answered) }
    }),
    /** Analytic 7: share of rated issues at "Very important" or above. */
    highImportance: ratio(values.filter((v) => v !== null && v >= 3).length, answered),
  }
}

// 2. Highest priorities ---------------------------------------------------------
export const topPriorities = (questions: PolicyQuestion[], answers: Answers) =>
  rankByImportance(questions, (q) => importanceOf(answers, q.id))

// 3. Domain importance --------------------------------------------------------
export interface DomainImportance {
  domain: Domain
  questionIds: string[]
  answered: number
  points: number
  /** points ÷ (rated questions in domain × 4): normalized so larger domains aren't favored. */
  normalized: Ratio
  /** points ÷ all importance points the user gave. */
  share: Ratio
}

export function domainImportance(questions: PolicyQuestion[], answers: Answers, domains: Domain[]): DomainImportance[] {
  const total = questions.reduce((s, q) => s + (importanceOf(answers, q.id) ?? 0), 0)
  return domains.map((domain) => {
    const qs = questions.filter((q) => q.domain === domain)
    const rated = qs.map((q) => importanceOf(answers, q.id)).filter((v): v is ImportanceValue => v !== null)
    const points = rated.reduce<number>((s, v) => s + v, 0)
    return {
      domain, questionIds: qs.map((q) => q.id), answered: rated.length, points,
      normalized: ratio(points, rated.length * 4),
      share: ratio(points, total),
    }
  })
}

// 6. Completeness ---------------------------------------------------------------
export function completeness(questions: PolicyQuestion[], answers: Answers) {
  const n = questions.length
  const choices = questions.map((q) => choiceOf(answers, q))
  const importanceRated = questions.filter((q) => importanceOf(answers, q.id) !== null).length
  const optionChosen = choices.filter((c) => c.kind === 'option').length
  const unsure = choices.filter((c) => c.kind === 'unsure').length
  const complete = questions.filter((q) => importanceOf(answers, q.id) !== null && answers[q.id]?.choice != null).length
  return {
    importanceRated: ratio(importanceRated, n),
    optionChosen: ratio(optionChosen, n),
    unsure: ratio(unsure, n),
    noPreference: ratio(n - optionChosen - unsure, n),
    screensCompleted: ratio(complete, n),
  }
}

// 14 + 19. Evidence availability ---------------------------------------------
export const candidateCoverage = (data: ClientData, candidateId: string, qids: string[]) =>
  coverage(candidateId, qids, data.positions)

// 15. Proposal specificity -------------------------------------------------------
export function proposalSpecificity(data: ClientData, candidateId: string) {
  const ps = data.questions.map((q) => positionFor(data.positions, candidateId, q.id))
  const documented = ps.filter((p) => evidenceState(p) === 'documented')
  return {
    specificProposal: ratio(documented.filter((p) => p!.evidenceClass === 'SP').length, data.questions.length),
    documentedAction: ratio(documented.filter((p) => p!.evidenceClass === 'DA' || p!.statementIds.some((s) =>
      data.statements.find((x) => x.id === s)?.evidenceClass === 'DA')).length, data.questions.length),
    proposalText: ratio(documented.filter((p) => p!.proposal !== null).length, data.questions.length),
    questionIdsWithProposal: documented.filter((p) => p!.proposal !== null).map((p) => p!.questionId),
  }
}

// 16. Statement timeline --------------------------------------------------------
export function timeline(data: ClientData, qid: string) {
  return chronological(data.statements.filter((s) => s.questionIds.includes(qid)))
}

// 17 + 18. Documented overlap and differences ------------------------------------
export interface CrossCandidate {
  question: PolicyQuestion
  /** Options where both candidates' documented stances are aligned. */
  sharedOptionIds: string[]
  /** Options one candidate aligns with and the other conflicts with. */
  dividingOptionIds: string[]
}

export function crossCandidate(data: ClientData): CrossCandidate[] {
  const [a, b] = data.candidates
  if (!a || !b) return []
  return data.questions.map((question) => {
    const pa = positionFor(data.positions, a.id, question.id)
    const pb = positionFor(data.positions, b.id, question.id)
    const both = evidenceState(pa) === 'documented' && evidenceState(pb) === 'documented'
    const ra = both ? pa!.optionRelations ?? {} : {}
    const rb = both ? pb!.optionRelations ?? {} : {}
    const ids = question.options.map((o) => o.id)
    return {
      question,
      sharedOptionIds: ids.filter((o) => ra[o] === 'aligned' && rb[o] === 'aligned'),
      dividingOptionIds: ids.filter((o) =>
        (ra[o] === 'aligned' && rb[o] === 'conflicting') || (ra[o] === 'conflicting' && rb[o] === 'aligned')),
    }
  })
}

// User × candidate comparisons -------------------------------------------------
export type ComparisonBucket = 'aligned' | 'partial' | 'conflicting' | 'not-comparable' | 'no-documented-position'

export function bucketOf(c: Comparison): ComparisonBucket | null {
  if (c.kind === 'relation') return c.relation
  if (c.reason === 'user-unsure' || c.reason === 'user-skipped') return null
  return c.reason === 'not-comparable' ? 'not-comparable' : 'no-documented-position'
}

export interface CandidateComparison {
  candidateId: string
  /** Questions where the user chose a specific option (the base for this view). */
  chosen: number
  /** Of those, how many the candidate has a documented, comparable stance on. */
  comparable: Ratio
  counts: Record<ComparisonBucket, number>
  byQuestion: { questionId: string; importance: ImportanceValue | null; comparison: Comparison; state: EvidenceState }[]
}

/**
 * How each of the user's chosen positions relates to a candidate's documented
 * record. Counts only; unknown positions are their own bucket and are never
 * folded into agreement or disagreement.
 */
export function compareWithCandidate(data: ClientData, answers: Answers, candidateId: string, minImportance = 0): CandidateComparison {
  const counts: Record<ComparisonBucket, number> = {
    aligned: 0, partial: 0, conflicting: 0, 'not-comparable': 0, 'no-documented-position': 0,
  }
  const byQuestion: CandidateComparison['byQuestion'] = []
  for (const q of data.questions) {
    const importance = importanceOf(answers, q.id)
    if (minImportance > 0 && (importance ?? -1) < minImportance) continue
    const choice = choiceOf(answers, q)
    const p = positionFor(data.positions, candidateId, q.id)
    const comparison = compare(choice, p)
    byQuestion.push({ questionId: q.id, importance, comparison, state: evidenceState(p) })
    const b = bucketOf(comparison)
    if (b) counts[b] += 1
  }
  const chosen = counts.aligned + counts.partial + counts.conflicting + counts['not-comparable'] + counts['no-documented-position']
  return {
    candidateId, chosen, counts, byQuestion,
    comparable: ratio(counts.aligned + counts.partial + counts.conflicting, chosen),
  }
}

/** Important-to-you questions (importance ≥ 3) where a candidate's position is not documented. */
export function importantUnknowns(data: ClientData, answers: Answers, candidateId: string) {
  return topPriorities(data.questions, answers)
    .filter((r) => r.importance >= 3)
    .map((r) => ({ ...r, state: evidenceState(positionFor(data.positions, candidateId, r.item.id)) }))
    .filter((r) => r.state !== 'documented')
}
