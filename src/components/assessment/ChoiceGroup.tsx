'use client'

export interface ChoiceItem {
  value: string
  label: string
  description?: string
}

/**
 * A radio group built on native inputs, so arrow keys, focus, and screen reader
 * semantics come from the browser. The whole row is the click target.
 */
export default function ChoiceGroup({ name, legend, hint, items, value, onChange, columns = false }: {
  name: string
  legend: string
  hint?: string
  items: ChoiceItem[]
  value: string | null
  onChange: (value: string) => void
  columns?: boolean
}) {
  return (
    <fieldset>
      <legend className="font-serif text-xl text-ink">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className={`mt-4 grid gap-2 ${columns ? 'sm:grid-cols-5' : ''}`}>
        {items.map((item) => {
          const checked = value === item.value
          return (
            <label
              key={item.value}
              className={`group relative flex cursor-pointer gap-3 rounded border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                checked ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink-soft hover:bg-paper-deep'
              } ${columns ? 'sm:flex-col sm:items-start sm:gap-1' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={item.value}
                checked={checked}
                onChange={() => onChange(item.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${checked ? 'border-paper bg-paper shadow-[inset_0_0_0_3px_var(--color-ink)]' : 'border-ink-soft'} ${columns ? 'sm:mt-0' : ''}`}
              />
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                {item.description && (
                  <span className={`mt-0.5 block text-sm ${checked ? 'text-paper/85' : 'text-ink-soft'}`}>{item.description}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
