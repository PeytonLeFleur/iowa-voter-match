// Spec §16 edge cases, run against the real research dataset.
import { describe, expect, it } from 'vitest'
import { getDataset } from '@/data/load'
import {
  compareWithCandidate, completeness, crossCandidate, domainImportance, importanceDistribution, topPriorities, type Answers,
} from '@/lib/analytics'
import type { ClientData } from '@/lib/client-data'
import type { ImportanceValue } from '@/lib/importance'
import type { Domain } from '@/data/schema'

const ds = getDataset()
const data: ClientData = { meta: ds.meta, candidates: ds.candidates, questions: ds.questions, positions: ds.positions, statements: ds.statements, sources: ds.sources }
const DOMAINS: Domain[] = ['economy', 'agriculture', 'education', 'health', 'rights', 'environment', 'government']
const all = (importance: ImportanceValue | null, choice: string | null): Answers =>
  Object.fromEntries(ds.questions.map((q) => [q.id, { importance, choice, updatedAt: '' }]))

describe('analytics edge cases', () => {
  it('has exactly 20 assessment screens', () => expect(ds.questions).toHaveLength(20))

  it('every importance zero: no division by zero, all ranked equal', () => {
    const a = all(0, null)
    const dist = importanceDistribution(ds.questions, a)
    expect(dist.levels[0]!.count).toBe(20)
    expect(dist.highImportance).toEqual({ numerator: 0, denominator: 20, value: 0 })
    for (const d of domainImportance(ds.questions, a, DOMAINS)) {
      expect(d.normalized.value).toBe(0)
      expect(d.share.value).toBeNull() // 0 of 0 total points: no percentage
    }
    expect(new Set(topPriorities(ds.questions, a).map((r) => r.rank))).toEqual(new Set([1]))
  })

  it('every importance max: every area at 100%', () => {
    for (const d of domainImportance(ds.questions, all(4, null), DOMAINS)) expect(d.normalized.value).toBe(1)
  })

  it('nothing answered: no percentages, nothing fabricated', () => {
    const dist = importanceDistribution(ds.questions, {})
    expect(dist.highImportance.value).toBeNull()
    for (const d of domainImportance(ds.questions, {}, DOMAINS)) expect(d.normalized.value).toBeNull()
    for (const c of ds.candidates) expect(compareWithCandidate(data, {}, c.id).comparable.value).toBeNull()
  })

  it('every preference unsure: no candidate relations at all', () => {
    const a = all(3, 'unsure')
    expect(completeness(ds.questions, a).unsure.value).toBe(1)
    for (const c of ds.candidates) {
      const cmp = compareWithCandidate(data, a, c.id)
      expect(cmp.chosen).toBe(0)
      expect(Object.values(cmp.counts).every((n) => n === 0)).toBe(true)
    }
  })

  it('categories with identical priority values tie rather than being ordered arbitrarily', () => {
    const d = domainImportance(ds.questions, all(2, null), DOMAINS)
    expect(new Set(d.map((x) => x.normalized.value))).toEqual(new Set([0.5]))
  })

  it('unknown positions are their own bucket, excluded from the comparable denominator', () => {
    const a = Object.fromEntries(ds.questions.map((q) => [q.id, { importance: 4 as const, choice: q.options[0]!.id, updatedAt: '' }]))
    for (const c of ds.candidates) {
      const cmp = compareWithCandidate(data, a, c.id)
      const { aligned, partial, conflicting } = cmp.counts
      expect(cmp.comparable.numerator).toBe(aligned + partial + conflicting)
      expect(cmp.chosen).toBe(20)
      expect(Object.values(cmp.counts).reduce((s, n) => s + n, 0)).toBe(20)
    }
  })

  it('modifying an answer after completion changes analytics', () => {
    const a = all(1, null)
    const before = importanceDistribution(ds.questions, a).highImportance.numerator
    a['q01'] = { importance: 4, choice: null, updatedAt: '' }
    expect(importanceDistribution(ds.questions, a).highImportance.numerator).toBe(before + 1)
  })

  it('documented overlap and difference come only from documented stances', () => {
    const cross = crossCandidate(data)
    const shared = cross.filter((x) => x.sharedOptionIds.length).map((x) => x.question.id)
    // Eminent domain, water incentives, data centers, local control are documented overlaps in the research.
    expect(shared).toEqual(expect.arrayContaining(['q05', 'q06', 'q17', 'q20']))
    // Firearms has no documented position for either candidate: neither overlap nor difference.
    const firearms = cross.find((x) => x.question.id === 'q14')!
    expect(firearms.sharedOptionIds).toEqual([])
    expect(firearms.dividingOptionIds).toEqual([])
  })
})
