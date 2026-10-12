/** A percentage that always carries its numerator and denominator. `value` is null when the denominator is 0. */
export interface Ratio {
  numerator: number
  denominator: number
  /** 0–1, or null when undefined. Never a stand-in for missing data. */
  value: number | null
}

export function ratio(numerator: number, denominator: number): Ratio {
  return { numerator, denominator, value: denominator > 0 ? numerator / denominator : null }
}

/** "8 of 20 (40%)" — or "0 of 0" with no percentage when the denominator is zero. */
export function formatRatio(r: Ratio, noun?: string): string {
  const base = `${r.numerator} of ${r.denominator}${noun ? ` ${noun}` : ''}`
  return r.value === null ? base : `${base} (${Math.round(r.value * 100)}%)`
}
