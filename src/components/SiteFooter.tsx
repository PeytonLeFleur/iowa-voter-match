import Link from 'next/link'
import { RESEARCH_CUTOFF, formatDate } from '@/lib/site'

export default function SiteFooter() {
  return (
    <footer className="no-print border-t border-rule text-sm text-muted">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="space-y-1">
          <p>Independent and nonpartisan. Not affiliated with any candidate, campaign, or party.</p>
          <p>
            Research current as of <strong className="font-semibold text-ink-soft">{formatDate(RESEARCH_CUTOFF)}</strong>.
            Your answers stay in your browser.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li><Link href="/about/">About</Link></li>
          <li><Link href="/methodology/">Methodology</Link></li>
          <li><Link href="/sources/">Sources</Link></li>
          <li><Link href="/privacy/">Privacy</Link></li>
        </ul>
      </div>
    </footer>
  )
}
