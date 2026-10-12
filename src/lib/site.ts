import meta from '@data/meta.json'

export const SITE_NAME = 'Iowa Voter Match'
export const RESEARCH_CUTOFF = meta.researchCutoff

/** "October 12, 2026" — parsed as a calendar date, not shifted by time zone. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

/** Prefix for raw asset URLs (next/link and next/image add basePath themselves). */
export const assetPath = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${p}`
