// Cross-record integrity rules for the research dataset. Schema shape is
// checked by Zod; these rules check meaning: references resolve, evidence
// classes are used consistently, unknowns stay unknown, and every quotation
// exists verbatim in the original research documents.
import { POSITION_ESTABLISHING } from '@/lib/evidence'
import type { Dataset } from './schema'

export interface Finding {
  rule: string
  entity: string
  message: string
}

export interface IntegrityReport {
  errors: Finding[]
  warnings: Finding[]
}

/** Normalize typography so a quote matches regardless of curly quotes, dashes, or line wrapping. */
export function normalizeForQuoteMatch(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True when every fragment of `quote` (split at ellipses, which mark omissions)
 * appears in `corpus`, in order. Corpus must already be normalized.
 */
export function quoteAppearsIn(quote: string, corpus: string): boolean {
  const fragments = normalizeForQuoteMatch(quote)
    .split(/\s*(?:\.\.\.|…|\[\.\.\.\])\s*/)
    .map((f) => f.replace(/^["']|["']$/g, '').trim())
    .filter((f) => f.length > 0)
  if (fragments.length === 0) return false
  let from = 0
  for (const f of fragments) {
    const at = corpus.indexOf(f, from)
    if (at === -1) return false
    from = at + f.length
  }
  return true
}

export function checkIntegrity(ds: Dataset, rawResearch: string | null): IntegrityReport {
  const errors: Finding[] = []
  const warnings: Finding[] = []
  const err = (rule: string, entity: string, message: string) => errors.push({ rule, entity, message })
  const warn = (rule: string, entity: string, message: string) => warnings.push({ rule, entity, message })
  const release = ds.meta.status === 'release'
  const completeness = release ? err : warn

  // --- Unique identifiers -------------------------------------------------
  const index = <T extends { id: string }>(name: string, rows: T[]) => {
    const map = new Map<string, T>()
    for (const r of rows) {
      if (map.has(r.id)) err('unique-id', `${name}:${r.id}`, `duplicate ${name} id`)
      map.set(r.id, r)
    }
    return map
  }
  const candidates = index('candidate', ds.candidates)
  const categories = index('category', ds.categories)
  const issues = index('issue', ds.issues)
  const legislation = index('legislation', ds.legislation)
  const sources = index('source', ds.sources)
  const statements = index('statement', ds.statements)
  const questions = index('question', ds.questions)
  index('issue-evidence', ds.issueEvidence)
  index('position', ds.positions)
  index('verification', ds.verifications)

  const uniqueSlugs = (name: string, rows: { id: string; slug: string }[]) => {
    const seen = new Set<string>()
    for (const r of rows) {
      if (seen.has(r.slug)) err('unique-slug', `${name}:${r.id}`, `duplicate slug "${r.slug}"`)
      seen.add(r.slug)
    }
  }
  uniqueSlugs('candidate', ds.candidates)
  uniqueSlugs('issue', ds.issues)
  uniqueSlugs('question', ds.questions)
  uniqueSlugs('category', ds.categories)

  const refs = (entity: string, field: string, ids: string[], target: Map<string, unknown>) => {
    for (const ref of ids) if (!target.has(ref)) err('reference', entity, `${field} → unknown id "${ref}"`)
  }

  // --- Issues ---------------------------------------------------------------
  for (const i of ds.issues) {
    const e = `issue:${i.id}`
    refs(e, 'categoryId', [i.categoryId], categories)
    refs(e, 'legislationIds', i.legislationIds, legislation)
    refs(e, 'sourceIds', i.sourceIds, sources)
  }

  // --- Issue evidence matrix ---------------------------------------------
  const seenIssuePair = new Set<string>()
  for (const ev of ds.issueEvidence) {
    const e = `issue-evidence:${ev.id}`
    refs(e, 'issueId', [ev.issueId], issues)
    refs(e, 'candidateId', [ev.candidateId], candidates)
    const pair = `${ev.candidateId}×${ev.issueId}`
    if (seenIssuePair.has(pair)) err('one-issue-evidence', e, `more than one record for ${pair}`)
    seenIssuePair.add(pair)
  }
  for (const c of ds.candidates)
    for (const i of ds.issues)
      if (!seenIssuePair.has(`${c.id}×${i.id}`))
        completeness('issue-matrix', `issue-evidence:${c.id}×${i.id}`, 'missing record; record NDP explicitly')

  // --- Sources --------------------------------------------------------------
  for (const s of ds.sources) {
    if (s.url === null && s.availability === 'available')
      err('source-availability', `source:${s.id}`, 'source marked available but has no URL')
    if (s.url === null) warn('source-url', `source:${s.id}`, 'source has no original link')
  }

  // --- Questions ------------------------------------------------------------
  const optionIds = new Map<string, Set<string>>()
  for (const q of ds.questions) {
    const e = `question:${q.id}`
    refs(e, 'categoryId', [q.categoryId], categories)
    refs(e, 'issueIds', q.issueIds, issues)
    const ids = new Set<string>()
    for (const o of q.options) {
      if (ids.has(o.id)) err('unique-id', `${e}/option:${o.id}`, 'duplicate option id within question')
      ids.add(o.id)
      if (/\bunsure\b|\bnot sure\b|need (more information|to learn more)/i.test(o.label))
        err('built-in-unsure', `${e}/option:${o.id}`, '"Unsure" is provided by the interface; remove it from data')
      refs(`${e}/option:${o.id}`, 'relatedIssueIds', o.relatedIssueIds, issues)
      refs(`${e}/option:${o.id}`, 'legislationIds', o.legislationIds, legislation)
      refs(`${e}/option:${o.id}`, 'sourceIds', o.sourceIds, sources)
    }
    optionIds.set(q.id, ids)
    if (q.reviewStatus === 'draft') warn('review', e, 'question wording and options are an unreviewed draft')
  }
  const orders = ds.questions.map((q) => q.order).sort((a, b) => a - b)
  const core = ds.questions.filter((q) => q.tier === 'core')
  if (core.length !== ds.meta.expectedQuestionCount)
    completeness('question-count', 'questions', `expected ${ds.meta.expectedQuestionCount} core questions, found ${core.length}`)
  if (ds.questions.some((q, i) => q.tier === 'core' && ds.questions.slice(0, i).some((x) => x.tier === 'deep' && x.order < q.order)))
    err('question-order', 'questions', 'core questions must come before deeper questions')

  // --- Assumptions: deep options may be pre-filled from core answers only ---
  for (const q of ds.questions) {
    const seen = new Map<string, string>()
    for (const o of q.options) {
      for (const a of o.assumeFrom) {
        const e = `question:${q.id}/option:${o.id}`
        if (q.tier !== 'deep') err('assume-tier', e, 'only deeper questions can be pre-filled by assumption')
        const src = questions.get(a.questionId)
        if (!src) { err('reference', e, `assumeFrom → unknown question "${a.questionId}"`); continue }
        if (src.tier !== 'core') err('assume-tier', e, 'assumptions must come from a core question')
        for (const oid of a.optionIds) {
          if (!src.options.some((x) => x.id === oid)) err('reference', e, `assumeFrom → unknown option "${oid}" in ${src.id}`)
          const key = `${a.questionId}:${oid}`
          if (seen.has(key) && seen.get(key) !== o.id) err('assume-conflict', e, `${key} already assumes option "${seen.get(key)}"`)
          seen.set(key, o.id)
        }
      }
    }
  }
  if (orders.some((o, i) => o !== i + 1))
    err('question-order', 'questions', `question order must run 1..${orders.length} without gaps: ${orders.join(',')}`)
  if (ds.issues.length !== ds.meta.expectedIssueCount)
    completeness('issue-count', 'issues', `expected ${ds.meta.expectedIssueCount} issues, found ${ds.issues.length}`)

  // --- Statements -----------------------------------------------------------
  const corpus = rawResearch === null ? null : normalizeForQuoteMatch(rawResearch)
  for (const s of ds.statements) {
    const e = `statement:${s.id}`
    refs(e, 'candidateId', [s.candidateId], candidates)
    refs(e, 'sourceId', [s.sourceId], sources)
    refs(e, 'issueIds', s.issueIds, issues)
    refs(e, 'questionIds', s.questionIds, questions)
    refs(e, 'supersededByIds', s.supersededByIds, statements)
    refs(e, 'conflictsWithIds', s.conflictsWithIds, statements)
    if (s.evidenceClass === 'SNV' && s.verificationStatus === 'verified')
      err('snv-not-verified', e, 'SNV evidence cannot be marked verified')
    if (s.evidenceClass === 'NDP') err('statement-ndp', e, 'a statement cannot be NDP; record missing evidence on the position')
    if (s.quote !== null) {
      if (corpus === null) err('quote-provenance', e, 'quotation cannot be checked: no raw research documents found')
      else if (!quoteAppearsIn(s.quote, corpus))
        err('quote-provenance', e, 'quotation does not appear verbatim in the research documents')
    }
    if (s.date && s.date > ds.meta.researchCutoff) warn('after-cutoff', e, `dated ${s.date}, after the research cutoff`)
    if (s.date === null) warn('undated', e, 'statement has no date')
    const src = sources.get(s.sourceId)
    if (src?.availability === 'unavailable' && s.verificationStatus === 'verified')
      warn('source-unavailable', e, 'verified statement now cites an unavailable source; display must note this')
  }

  // --- Positions ------------------------------------------------------------
  const seenPair = new Set<string>()
  for (const p of ds.positions) {
    const e = `position:${p.id}`
    refs(e, 'candidateId', [p.candidateId], candidates)
    refs(e, 'questionId', [p.questionId], questions)
    refs(e, 'issueIds', p.issueIds, issues)
    refs(e, 'statementIds', p.statementIds, statements)
    refs(e, 'sourceIds', p.sourceIds, sources)

    const pair = `${p.candidateId}×${p.questionId}`
    if (seenPair.has(pair)) err('one-position', e, `more than one position for ${pair}`)
    seenPair.add(pair)

    for (const sid of p.statementIds) {
      const s = statements.get(sid)
      if (s && s.candidateId !== p.candidateId)
        err('statement-owner', e, `statement ${sid} belongs to ${s.candidateId}, not ${p.candidateId}`)
    }

    const c = p.evidenceClass
    const expectedFound = POSITION_ESTABLISHING.has(c) || c === 'CF' ? true : c === 'NDP' ? false : null
    if (p.positionFound !== expectedFound)
      err('position-found', e, `${c} requires positionFound=${String(expectedFound)}, got ${String(p.positionFound)}`)

    if (POSITION_ESTABLISHING.has(c) && p.statementIds.length === 0)
      err('evidence-required', e, `${c} position must reference supporting statements`)
    if (c === 'SNV' && p.verificationStatus === 'verified') err('snv-not-verified', e, 'SNV position cannot be verified')
    if (c === 'NDP' && (p.documentedStance !== null || p.optionRelations !== null || p.proposal !== null))
      err('ndp-empty', e, 'NDP position cannot carry a stance, proposal, or option relations')
    if (c === 'CF') {
      const dated = p.statementIds.map((sid) => statements.get(sid)).filter((s) => s?.date)
      if (dated.length < 2) err('cf-evidence', e, 'conflicting evidence must preserve at least two dated statements')
    }
    if (c === 'SP' && p.proposal === null) warn('sp-proposal', e, 'SP position has no proposal text')

    if (p.optionRelations !== null) {
      if (!POSITION_ESTABLISHING.has(c)) err('relations-evidence', e, `option relations require EP/SP/DA evidence, not ${c}`)
      if (p.verificationStatus !== 'verified') err('relations-verified', e, 'option relations require verified evidence')
      if (p.declinedToCommit) err('relations-declined', e, 'a candidate who declined to commit has no comparable stance')
      if (p.comparableToUserPreference !== true) err('relations-comparable', e, 'option relations require comparableToUserPreference=true')
      if (p.statementIds.length === 0 || p.relationRationale === null)
        err('relations-cited', e, 'option relations must cite statements and give a rationale')
      if (Object.values(p.optionRelations).every((r) => r === 'unaddressed'))
        err('relations-empty', e, 'every option is unaddressed; set optionRelations to null and comparable to false')
      const expected = optionIds.get(p.questionId)
      if (expected) {
        const got = new Set(Object.keys(p.optionRelations))
        for (const o of expected) if (!got.has(o)) err('relations-complete', e, `no relation for option "${o}"`)
        for (const o of got) if (!expected.has(o)) err('relations-complete', e, `relation for unknown option "${o}"`)
      }
    } else if (p.comparableToUserPreference === true) {
      err('relations-comparable', e, 'comparableToUserPreference=true requires option relations')
    }
    if (p.researchCutoff > ds.meta.researchCutoff) err('cutoff', e, 'position cutoff is after the dataset cutoff')
    if (p.reviewStatus === 'draft' && p.optionRelations !== null)
      warn('review', e, 'option relations are an unreviewed editorial draft')
  }

  for (const c of ds.candidates)
    for (const q of ds.questions)
      if (!seenPair.has(`${c.id}×${q.id}`))
        completeness('position-matrix', `position:${c.id}×${q.id}`, 'missing record; record NDP explicitly rather than omitting it')

  // --- Verifications --------------------------------------------------------
  const targets: Record<string, Map<string, unknown>> = {
    statement: statements, position: new Map(ds.positions.map((p) => [p.id, p])),
    source: sources, issue: issues, legislation,
  }
  for (const v of ds.verifications) refs(`verification:${v.id}`, 'entityId', [v.entityId], targets[v.entityType]!)

  return { errors, warnings }
}
