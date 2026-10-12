import { formatRatio, type Ratio } from '@/lib/percent'

/**
 * One horizontal bar with its label and "n of d (p%)" always printed beside it,
 * so the value is never conveyed by length or color alone.
 */
export default function RatioBar({ label, ratio, noun, detail, tone = 'accent' }: {
  label: React.ReactNode
  ratio: Ratio
  noun?: string
  detail?: React.ReactNode
  tone?: 'accent' | 'ink' | 'muted'
}) {
  const pct = ratio.value === null ? 0 : Math.round(ratio.value * 100)
  const fill = tone === 'accent' ? 'bg-accent' : tone === 'ink' ? 'bg-ink-soft' : 'bg-unknown'
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(10rem,14rem)_1fr_auto] sm:items-center sm:gap-4">
      <span className="text-sm text-ink">{label}</span>
      <span className="relative h-3 overflow-hidden rounded-r-[4px] bg-paper-deep" aria-hidden>
        <span className={`absolute inset-y-0 left-0 rounded-r-[4px] ${fill}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm tabular-nums text-ink-soft">
        {ratio.value === null ? <>{formatRatio(ratio, noun)} <span className="text-muted">(no percentage)</span></> : formatRatio(ratio, noun)}
        {detail && <span className="block text-xs text-muted">{detail}</span>}
      </span>
    </div>
  )
}
