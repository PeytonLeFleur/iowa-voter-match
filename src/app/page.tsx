import Link from 'next/link'
import candidates from '@data/candidates.json'
import { RESEARCH_CUTOFF, formatDate } from '@/lib/site'

const byLastName = [...candidates].sort((a, b) => a.sortName.localeCompare(b.sortName))

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="max-w-3xl pt-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Iowa governor · 2026
        </p>
        <h1 className="text-5xl leading-[1.05] sm:text-6xl">
          Know where you stand.
          <br />
          Know where they stand.
        </h1>
        <p className="mt-6 text-xl text-ink-soft">
          Answer 20 quick questions about Iowa’s future and find out which candidate for governor agrees with you most,
          by how much, and why, based on what each candidate has actually said.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/assessment/" className="rounded bg-ink px-6 py-3 font-medium text-paper no-underline hover:bg-ink-soft">
            Start 20 Questions
          </Link>
          <Link href="/issues/" className="rounded border border-ink px-6 py-3 font-medium text-ink no-underline hover:bg-paper-deep">
            Explore the Issues
          </Link>
        </div>
      </section>

      <section aria-labelledby="candidates-heading" className="border-t border-rule pt-10">
        <h2 id="candidates-heading" className="text-2xl">The candidates</h2>
        <p className="mt-1 text-sm text-muted">Listed alphabetically by last name.</p>
        <ul className="mt-6 grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2">
          {byLastName.map((c) => (
            <li key={c.id} className="bg-paper p-6">
              <p className="font-serif text-3xl">{c.name}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-10 border-t border-rule pt-10 md:grid-cols-3">
        <div>
          <h2 className="text-xl">How it works</h2>
          <p className="mt-3 text-ink-soft">
            For each of 20 issues you pick the answer closest to your view and say how much it matters to you. At the end
            you see who you should vote for, each candidate’s agreement percentage, and the issues behind it.
          </p>
        </div>
        <div>
          <h2 className="text-xl">Evidence, not endorsements</h2>
          <p className="mt-3 text-ink-soft">
            Every candidate position links to its original source and date. Where a candidate hasn’t taken a position,
            we say so plainly, and it never counts for or against them in your result.{' '}
            <Link href="/methodology/">Read the methodology</Link>.
          </p>
        </div>
        <div>
          <h2 className="text-xl">Private by default</h2>
          <p className="mt-3 text-ink-soft">
            No account, no trackers, no ads. Your answers are saved only in your own browser.{' '}
            <Link href="/privacy/">Privacy policy</Link>.
          </p>
        </div>
      </section>

      <p className="text-sm text-muted">Research current as of {formatDate(RESEARCH_CUTOFF)}.</p>
    </div>
  )
}
