import { describe, expect, it } from 'vitest'
import { rankByImportance } from '@/lib/analytics/priorities'
import { formatRatio, ratio } from '@/lib/percent'

describe('ratio', () => {
  it('never divides by zero', () => {
    expect(ratio(0, 0)).toEqual({ numerator: 0, denominator: 0, value: null })
    expect(formatRatio(ratio(0, 0), 'questions')).toBe('0 of 0 questions')
  })
  it('formats numerator and denominator beside the percentage', () => {
    expect(formatRatio(ratio(8, 20), 'policy questions')).toBe('8 of 20 policy questions (40%)')
  })
})

describe('rankByImportance', () => {
  it('gives ties equal rank and keeps question order within ties', () => {
    const r = rankByImportance(['a', 'b', 'c', 'd'], (x) => ({ a: 2, b: 4, c: 2, d: 0 })[x] as 0 | 2 | 4)
    expect(r.map((x) => [x.item, x.rank])).toEqual([['b', 1], ['a', 2], ['c', 2], ['d', 4]])
  })
  it('excludes unanswered importance instead of treating it as zero', () => {
    expect(rankByImportance(['a', 'b'], (x) => (x === 'a' ? null : 0)).map((r) => r.item)).toEqual(['b'])
  })
  it('handles everything at zero and everything at max', () => {
    expect(new Set(rankByImportance([1, 2, 3], () => 0).map((r) => r.rank))).toEqual(new Set([1]))
    expect(new Set(rankByImportance([1, 2, 3], () => 4).map((r) => r.rank))).toEqual(new Set([1]))
  })
})
