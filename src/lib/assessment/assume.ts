// Assumed answers: when a voter strongly holds a view on a core question (rated
// Very important or higher), closely related deeper questions are pre-filled
// with the matching option. Assumptions are derived on the fly, never stored,
// so any explicit answer (including "skip" or "not sure") replaces them.
import type { PolicyQuestion } from '@/data/schema'
import type { Answer } from './store'

/** Minimum importance on the source question for an assumption to apply. */
export const ASSUME_MIN_IMPORTANCE = 3

export type EffectiveAnswer = Answer & {
  /** Set when this answer is assumed: the core question it was derived from. */
  assumedFrom?: string
}

export function assumptionFor(q: PolicyQuestion, answers: Record<string, Answer | undefined>): EffectiveAnswer | null {
  for (const o of q.options) {
    for (const rule of o.assumeFrom) {
      const src = answers[rule.questionId]
      if (src?.choice && rule.optionIds.includes(src.choice) && (src.importance ?? -1) >= ASSUME_MIN_IMPORTANCE) {
        return {
          importance: answers[q.id]?.importance ?? src.importance,
          choice: o.id,
          updatedAt: src.updatedAt,
          assumedFrom: rule.questionId,
        }
      }
    }
  }
  return null
}

/** The voter's answers with assumptions filled in wherever they haven't answered themselves. */
export function effectiveAnswers(questions: PolicyQuestion[], answers: Record<string, Answer | undefined>): Record<string, EffectiveAnswer> {
  const out: Record<string, EffectiveAnswer> = {}
  for (const [k, v] of Object.entries(answers)) if (v) out[k] = v
  for (const q of questions) {
    if (q.tier !== 'deep' || answers[q.id]?.choice != null) continue
    const assumed = assumptionFor(q, answers)
    if (assumed) out[q.id] = assumed
  }
  return out
}
