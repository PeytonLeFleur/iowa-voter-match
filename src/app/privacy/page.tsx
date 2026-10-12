import type { Metadata } from 'next'
import PageIntro from '@/components/PageIntro'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl">
      <PageIntro eyebrow="Privacy" title="Privacy policy">
        Short version: your answers never leave your browser.
      </PageIntro>
      <div className="space-y-6 text-ink-soft [&_h2]:text-2xl [&_h2]:text-ink">
        <section>
          <h2>Your assessment answers</h2>
          <p className="mt-3">
            Your answers are saved in your browser’s local storage so you can leave and come back. They are not sent to
            any server. Clearing your browser data, or using the “Clear my answers” control, deletes them.
          </p>
        </section>
        <section>
          <h2>No accounts, trackers, or ads</h2>
          <p className="mt-3">
            This site has no sign-in, no advertising, no analytics scripts, and no behavioral profiling. Fonts are
            served from this site rather than a third party.
          </p>
        </section>
        <section>
          <h2>Hosting</h2>
          <p className="mt-3">
            The site is currently hosted on GitHub Pages. Like any web host, GitHub may record standard request
            information such as IP addresses in its server logs. We do not receive or use that information.
          </p>
        </section>
        <section>
          <h2>Future features</h2>
          <p className="mt-3">
            We will not collect personal or political preference data on a server unless you explicitly opt in to a
            clearly explained feature.
          </p>
        </section>
      </div>
    </article>
  )
}
