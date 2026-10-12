import { describe, expect, it } from 'vitest'
import { getDataset } from '@/data/load'
import { matchOutcome, matchScore, type Answers, type CandidateMatch } from '@/lib/analytics'
import type { ClientData } from '@/lib/client-data'
import { baseDataset, opposesRaise, position, supportsRaise } from '../fixtures/builders'

const toClient = (ds: ReturnType<typeof getDataset>): ClientData => ({
  meta: ds.meta, candidates: ds.candidates, questions: ds.questions, positions: ds.positions, statements: ds.statements, sources: ds.sources,
})
const ans = (importance: 0 | 1 | 2 | 3 | 4 | null, choice: string): Answers => ({ 'q-min-wage': { importance, choice, updatedAt: '' } })

describe('match percentage', () => {
  it('aligned = 100%, conflicting = 0%, partial = 50%', () => {
    const ds = baseDataset()
    const data = toClient(ds)
    data.positions = [supportsRaise({ candidateId: 'cand-a' })]
    expect(matchScore(data, ans(3, 'raise'), 'cand-a').value).toBe(1)
    expect(matchScore(data, ans(3, 'keep'), 'cand-a').value).toBe(0)
    expect(matchScore(data, ans(3, 'local'), 'cand-a').value).toBe(0.5)
  })

  it('unknown positions are excluded from the denominator, never counted as disagreement', () => {
    const data = toClient(baseDataset())
    data.positions = [position({ evidenceClass: 'NDP', candidateId: 'cand-b' })]
    const m = matchScore(data, ans(4, 'raise'), 'cand-b')
    expect(m.value).toBeNull()
    expect(m.basis).toBe(0)
    expect(m.eligible).toBe(1)
    expect(m.disagree).toEqual([])
  })

  it('declined-to-commit and general statements are not scored', () => {
    const data = toClient(baseDataset())
    data.positions = [position({ evidenceClass: 'GS', declinedToCommit: true, candidateId: 'cand-b' })]
    expect(matchScore(data, ans(4, 'raise'), 'cand-b').basis).toBe(0)
  })

  it('"Doesn’t affect me" weighs zero; unsure and skipped are not scored', () => {
    const data = toClient(baseDataset())
    data.positions = [opposesRaise({ candidateId: 'cand-a' })]
    expect(matchScore(data, ans(0, 'raise'), 'cand-a').eligible).toBe(0)
    expect(matchScore(data, ans(4, 'unsure'), 'cand-a').eligible).toBe(0)
    expect(matchScore(data, {}, 'cand-a').eligible).toBe(0)
  })

  it('importance weights the result', () => {
    const ds = getDataset()
    const data = toClient(ds)
    // q09 Medicaid: Sand aligned with end-managed-care. q11 ESAs: Sand conflicting with expand.
    const heavyAgree: Answers = { q09: { importance: 4, choice: 'end-managed-care', updatedAt: '' }, q11: { importance: 1, choice: 'expand', updatedAt: '' } }
    const heavyDisagree: Answers = { q09: { importance: 1, choice: 'end-managed-care', updatedAt: '' }, q11: { importance: 4, choice: 'expand', updatedAt: '' } }
    expect(matchScore(data, heavyAgree, 'rob-sand').value).toBeCloseTo(4 / 5)
    expect(matchScore(data, heavyDisagree, 'rob-sand').value).toBeCloseTo(1 / 5)
  })

  const m = (candidateId: string, value: number | null, basis: number, eligible = 10): CandidateMatch =>
    ({ candidateId, value, basis, eligible, earned: 0, possible: 0, agree: [], partly: [], disagree: [] })

  it('names a closest match only with enough documented positions on both sides', () => {
    expect(matchOutcome([m('a', 0.8, 6), m('b', 0.5, 5)])).toEqual({ kind: 'closest', candidateId: 'a', margin: 30 })
    expect(matchOutcome([m('a', 0.8, 6), m('b', 0.5, 2)])).toEqual({ kind: 'not-enough', reason: 'too-few-documented' })
    expect(matchOutcome([m('a', null, 0, 0), m('b', null, 0, 0)])).toEqual({ kind: 'not-enough', reason: 'no-choices' })
  })

  it('reports near ties instead of a winner', () => {
    expect(matchOutcome([m('a', 0.62, 6), m('b', 0.6, 5)])).toEqual({ kind: 'near-tie', margin: 2 })
  })

  it('research volume does not change a per-issue score (Test H)', () => {
    const data = toClient(getDataset())
    const a: Answers = { q09: { importance: 4, choice: 'end-managed-care', updatedAt: '' } }
    expect(matchScore(data, a, 'rob-sand').basis).toBe(1)
    expect(matchScore(data, a, 'zach-lahn').basis).toBe(1)
  })
})
