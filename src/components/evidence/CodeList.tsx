import { evidenceLabel, type EvidenceCode } from '@/lib/evidence'

/** Research evidence codes with their plain-language labels. NDP is quiet gray, never an error. */
export default function CodeList({ codes }: { codes: EvidenceCode[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {codes.map((c) => (
        <span key={c} title={evidenceLabel(c)}
          className={`rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${c === 'NDP' ? 'border-transparent bg-unknown-wash text-unknown' : c === 'SNV' ? 'border-dashed border-ink-soft text-ink-soft' : 'border-rule text-ink'}`}>
          {evidenceLabel(c)}
        </span>
      ))}
    </span>
  )
}
