import type { CandidateStatement, EvidenceSource } from '@/data/schema'
import { evidenceLabel } from '@/lib/evidence'
import { formatPartialDate } from '@/lib/site'

/** One piece of evidence: the candidate's words (or a labeled paraphrase), its source, date, and status. */
export default function StatementItem({ s, source }: { s: CandidateStatement; source: EvidenceSource | undefined }) {
  const date = s.date ? formatPartialDate(s.date) : 'Date not given'
  return (
    <li className="text-sm">
      {s.quote ? (
        <blockquote className="border-l-2 border-ink-soft pl-3 font-serif text-base leading-snug text-ink">“{s.quote}”</blockquote>
      ) : (
        <p className="text-ink-soft">
          <span className="mr-1 rounded-sm bg-paper-deep px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">Paraphrase</span>
          {s.summary}
        </p>
      )}
      {s.quote && <p className="mt-1 text-ink-soft">{s.summary}</p>}
      <p className="mt-1 text-xs text-muted">
        {source?.url ? <a href={source.url} rel="noopener noreferrer" target="_blank">{source.title}</a> : <span>{source?.title ?? 'Unknown source'}</span>}
        {source?.publisher && ` · ${source.publisher}`}
        {s.reportedVia && ` · via ${s.reportedVia}`}
        {' · '}{date}
        {' · '}{evidenceLabel(s.evidenceClass)}
        {s.verificationStatus !== 'verified' && <span className="ml-1 rounded-sm border border-dashed border-ink-soft px-1">Source not verified</span>}
        {!source?.url && <span className="ml-1">(no original link in the research)</span>}
        {source?.availability === 'unavailable' && <span className="ml-1">(source currently unavailable)</span>}
      </p>
    </li>
  )
}
