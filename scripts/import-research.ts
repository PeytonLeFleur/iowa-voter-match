// Parses the candidate research document into the 107-issue framework:
//   data/categories.json, data/issues.json, data/issue-evidence.json
// Re-runnable; curated files (questions, statements, positions, sources) are
// not touched. Text is copied verbatim from the research. Nothing is inferred,
// and issues the document names only by ID keep a null title.
//   npm run import:research
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EVIDENCE_CODES, type EvidenceCode } from '../src/lib/evidence'

const RAW = join(process.cwd(), 'research/raw/candidate-positions-2026-10-12.md')
const md = readFileSync(RAW, 'utf8')
const CANDIDATES = { Sand: 'rob-sand', Lahn: 'zach-lahn' } as const
type Who = keyof typeof CANDIDATES

const CATEGORIES = [
  ['economy', 'Economy'], ['agriculture', 'Agriculture'], ['health', 'Health'], ['education', 'Education'],
  ['rights', 'Rights'], ['environment-energy', 'Environment and energy'], ['public-safety', 'Public safety'],
  ['labor', 'Labor'], ['institutions', 'Institutions'], ['family', 'Family'], ['iowa-specific', 'Iowa-specific'],
] as const

/** All 107 framework IDs: categories 1–10 have ten issues each, category 11 has seven. */
const ALL_IDS: string[] = []
for (let c = 1; c <= 11; c++) {
  const count = c === 11 ? 7 : 10
  for (let k = 1; k <= count; k++) {
    const n = (c - 1) * 10 + k
    ALL_IDS.push(`${c}.${String(n).padStart(2, '0')}`)
  }
}
const categoryOf = (id: string) => CATEGORIES[Number(id.split('.')[0]) - 1]![0]

// Combined headings in the research ("4.31 and 4.32 School funding and ESAs")
// are split only where the heading itself names each part. Ranges such as
// "2.11 to 2.13" share the group title; individual titles stay null.
const SPLIT_TITLES: Record<string, string> = {
  '1.05': 'Budget', '11.103': 'Taxpayer Relief Fund',
  '4.31': 'School funding', '4.32': 'ESAs',
  '5.41': 'Abortion', '5.42': 'Contraception and IVF',
  '5.46': 'Gender identity and civil rights', '5.47': 'Sports',
  '6.59': 'Data centers', '11.101': 'Data centers',
}

// Legislation the research names, with descriptions only where it gives them.
const LEGISLATION: { citation: string; summary: string | null; issues: string[] }[] = [
  { citation: 'SF 2472', summary: 'Caps most city and county levy growth at 2% and creates a homestead exemption of 10% of value, with a $5,500 minimum and $20,000 maximum.', issues: ['1.01'] },
  { citation: 'SJR 11', summary: null, issues: ['1.02'] },
  { citation: 'HF 2104', summary: null, issues: ['2.15'] },
  { citation: 'HF 2771', summary: 'Water treatment funding.', issues: ['6.51', '6.52', '6.53'] },
  { citation: 'HF 2635', summary: null, issues: ['3.21'] },
  { citation: 'HF 2788', summary: null, issues: ['5.41'] },
  { citation: 'SF 418', summary: 'Removed gender identity from the Iowa Civil Rights Act.', issues: ['5.46'] },
  { citation: 'SF 579', summary: null, issues: ['5.46', '5.47'] },
  { citation: 'SF 496', summary: null, issues: [] },
  { citation: 'HF 291', summary: 'Public-sector collective bargaining.', issues: ['8.72'] },
  { citation: 'HF 2527', summary: 'Greenhouse gas lawsuit shield.', issues: [] },
  { citation: 'HF 2757', summary: null, issues: [] },
  { citation: 'SF 2340', summary: null, issues: ['7.67'] },
  { citation: 'SF 2218', summary: null, issues: ['7.67'] },
]
const legId = (citation: string) => `leg-${citation.toLowerCase().replace(/\s+/g, '-')}`

