import { describe, expect, it } from 'vitest'
import { getDataset } from '@/data/load'
import { matchScore, type Answers } from '@/lib/analytics'
import { effectiveAnswers } from '@/lib/assessment/assume'
import type { Answer } from '@/lib/assessment/store'
import type { ClientData } from '@/lib/client-data'

const ds = getDataset()
const data: ClientData = { meta: ds.meta, otherIssues: [], candidates: ds.candidates, questions: ds.questions, positions: ds.positions, statements: ds.statements, sources: ds.sources }
const a = (importance: Answer['importance'], choice: string | null): Answer => ({ importance, choice, updatedAt: 't' })

describe('assumed answers', () => {
  it('a strong view on abortion pre-fills the related IVF question, marked as assumed', () => {
    const eff = effectiveAnswers(ds.questions, { q13: a(4, 'ban-completely') })
    expect(eff['d01']).toMatchObject({ choice: 'regulate-protect-embryos', assumedFrom: 'q13', importance: 4 })
  })

  it('works symmetrically for the opposite view', () => {
    const eff = effectiveAnswers(ds.questions, { q13: a(3, 'legal-most-cases') })
    expect(eff['d01']).toMatchObject({ choice: 'protect-access', assumedFrom: 'q13' })
  })

  it('only applies to strong views (Very important or higher)', () => {
    expect(effectiveAnswers(ds.questions, { q13: a(2, 'ban-completely') })['d01']).toBeUndefined()
    expect(effectiveAnswers(ds.questions, { q13: a(null, 'ban-completely') })['d01']).toBeUndefined()
  })

  it('never assumes from a middle or unsure answer', () => {
    expect(effectiveAnswers(ds.questions, { q13: a(4, 'keep-current') })['d01']).toBeUndefined()
    expect(effectiveAnswers(ds.questions, { q13: a(4, 'unsure') })['d01']).toBeUndefined()
  })

  it('any explicit answer overrides the assumption, including skip and not sure', () => {
    for (const choice of ['keep-current', 'skipped', 'unsure']) {
      const eff = effectiveAnswers(ds.questions, { q13: a(4, 'ban-completely'), d01: a(null, choice) })
      expect(eff['d01']).toMatchObject({ choice })
      expect(eff['d01']!.assumedFrom).toBeUndefined()
    }
  })

  it('never changes the stored answers', () => {
    const stored = { q13: a(4, 'ban-completely') }
    const copy = structuredClone(stored)
    effectiveAnswers(ds.questions, stored)
    expect(stored).toEqual(copy)
  })

  it('assumed answers count in the match and are reported', () => {
    const answers: Answers = effectiveAnswers(ds.questions, { q13: a(4, 'ban-completely') })
    const lahn = matchScore(data, answers, 'zach-lahn')
    expect(lahn.assumed).toBe(1)
    expect(lahn.agree.find((i) => i.question.id === 'd01')?.assumedFrom).toBe('q13')
  })

  it('assumptions only ever fill voter answers, never candidate positions', () => {
    const before = JSON.stringify(ds.positions)
    effectiveAnswers(ds.questions, { q13: a(4, 'ban-completely') })
    expect(JSON.stringify(ds.positions)).toBe(before)
    // Lahn's abortion position on "ban completely" stays not established.
    expect(ds.positions.find((p) => p.id === 'pos-q13-zach-lahn')!.optionRelations!['ban-completely']).toBe('unaddressed')
  })
})
