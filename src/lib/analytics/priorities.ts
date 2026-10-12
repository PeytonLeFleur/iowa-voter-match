import type { ImportanceValue } from '@/lib/importance'

export interface RankedItem<T> {
  item: T
  importance: ImportanceValue
  /** Competition ranking: ties share a rank (1, 2, 2, 4). */
  rank: number
}

/**
 * Orders items by the user's stated importance, highest first. Ties keep their
 * original (question) order and share a rank. Items without an importance
 * answer are excluded; candidate evidence plays no part in the ordering.
 */
export function rankByImportance<T>(items: T[], importanceOf: (t: T) => ImportanceValue | null): RankedItem<T>[] {
  const answered = items
    .map((item, i) => ({ item, i, importance: importanceOf(item) }))
    .filter((x): x is { item: T; i: number; importance: ImportanceValue } => x.importance !== null)
    .sort((a, b) => b.importance - a.importance || a.i - b.i)
  let rank = 0
  return answered.map((x, pos) => {
    if (pos === 0 || x.importance !== answered[pos - 1]!.importance) rank = pos + 1
    return { item: x.item, importance: x.importance, rank }
  })
}