interface IssueOut {
  id: string; slug: string; title: string | null; groupTitle: string | null; categoryId: string
  summary: null; legalFramework: string | null; legislationIds: string[]; unansweredQuestions: string[]
  similarities: string[]; differences: string[]
}
interface EvidenceOut { id: string; issueId: string; candidateId: string; evidenceCodes: EvidenceCode[]; detail: string | null }

const issues = new Map<string, IssueOut>()
const evidence = new Map<string, EvidenceOut>()

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const issueFor = (id: string): IssueOut => {
  let i = issues.get(id)
  if (!i) {
    i = { id, slug: '', title: null, groupTitle: null, categoryId: categoryOf(id), summary: null, legalFramework: null,
      legislationIds: LEGISLATION.filter((l) => l.issues.includes(id)).map((l) => legId(l.citation)), unansweredQuestions: [], similarities: [], differences: [] }
    issues.set(id, i)
  }
  return i
}
const setEvidence = (issueId: string, who: Who, codes: EvidenceCode[], detail: string | null) => {
  const candidateId = CANDIDATES[who]
  const key = `${candidateId}×${issueId}`
  if (evidence.has(key)) return // first, most specific source wins (priority section precedes summaries)
  evidence.set(key, { id: `ev-${issueId.replace('.', '-')}-${candidateId}`, issueId, candidateId, evidenceCodes: codes, detail })
}

/** Evidence codes named at the start of a cell/label, e.g. "EP and SP", "SP, evolving", "NDP (IND: …)". */
function leadingCodes(s: string): EvidenceCode[] {
  const head = s.split(/:|\.\s|$/)[0] ?? ''
  const codes = head.match(/\b(EP|SP|DA|GS|IND|CF|NDP|SNV)\b/g) ?? []
  const nested = s.match(/^NDP \((IND)\b/) ? ['IND'] : []
  return [...new Set([...codes, ...nested])].filter((c): c is EvidenceCode => (EVIDENCE_CODES as readonly string[]).includes(c))
}
const expandIds = (spec: string): string[] => {
  const range = spec.match(/^(\d+\.\d+) to (\d+\.\d+)$/)
  if (range) {
    const [a, b] = [ALL_IDS.indexOf(range[1]!), ALL_IDS.indexOf(range[2]!)]
    return ALL_IDS.slice(a, b + 1)
  }
  return spec.split(' and ')
}
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

// --- Priority issues: "**1.01 Property tax (SF 2472)**" blocks ---------------
const priority = md.split('### Priority issues')[1]!.split('### Category tables')[0]!
for (const block of priority.split(/\n(?=\*\*\d+\.\d+)/).slice(1)) {
  const head = block.match(/^\*\*(\d+\.\d+(?: (?:and|to) \d+\.\d+)?) (.+?)\*\*/)
  if (!head) continue
  const ids = expandIds(head[1]!)
  const heading = head[2]!
  const lines = block.split('\n').slice(1)

  // Group each top-level "- **Label:**" bullet with its nested sub-bullets.
  const items: { label: string; text: string }[] = []
  for (const line of lines) {
    const top = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/)
    if (top) items.push({ label: top[1]!, text: top[2]! })
    else if (/^\s+- /.test(line) && items.length) items[items.length - 1]!.text += ' ' + line.trim().replace(/^- /, '')
  }

  for (const id of ids) {
    const issue = issueFor(id)
    if (ids.length > 1 && !SPLIT_TITLES[id]) issue.groupTitle = heading
    issue.title = SPLIT_TITLES[id] ?? (ids.length > 1 ? null : heading)
    if (ids.length > 1 && SPLIT_TITLES[id]) issue.groupTitle = heading
    for (const { label, text } of items) {
      const who = label.match(/^(Sand|Lahn)\b(?: \((.+)\))?$/)
      if (who) {
        const codes = who[2] ? leadingCodes(who[2]) : []
        // "Lahn:" with no code (minimum wage) is classified from its text by the curated layer; record as GS.
        setEvidence(id, who[1] as Who, codes.length ? codes : ['GS'], clean(text))
      } else if (label === 'Context') issue.legalFramework = clean(text)
      else if (label === 'Similarity') issue.similarities.push(clean(text))
      else if (label === 'Differences') issue.differences.push(clean(text))
      else if (/^Not addressed|^Neither$/.test(label)) issue.unansweredQuestions.push(clean(text))
      else if (/NDP for both/.test(text)) issue.unansweredQuestions.push(`${label}: ${clean(text)}`)
      else if (label === 'SNV') issue.unansweredQuestions.push(`Source not verified: ${clean(text)}`)
      else if (label === 'Work requirements' || label === 'SJR 11') issue.unansweredQuestions.push(`${label}: ${clean(text)}`)
    }
  }
}

