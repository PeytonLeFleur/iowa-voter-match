'use client'
import type { PolicyQuestion } from '@/data/schema'
import type { Answers } from '@/lib/analytics'
import { IMPORTANCE_LEVELS, type ImportanceValue } from '@/lib/importance'

export function Section({ id, eyebrow, title, intro, children }: {
  id: string
  eyebrow: string
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-ink pt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      <h2 id={`${id}-h`} className="mt-1 text-3xl">{title}</h2>
      {intro && <div className="mt-3 max-w-3xl text-ink-soft">{intro}</div>}
      <div className="mt-8 space-y-12">{children}</div>
    </section>
  )
}

export function Panel({ n, title, note, children }: { n: number; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-baseline gap-3 text-xl">
        <span className="font-sans text-xs font-semibold tabular-nums text-muted">{String(n).padStart(2, '0')}</span>
        {title}
      </h3>
      {note && <p className="mt-1 max-w-3xl text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

/** Inline importance editor; changes save immediately and every chart recomputes. */
export function ImportanceSelect({ q, answers, onChange }: {
  q: PolicyQuestion
  answers: Answers
  onChange: (qid: string, v: ImportanceValue | null) => void
}) {
  const v = answers[q.id]?.importance
  return (
    <select
      aria-label={`Importance of ${q.title}`}
      value={v == null ? '' : String(v)}
      onChange={(e) => onChange(q.id, e.target.value === '' ? null : (Number(e.target.value) as ImportanceValue))}
      className="rounded border border-rule bg-paper px-2 py-1 text-sm text-ink"
    >
      <option value="">Not rated</option>
      {IMPORTANCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
    </select>
  )
}

/** Sequential single-hue ramp for importance 0–4 (light → dark bronze). */
export const HEAT = ['#efe7d9', '#ddc7a4', '#c39b66', '#835419', '#5a3810'] as const
export const heatText = (v: number) => (v >= 3 ? 'text-paper' : 'text-ink')
