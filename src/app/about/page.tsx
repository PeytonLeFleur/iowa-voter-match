import type { Metadata } from 'next'
import Link from 'next/link'
import PageIntro from '@/components/PageIntro'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <article className="max-w-3xl">
      <PageIntro eyebrow="About" title="About this project">
        A nonpartisan research tool for Iowa voters.
      </PageIntro>
      <div className="space-y-4 text-ink-soft">
        <p>
          Iowa Voter Match helps you understand your own priorities and compare them with what the candidates for
          governor have actually documented in public. It is independent and is not affiliated with any candidate,
          campaign, or party.
        </p>
        <p>
          The site does not endorse anyone. It shows how closely each candidate’s documented positions match your
          answers, shows the evidence behind every match, discloses what is unknown, and leaves the decision to you. See the <Link href="/methodology/">methodology</Link> for
          details.
        </p>
        <p>
          The project is open source under the MIT license:{' '}
          <a href="https://github.com/PeytonLeFleur/iowa-voter-match">github.com/PeytonLeFleur/iowa-voter-match</a>.
        </p>
      </div>
    </article>
  )
}
