'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import CodeList from '@/components/evidence/CodeList'
import type { Candidate, Issue, IssueCategory, IssueEvidence, Legislation, PolicyQuestion } from '@/data/schema'
import { useAssessment } from '@/lib/assessment/store'
import { POSITION_ESTABLISHING } from '@/lib/evidence'
import { issueName } from '@/lib/issues'

type EvidenceFilter = 'any' | 'documented' | 'general' | 'none'

const matchesFilter = (codes: string[] | undefined, f: EvidenceFilter) => {
  if (f === 'any' || !codes) return true
  if (f === 'documented') return codes.some((c) => POSITION_ESTABLISHING.has(c as never))
  if (f === 'none') return codes.length === 1 && codes[0] === 'NDP'
  return !codes.some((c) => POSITION_ESTABLISHING.has(c as never)) && !(codes.length === 1 && codes[0] === 'NDP')
}

export default function IssueExplorer({ issues, categories, evidence, candidates, legislation, questions }: {
  issues: Issue[]
  categories: IssueCategory[]
  evidence: IssueEvidence[]
  candidates: Candidate[]
  legislation: Legislation[]
  questions: PolicyQuestion[]
}) {
  const { state } = useAssessment()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [byCandidate, setByCandidate] = useState<Record<string, EvidenceFilter>>({})
  const [hasLaw, setHasLaw] = useState(false)
  const [sort, setSort] = useState<'id' | 'importance'>('id')

  const ev = useMemo(() => {
    const m = new Map<string, IssueEvidence>()
    for (const e of evidence) m.set(`${e.candidateId}×${e.issueId}`, e)
    return m
  }, [evidence])

  /** User importance for an issue = highest importance among assessment questions that cover it. */
  const importanceFor = (issueId: string) => {
    const vals = questions.filter((q) => q.issueIds.includes(issueId)).map((q) => state.answers[q.id]?.importance ?? null)
    const rated = vals.filter((v): v is NonNullable<typeof v> => v !== null)
    return rated.length ? Math.max(...rated) : null
  }

  const q = query.trim().toLowerCase()
  const rows = issues
    .filter((i) => category === 'all' || i.categoryId === category)
    .filter((i) => !hasLaw || i.legislationIds.length > 0)
    .filter((i) => candidates.every((c) => matchesFilter(ev.get(`${c.id}×${i.id}`)?.evidenceCodes, byCandidate[c.id] ?? 'any')))
    .filter((i) => {
      if (!q) return true
      const hay = [i.id, issueName(i), i.legalFramework, ...i.unansweredQuestions,
        ...candidates.map((c) => ev.get(`${c.id}×${i.id}`)?.detail ?? ''),
        ...i.legislationIds.map((l) => legislation.find((x) => x.id === l)?.citation ?? '')].join(' ').toLowerCase()
      return hay.includes(q)
    })
    .sort((a, b) => sort === 'importance' ? (importanceFor(b.id) ?? -1) - (importanceFor(a.id) ?? -1) : 0)

  return (
    <div>
      <div className="no-print grid gap-4 border-y border-rule py-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block text-muted">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Medicaid, HF 2104"
            className="mt-1 w-full rounded border border-rule bg-paper px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block text-muted">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded border border-rule bg-paper px-3 py-2">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {candidates.map((c) => (
          <label key={c.id} className="text-sm">
            <span className="block text-muted">{c.name}’s evidence</span>
            <select value={byCandidate[c.id] ?? 'any'} onChange={(e) => setByCandidate({ ...byCandidate, [c.id]: e.target.value as EvidenceFilter })}
              className="mt-1 w-full rounded border border-rule bg-paper px-3 py-2">
              <option value="any">Any</option>
              <option value="documented">Explicit, proposal, or action</option>
              <option value="general">General, indirect, or unverified only</option>
              <option value="none">No documented position</option>
            </select>
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasLaw} onChange={(e) => setHasLaw(e.target.checked)} />
          Has related legislation
        </label>
        <label className="text-sm">
          <span className="block text-muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as 'id' | 'importance')} className="mt-1 w-full rounded border border-rule bg-paper px-3 py-2">
            <option value="id">Framework order</option>
            <option value="importance">My importance ratings</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-muted" role="status">{rows.length} of {issues.length} issues</p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="py-2 pr-3">Issue</th>
              {candidates.map((c) => <th key={c.id} scope="col" className="py-2 pr-3">{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-rule align-top">
                <th scope="row" className="py-3 pr-3 font-normal">
                  <span className="block text-xs tabular-nums text-muted">{i.id} · {categories.find((c) => c.id === i.categoryId)?.name}</span>
                  <Link href={`/issues/${i.slug}/`} className="font-medium">{issueName(i)}</Link>
                </th>
                {candidates.map((c) => {
                  const e = ev.get(`${c.id}×${i.id}`)
                  return (
                    <td key={c.id} className="py-3 pr-3">
                      {e && <CodeList codes={e.evidenceCodes} />}
                      {e?.detail && <span className="mt-1 line-clamp-2 block text-ink-soft">{e.detail}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
