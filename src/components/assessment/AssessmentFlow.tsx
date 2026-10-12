'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { PolicyQuestion } from '@/data/schema'
import { useAssessment, type Answer } from '@/lib/assessment/store'
import { IMPORTANCE_LEVELS, type ImportanceValue } from '@/lib/importance'
import ChoiceGroup from './ChoiceGroup'

const UNSURE = 'unsure'
const SKIPPED = 'skipped'

export const UNSURE_LABEL = 'Not sure / need to learn more'

export function choiceLabel(q: PolicyQuestion, choice: string | null | undefined): string {
  if (choice === UNSURE) return UNSURE_LABEL
  if (choice === SKIPPED || choice == null) return 'No preference given'
  return q.options.find((o) => o.id === choice)?.label ?? 'No preference given'
}

export const importanceLabel = (v: ImportanceValue | null | undefined) =>
  v == null ? 'Not rated' : IMPORTANCE_LEVELS[v]!.label

export default function AssessmentFlow({ questions }: { questions: PolicyQuestion[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const { state, hydrated, wasCorrupt, setImportance, setChoice, markComplete, reset } = useAssessment()
  const raw = params.get('q')
  const step = raw === 'review' ? 'review' : Math.min(Math.max(Number(raw) || 1, 1), questions.length)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the new question so keyboard and screen reader users start at the top.
  useEffect(() => {
    if (raw) headingRef.current?.focus()
  }, [raw])

  const go = (s: number | 'review') => router.push(`?q=${s}`, { scroll: true })

  if (!hydrated) return <p className="text-muted">Loading your saved answers…</p>

  if (step === 'review') {
    return (
      <ReviewScreen
        questions={questions}
        answers={state.answers}
        headingRef={headingRef}
        onEdit={go}
        onFinish={() => { markComplete(); router.push('/results/') }}
        onReset={() => { reset(); go(1) }}
      />
    )
  }

  const q = questions[step - 1]!
  const answer: Answer | undefined = state.answers[q.id]
  const answeredCount = questions.filter((x) => state.answers[x.id]?.importance != null).length

  return (
    <div className="mx-auto max-w-3xl">
      {wasCorrupt && (
        <p role="status" className="mb-6 border-l-2 border-rule bg-paper-deep px-4 py-3 text-sm text-ink-soft">
          Your saved answers could not be read, so the assessment has started fresh.
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-4 mb-8 bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-baseline justify-between text-sm text-muted">
          <span>Question <strong className="text-ink">{step}</strong> of {questions.length}</span>
          <span>{answeredCount} rated</span>
        </div>
        <div className="mt-2 flex gap-[2px]" aria-hidden>
          {questions.map((x, i) => (
            <span
              key={x.id}
              className={`h-1.5 flex-1 rounded-full ${i + 1 === step ? 'bg-accent' : state.answers[x.id]?.importance != null ? 'bg-ink-soft' : 'bg-rule'}`}
            />
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{q.title}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl outline-none sm:text-4xl">
        {q.prompt}
      </h1>
      <p className="mt-4 text-ink-soft">{q.context}</p>
      {q.learnMore && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent-deep underline underline-offset-4">Learn about this issue</summary>
          <p className="mt-2 border-l-2 border-rule pl-3 text-ink-soft">{q.learnMore}</p>
        </details>
      )}

      <div className="mt-10 space-y-10">
        <ChoiceGroup
          name={`importance-${q.id}`}
          legend="How important is this issue to you?"
          columns
          items={IMPORTANCE_LEVELS.map((l) => ({ value: String(l.value), label: l.label }))}
          value={answer?.importance != null ? String(answer.importance) : null}
          onChange={(v) => setImportance(q.id, Number(v) as ImportanceValue)}
        />

        <ChoiceGroup
          name={`choice-${q.id}`}
          legend="Which comes closest to what you think?"
          hint="Pick one, or choose “Not sure.” There are no wrong answers."
          items={[
            ...q.options.map((o) => ({ value: o.id, label: o.label, description: o.description })),
            { value: UNSURE, label: UNSURE_LABEL },
          ]}
          value={answer?.choice && answer.choice !== SKIPPED ? answer.choice : null}
          onChange={(v) => setChoice(q.id, v)}
        />
      </div>

      <nav aria-label="Question navigation" className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 1}
          className="rounded border border-ink px-5 py-3 font-medium text-ink hover:bg-paper-deep disabled:cursor-not-allowed disabled:border-rule disabled:text-muted"
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {answer?.choice == null && (
            <button type="button" onClick={() => { setChoice(q.id, SKIPPED); go(step < questions.length ? step + 1 : 'review') }}
              className="px-3 py-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
              Skip this question
            </button>
          )}
          <button
            type="button"
            onClick={() => go(step < questions.length ? step + 1 : 'review')}
            className="rounded bg-ink px-6 py-3 font-medium text-paper hover:bg-ink-soft"
          >
            {step < questions.length ? 'Next' : 'Review answers'}
          </button>
        </div>
      </nav>
      <p className="mt-4 text-sm text-muted">Answers save automatically in this browser.</p>
    </div>
  )
}

function ReviewScreen({ questions, answers, headingRef, onEdit, onFinish, onReset }: {
  questions: PolicyQuestion[]
  answers: Record<string, Answer>
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onEdit: (step: number) => void
  onFinish: () => void
  onReset: () => void
}) {
  const unrated = questions.filter((q) => answers[q.id]?.importance == null).length
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Review</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-4xl outline-none">Review your answers</h1>
      <p className="mt-4 text-ink-soft">
        Change anything you like before opening your results. You can also edit importance later from the results page.
      </p>
      {unrated > 0 && (
        <p role="status" className="mt-4 border-l-2 border-rule bg-paper-deep px-4 py-3 text-sm text-ink-soft">
          {unrated} {unrated === 1 ? 'question has' : 'questions have'} no importance rating. They will appear as “Not rated”
          and are left out of priority calculations rather than counted as zero.
        </p>
      )}
      <ol className="mt-8 divide-y divide-rule border-y border-rule">
        {questions.map((q, i) => (
          <li key={q.id} className="grid gap-1 py-4 sm:grid-cols-[2rem_1fr_auto] sm:items-baseline sm:gap-4">
            <span className="text-sm tabular-nums text-muted">{i + 1}</span>
            <div>
              <p className="font-medium">{q.title}</p>
              <p className="text-sm text-ink-soft">
                {importanceLabel(answers[q.id]?.importance)} · {choiceLabel(q, answers[q.id]?.choice)}
              </p>
            </div>
            <button type="button" onClick={() => onEdit(i + 1)} className="justify-self-start text-sm text-accent-deep underline underline-offset-4">
              Edit<span className="sr-only"> {q.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={onReset} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Clear my answers and start over
        </button>
        <button type="button" onClick={onFinish} className="rounded bg-ink px-6 py-3 font-medium text-paper hover:bg-ink-soft">
          See my results
        </button>
      </div>
      <p className="mt-6 text-sm text-muted">
        Prefer to look around first? <Link href="/issues/">Explore the issues</Link>.
      </p>
    </div>
  )
}