// --- Category tables: "| 1.03 Business tax | cell | cell |" ------------------
const tables = md.split('### Category tables')[1]!.split('## Deliverable C')[0]!
for (const row of tables.matchAll(/^\| (\d+\.\d+) ([^|]+?) \| ([^|]+?) \| ([^|]+?) \|$/gm)) {
  const [, id, title, sand, lahn] = row as unknown as [string, string, string, string, string]
  const issue = issueFor(id)
  issue.title ??= title.trim()
  for (const [who, cell] of [['Sand', sand], ['Lahn', lahn]] as const) {
    const codes = leadingCodes(cell.trim())
    if (!codes.length) throw new Error(`No evidence code in ${id} ${who}: ${cell}`)
    // Codes are stored separately; drop a leading "SP: " label but keep qualifiers like "EP (secondary only)".
    const detail = clean(cell).replace(/^(EP|SP|DA|GS|IND|CF|NDP|SNV)$/, '').replace(/^(EP|SP|DA|GS|IND|CF|SNV):\s*/, '')
    setEvidence(id, who, codes, detail || null)
  }
}

// --- "11. Iowa-specific" line ------------------------------------------------
const iowa = tables.match(/\*\*11\. Iowa-specific:\*\* (.+)/)![1]!
if (/11\.102: Lahn EP \(state regulation\); Sand NDP/.test(iowa)) {
  setEvidence('11.102', 'Lahn', ['EP'], 'EP (state regulation)')
  setEvidence('11.102', 'Sand', ['NDP'], null)
}

// --- Deliverable G: issues with no documented position from either -----------
const both = md.match(/\*\*Both candidates \(29 issues[^)]*\):\*\* ([\d., ]+)\./)![1]!
const ndpBoth = both.split(',').map((s) => s.trim())
if (ndpBoth.length !== 29) throw new Error(`expected 29 NDP-both issues, found ${ndpBoth.length}`)
for (const id of ndpBoth) for (const who of ['Sand', 'Lahn'] as const) setEvidence(id, who, ['NDP'], null)

// Anything still missing: "Issues not listed below are NDP records with null fields" (Deliverable H).
for (const id of ALL_IDS) for (const who of ['Sand', 'Lahn'] as const) setEvidence(id, who, ['NDP'], null)

// --- Finalize ------------------------------------------------------------------
const issueRows = ALL_IDS.map((id) => {
  const i = issueFor(id)
  const label = i.title ?? i.groupTitle
  i.slug = `${id.replace('.', '-')}${label ? `-${slugify(label)}` : ''}`
  return i
})
const evidenceRows = ALL_IDS.flatMap((id) => Object.values(CANDIDATES).map((c) => evidence.get(`${c}×${id}`)!))

const write = (name: string, rows: unknown) => writeFileSync(join(process.cwd(), 'data', name), JSON.stringify(rows, null, 2) + '\n')
write('categories.json', CATEGORIES.map(([slug, name], i) => ({ id: slug, slug, name, order: i + 1 })))
write('issues.json', issueRows)
write('legislation.json', LEGISLATION.map((l) => ({ id: legId(l.citation), citation: l.citation, title: null, session: null, status: null, summary: l.summary, url: null })))
write('issue-evidence.json', evidenceRows)

const untitled = issueRows.filter((i) => !i.title && !i.groupTitle).map((i) => i.id)
console.log(`${issueRows.length} issues, ${evidenceRows.length} evidence records`)
console.log(`${untitled.length} issues referenced by ID only (title pending framework document): ${untitled.join(', ')}`)
