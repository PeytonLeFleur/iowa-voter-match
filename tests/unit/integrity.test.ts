import { describe, expect, it } from 'vitest'
import { checkIntegrity, quoteAppearsIn, normalizeForQuoteMatch } from '@/data/integrity'
import { getDataset } from '@/data/load'
import type { Dataset } from '@/data/schema'
import { baseDataset, position, RAW_RESEARCH, statement } from '../fixtures/builders'

const rules = (ds: Dataset, raw: string | null = RAW_RESEARCH) => checkIntegrity(ds, raw).errors.map((e) => e.rule)

describe('integrity rules', () => {
  it('the base fixture is clean', () => {
    expect(checkIntegrity(baseDataset(), RAW_RESEARCH).errors).toEqual([])
  })

  it('the real dataset has no integrity errors', () => {
    expect(checkIntegrity(getDataset(), null).errors.filter((e) => e.rule !== 'quote-provenance')).toEqual([])
  })

  it('rejects quotations not found verbatim in the research', () => {
    const ds = baseDataset()
    ds.statements[0] = statement({ id: 'st-1', quote: 'I will abolish the wage' })
    expect(rules(ds)).toContain('quote-provenance')
    expect(rules(baseDataset(), null)).toContain('quote-provenance')
  })

  it('rejects SNV marked verified', () => {
    const ds = baseDataset()
    ds.statements.push(statement({ id: 'st-x', evidenceClass: 'SNV', verificationStatus: 'verified' }))
    expect(rules(ds)).toContain('snv-not-verified')
  })

  it('rejects NDP carrying a stance or relations', () => {
    const ds = baseDataset()
    ds.positions[1] = { ...ds.positions[1]!, documentedStance: 'Opposes.' }
    expect(rules(ds)).toContain('ndp-empty')
  })

  it('rejects NDP encoded as false-positive positionFound', () => {
    const ds = baseDataset()
    ds.positions[1] = { ...ds.positions[1]!, positionFound: true }
    expect(rules(ds)).toContain('position-found')
  })

  it('rejects option relations on general, unverified, or declined evidence', () => {
    for (const over of [
      { evidenceClass: 'GS' as const, positionFound: null },
      { verificationStatus: 'unverified' as const },
      { declinedToCommit: true },
    ]) {
      const ds = baseDataset()
      ds.positions[0] = { ...ds.positions[0]!, ...over }
      expect(rules(ds).some((r) => r.startsWith('relations-'))).toBe(true)
    }
  })

  it('requires relations to cover every option exactly', () => {
    const ds = baseDataset()
    ds.positions[0] = { ...ds.positions[0]!, optionRelations: { raise: 'aligned' } }
    expect(rules(ds)).toContain('relations-complete')
  })

  it('requires conflicting evidence to keep two dated statements', () => {
    const ds = baseDataset()
    ds.positions[0] = position({ id: 'p-a', evidenceClass: 'CF', statementIds: ['st-1'] })
    expect(rules(ds)).toContain('cf-evidence')
  })

  it('requires documented positions to cite evidence', () => {
    const ds = baseDataset()
    ds.positions[0] = position({ id: 'p-a', evidenceClass: 'EP' })
    expect(rules(ds)).toContain('evidence-required')
  })

  it('rejects a statement attributed to the wrong candidate', () => {
    const ds = baseDataset()
    ds.positions[0] = { ...ds.positions[0]!, statementIds: ['st-b'] }
    expect(rules(ds)).toContain('statement-owner')
  })

  it('treats a missing candidate × question record as an error at release', () => {
    const ds = baseDataset()
    ds.positions.pop()
    expect(rules(ds)).not.toContain('position-matrix')
    ds.meta.status = 'release'
    expect(rules(ds)).toContain('position-matrix')
  })

  it('rejects "Unsure" stored as a data option', () => {
    const ds = baseDataset()
    ds.questions[0]!.options.push({ ...ds.questions[0]!.options[0]!, id: 'u', label: 'Unsure or need more information' })
    expect(rules(ds)).toContain('built-in-unsure')
  })

  it('rejects broken references', () => {
    const ds = baseDataset()
    ds.statements[0] = { ...ds.statements[0]!, sourceId: 'nope' }
    expect(rules(ds)).toContain('reference')
  })
})

describe('quote matching', () => {
  const corpus = normalizeForQuoteMatch('He said “we’ll cut the tax — and fund\n schools” on Tuesday.')
  it('ignores typographic differences and line wrapping', () => {
    expect(quoteAppearsIn("we'll cut the tax - and fund schools", corpus)).toBe(true)
  })
  it('allows ellipses for omitted words, in order', () => {
    expect(quoteAppearsIn('we’ll cut … fund schools', corpus)).toBe(true)
    expect(quoteAppearsIn('fund schools … we’ll cut', corpus)).toBe(false)
  })
  it('rejects altered wording', () => {
    expect(quoteAppearsIn('we’ll raise the tax', corpus)).toBe(false)
  })
})
