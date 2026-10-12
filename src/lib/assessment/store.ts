'use client'
// The user's assessment, persisted only in this browser's localStorage.
// Stores the original answers (importance level and option ID), never derived
// values, so analytics can be recomputed and research updates never alter answers.
import { useCallback, useSyncExternalStore } from 'react'
import { z } from 'zod'

export const STORAGE_KEY = 'ivm:assessment:v1'

const Answer = z.object({
  importance: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
  /** option ID, "unsure", "skipped", or null (not reached yet). */
  choice: z.string().nullable(),
  updatedAt: z.string(),
})

const State = z.object({
  version: z.literal(1),
  answers: z.record(z.string(), Answer),
  completedAt: z.string().nullable(),
  /** Candidate column order for this visitor, randomized once. */
  candidateOrder: z.array(z.string()).nullable(),
})

export type Answer = z.infer<typeof Answer>
export type AssessmentState = z.infer<typeof State>

export const EMPTY_STATE: AssessmentState = { version: 1, answers: {}, completedAt: null, candidateOrder: null }

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedState: AssessmentState = EMPTY_STATE
let corrupt = false

function read(): AssessmentState {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return cachedState // storage blocked: keep in-memory state for this visit
  }
  if (raw === cachedRaw) return cachedState
  cachedRaw = raw
  if (raw === null) {
    cachedState = EMPTY_STATE
    return cachedState
  }
  try {
    const parsed = State.safeParse(JSON.parse(raw))
    cachedState = parsed.success ? parsed.data : EMPTY_STATE
    corrupt = !parsed.success
  } catch {
    cachedState = EMPTY_STATE
    corrupt = true
  }
  return cachedState
}

function write(next: AssessmentState) {
  cachedState = next
  const raw = JSON.stringify(next)
  cachedRaw = raw
  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    // Private mode or quota: answers still work for this visit.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const now = () => new Date().toISOString()

export function useAssessment() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_STATE)
  // False on the server and during hydration; true once saved answers are read.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)

  const update = useCallback((qid: string, patch: Partial<Omit<Answer, 'updatedAt'>>) => {
    const cur = read()
    const prev = cur.answers[qid] ?? { importance: null, choice: null, updatedAt: now() }
    write({ ...cur, answers: { ...cur.answers, [qid]: { ...prev, ...patch, updatedAt: now() } } })
  }, [])

  return {
    state,
    hydrated,
    wasCorrupt: corrupt,
    setImportance: useCallback((qid: string, importance: Answer['importance']) => update(qid, { importance }), [update]),
    setChoice: useCallback((qid: string, choice: string | null) => update(qid, { choice }), [update]),
    markComplete: useCallback(() => write({ ...read(), completedAt: read().completedAt ?? now() }), []),
    setCandidateOrder: useCallback((order: string[]) => write({ ...read(), candidateOrder: order }), []),
    reset: useCallback(() => {
      try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      cachedRaw = null
      cachedState = EMPTY_STATE
      corrupt = false
      listeners.forEach((l) => l())
    }, []),
  }
}
