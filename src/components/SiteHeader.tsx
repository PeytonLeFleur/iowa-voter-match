import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'

const NAV = [
  { href: '/assessment/', label: 'Assessment' },
  { href: '/results/', label: 'My results' },
  { href: '/compare/', label: 'Compare' },
  { href: '/issues/', label: 'Issues' },
  { href: '/candidates/', label: 'Candidates' },
  { href: '/methodology/', label: 'Methodology' },
]

export default function SiteHeader() {
  return (
    <header className="no-print border-b border-rule">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-xl text-ink no-underline">
          {SITE_NAME}
        </Link>
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex gap-6 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-ink-soft no-underline hover:text-ink hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded border border-rule px-3 py-2 text-sm">Menu</summary>
          <nav aria-label="Primary" className="absolute right-0 z-20 mt-2 w-56 border border-rule bg-paper p-2 shadow-sm">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block px-3 py-3 text-ink no-underline hover:bg-paper-deep">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  )
}
