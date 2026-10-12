// Acceptance tests A–J from the "Unknown candidate positions" specification.
import { describe, expect, it } from 'vitest'
import { coverage } from '@/lib/analytics/coverage'
import { rankByImportance } from '@/lib/analytics/priorities'
import { chronological, compare, EVIDENCE_STATE_COPY, evidenceState, type UserChoice } from '@/lib/compare'
import { opposesRaise, position, statement, supportsRaise } from '../fixtures/builders'

const wantsRaise: UserChoice = { kind: 'option', optionId: 'raise' }

describe('acceptance', () => {
  it('A: candidate supports what the user supports → documented alignment', () => {
    expect(compare(wantsRaise, supportsRaise())).toEqual({ kind: 'relation', relation: 'aligned' })
  })

  it('B: candidate explicitly opposes → documented disagreement', () => {
    expect(compare(wantsRaise, opposesRaise())).toEqual({ kind: 'relation', relation: 'conflicting' })
  })

  it('C: candidate has NDP → "No public position found", no relation', () => {
    const p = position({ evidenceClass: 'NDP' })
    expect(compare(wantsRaise, p)).toEqual({ kind: 'none', reason: 'not-found' })
    expect(EVIDENCE_STATE_COPY[evidenceState(p)].label).toBe('No public position found')
    expect(compare(wantsRaise, undefined)).toEqual({ kind: 'none', reason: 'not-found' })
  })

  it('D: candidate declined to commit → no definite stance, not opposition', () => {
    const p = position({ evidenceClass: 'GS', declinedToCommit: true })
    expect(compare(wantsRaise, p)).toEqual({ kind: 'none', reason: 'declined-to-commit' })
    expect(EVIDENCE_STATE_COPY['declined-to-commit'].label).toBe('No definite stance established')
  })

  it('E: general principle without a view on the specific bill stays general', () => {
    // Opposes eminent domain for private gain (general) ≠ commits to sign a specific bill.
    const general = position({ evidenceClass: 'GS', positionSummary: 'Opposes eminent domain for private gain.' })
    expect(compare(wantsRaise, general)).toEqual({ kind: 'none', reason: 'general-only' })
    // A documented stance that does not map to the user's options is not forced into one.
    const unmapped = position({ evidenceClass: 'EP', statementIds: ['st-1'] })
    expect(compare(wantsRaise, unmapped)).toEqual({ kind: 'none', reason: 'not-comparable' })
  })

  it('F: conflicting statements are presented chronologically, none chosen', () => {
    const p = position({ evidenceClass: 'CF', statementIds: ['s2', 's1', 's3'] })
    expect(compare(wantsRaise, p)).toEqual({ kind: 'none', reason: 'conflicting' })
    const ordered = chronological([
      statement({ id: 's2', date: '2026-05-01' }),
      statement({ id: 's3', date: null }),
      statement({ id: 's1', date: '2025-11-03' }),
    ])
    expect(ordered.map((s) => s.id)).toEqual(['s1', 's2', 's3'])
  })

  it('G: no documented positions anywhere → full priorities, coverage reported, no relations', () => {
    const qids = Array.from({ length: 20 }, (_, i) => `q${i + 1}`)
    const positions = qids.map((q) => position({ evidenceClass: 'NDP', questionId: q }))
    const cov = coverage('cand-a', qids, positions)
    expect(cov.documented).toEqual({ numerator: 0, denominator: 20, value: 0 })
    expect(cov.byState['not-found']).toHaveLength(20)
    expect(positions.map((p) => compare(wantsRaise, p).kind)).not.toContain('relation')
    const ranked = rankByImportance(qids, () => 4)
    expect(ranked).toHaveLength(20)
    expect(new Set(ranked.map((r) => r.rank))).toEqual(new Set([1]))
  })

  it('H: research volume creates no advantage', () => {
    const many = Array.from({ length: 50 }, (_, i) => supportsRaise({ questionId: `q${i}`, candidateId: 'big' }))
    const few = Array.from({ length: 20 }, (_, i) => supportsRaise({ questionId: `q${i}`, candidateId: 'small' }))
    // Per-question comparison depends only on that question's record.
    expect(compare(wantsRaise, many[0])).toEqual(compare(wantsRaise, few[0]))
    // Coverage reports counts with denominators; it exposes no score or ranking.
    const c = coverage('small', ['q0', 'q30'], few)
    expect(c.documented).toEqual({ numerator: 1, denominator: 2, value: 0.5 })
    expect(Object.keys(c)).toEqual(['candidateId', 'questionIds', 'byState', 'documented'])
  })

  it('I: highest-priority issue without evidence stays visible and first', () => {
    const qs = [{ id: 'q-top', imp: 4 as const }, { id: 'q-mid', imp: 2 as const }]
    const ranked = rankByImportance(qs, (q) => q.imp)
    expect(ranked[0]!.item.id).toBe('q-top')
    expect(coverage('cand-a', ['q-top'], []).byState['not-found']).toEqual(['q-top'])
  })

  it('J: NDP later verified changes evidence, never the user’s answers', () => {
    const answers = { 'q-min-wage': { importance: 3, choice: wantsRaise } }
    const snapshot = structuredClone(answers)
    const before = compare(answers['q-min-wage'].choice, position({ evidenceClass: 'NDP' }))
    const after = compare(answers['q-min-wage'].choice, supportsRaise())
    expect(before).toEqual({ kind: 'none', reason: 'not-found' })
    expect(after).toEqual({ kind: 'relation', relation: 'aligned' })
    expect(answers).toEqual(snapshot)
  })
})

describe('evidence states', () => {
  it('SNV and incomplete verification are never treated as documented', () => {
    expect(evidenceState(position({ evidenceClass: 'SNV' }))).toBe('unverified')
    const unverifiedEP = supportsRaise({ verificationStatus: 'unverified' })
    expect(compare(wantsRaise, unverifiedEP)).toEqual({ kind: 'none', reason: 'unverified' })
    const unavailable = supportsRaise({ verificationStatus: 'source-unavailable' })
    expect(evidenceState(unavailable)).toBe('unverified')
  })

  it('unsure and skipped users get no relation and no penalty', () => {
    expect(compare({ kind: 'unsure' }, supportsRaise())).toEqual({ kind: 'none', reason: 'user-unsure' })
    expect(compare({ kind: 'skipped' }, supportsRaise())).toEqual({ kind: 'none', reason: 'user-skipped' })
  })

  it('no copy for missing evidence uses opposition language', () => {
    const banned = /oppos(es|ed)|disagree|against|fail|does not care|unlikely|0%/i
    for (const state of ['not-found', 'declined-to-commit', 'general-only', 'indirect', 'unverified'] as const) {
      const c = EVIDENCE_STATE_COPY[state]
      const text = `${c.label} ${c.explanation('October 12, 2026')}`.replace('not the same as opposing it', '')
      expect(text).not.toMatch(banned)
    }
  })
})
