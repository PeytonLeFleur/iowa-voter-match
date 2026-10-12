import type { Metadata } from 'next'
import Link from 'next/link'
import PageIntro from '@/components/PageIntro'
import { RESEARCH_CUTOFF, formatDate } from '@/lib/site'
import { IMPORTANCE_LEVELS } from '@/lib/importance'
import { EVIDENCE_CLASSES } from '@/lib/evidence'

export const metadata: Metadata = { title: 'Methodology' }

export default function MethodologyPage() {
  return (
    <article className="max-w-3xl">
      <PageIntro eyebrow="How this works" title="Methodology">
        What the assessment measures, how every number is calculated, how candidate evidence is classified, and
        what this site cannot tell you.
      </PageIntro>

      <div className="space-y-12 text-ink-soft [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:text-ink [&_p]:mt-3">
        <section>
          <h2>What this site does and does not do</h2>
          <p>
            Iowa Voter Match helps you see your own priorities and compare them with what each candidate has publicly
            documented. It shows a match percentage based only on documented positions. It does not endorse a candidate,
            predict how you will vote, or estimate whether a candidate will keep a promise.
          </p>
        </section>

        <section>
          <h2>The importance scale</h2>
          <p>Every question uses the same five levels. We store the answer you chose, not just its number.</p>
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="py-2 pr-4 font-semibold text-ink">Answer</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold text-ink">Value</th>
                <th scope="col" className="py-2 text-right font-semibold text-ink">Normalized</th>
              </tr>
            </thead>
            <tbody>
              {IMPORTANCE_LEVELS.map((l) => (
                <tr key={l.value} className="border-b border-rule">
                  <td className="py-2 pr-4">{l.label}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{l.value}</td>
                  <td className="py-2 text-right tabular-nums">{l.value * 25}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            These percentages describe the level you selected. They are not scientific measures of how strongly you
            feel or how much a policy actually affects you. Choosing “Doesn’t affect me” is never treated as proof
            that an issue has no effect on you.
          </p>
        </section>

        <section>
          <h2>How percentages are calculated</h2>
          <p>
            Every percentage on this site is shown next to its numerator and denominator, for example “Documented
            positions found for 8 of your 20 policy questions (40%).” When a denominator would be zero, we show no
            percentage rather than a misleading one.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li><strong className="text-ink">Category priority:</strong> the importance points you gave a category, divided by the maximum possible for that category (number of its questions × 4). Categories with more questions are not automatically emphasized.</li>
            <li><strong className="text-ink">Research coverage:</strong> the share of policy questions for which an explicit, verified candidate statement was found. This measures the available record, not the candidate.</li>
            <li><strong className="text-ink">Proposal documentation:</strong> the share of issues with a documented, specific implementation proposal.</li>
            <li><strong className="text-ink">Answer completeness:</strong> the share of the 20 questions you answered.</li>
          </ul>
        </section>

        <section id="match">
          <h2>How your match percentage is calculated</h2>
          <p>
            For each issue where you chose a position, a candidate earns full credit if their documented position aligns
            with your choice, half credit if it partly overlaps, and none if it differs. Each issue is weighted by the
            importance you gave it, from 0 (Doesn’t affect me) to 4 (Extremely passionate); unrated issues count as 2.
            The percentage is the credit earned divided by the most that could be earned on the issues counted.
          </p>
          <p>
            Only issues where the candidate has a verified explicit statement, specific proposal, or documented action
            that speaks to your choice are counted. Issues where the position is not found, only general, indirect,
            unverified, or conflicting are left out of that candidate’s percentage entirely, so each percentage shows how
            many issues it is based on. A closest match is named only when both candidates have at least three comparable
            issues, and results within five points are reported as close to even.
          </p>
          <p>
            Answers from the optional Go deeper round count the same way. When you rate a core question Very important or
            higher, closely related deeper questions are pre-filled with the matching answer (for example, a strong view
            on abortion pre-fills the IVF question). These are labeled Assumed, count in your match, and are replaced the
            moment you answer yourself. Assumptions are made only between closely related questions, in both directions,
            and only about your answers. Candidates’ positions are never assumed.
          </p>
          <p>
            Which policy option a documented position supports is an editorial judgment made by reading the candidate’s
            own statements. Each judgment and its reasoning is shown next to the evidence on the Compare page.
          </p>
        </section>

        <section id="unknown-positions">
          <h2>When a candidate’s position is unknown</h2>
          <p>
            <strong className="text-ink">Unknown is not disagreement. Unknown is not agreement. Unknown is missing evidence.</strong>{' '}
            When we could not establish a candidate’s position on a specific policy, we display “No public position
            found.” It is never counted as a zero, never counted against the candidate, and never included in a
            calculation that requires a known position.
          </p>
          <p>
            Evidence is not transferred between related questions. A candidate who opposes eminent domain for private
            gain in general has not thereby committed to signing a particular bill. Positions are never filled in from
            party affiliation, a running mate, past employers, or media commentary.
          </p>
        </section>

        <section>
          <h2>Evidence classifications</h2>
          <dl className="mt-4 divide-y divide-rule border-y border-rule">
            {EVIDENCE_CLASSES.map((e) => (
              <div key={e.code} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
                <dt className="font-semibold text-ink">{e.label}</dt>
                <dd>{e.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Research limitations and data cutoff</h2>
          <p>
            Candidate research is current as of <strong className="text-ink">{formatDate(RESEARCH_CUTOFF)}</strong>.
            It is the initial evidence dataset, not a complete record of everything either candidate has said. Every
            statement shows its own date, so older positions are visible as older. If a source becomes unavailable, we
            mark that limitation rather than describing its contents from memory.
          </p>
          <p>
            Your privacy is covered separately in the <Link href="/privacy/">privacy policy</Link>.
          </p>
        </section>
      </div>
    </article>
  )
}
