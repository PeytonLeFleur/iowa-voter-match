'use client'
import { useEffect } from 'react'
import type { Candidate } from '@/data/schema'
import { useAssessment } from './store'

/**
 * Candidate column order for this visitor: randomized once, remembered, and
 * swappable. Prevents a fixed left/right position from favoring either candidate.
 */
export function useCandidateOrder(candidates: Candidate[]) {
  const { state, hydrated, setCandidateOrder } = useAssessment()
  const ids = candidates.map((c) => c.id)
  const saved = state.candidateOrder
  const valid = saved && saved.length === ids.length && ids.every((id) => saved.includes(id))

  useEffect(() => {
    if (hydrated && !valid) setCandidateOrder(Math.random() < 0.5 ? ids : [...ids].reverse())
  }, [hydrated, valid]) // eslint-disable-line react-hooks/exhaustive-deps

  const order = valid ? saved : [...ids].sort() // deterministic until randomized
  const ordered = order.map((id) => candidates.find((c) => c.id === id)!)
  return { ordered, swap: () => setCandidateOrder([...order].reverse()) }
}
