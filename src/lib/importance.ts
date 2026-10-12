export type ImportanceValue = 0 | 1 | 2 | 3 | 4

export const IMPORTANCE_LEVELS: readonly { value: ImportanceValue; label: string; description: string }[] = [
  { value: 0, label: 'Doesn’t affect me', description: 'This issue doesn’t affect my vote.' },
  { value: 1, label: 'Slightly important', description: 'I notice it, but it rarely shapes my choices.' },
  { value: 2, label: 'Moderately important', description: 'It is one of several things I weigh.' },
  { value: 3, label: 'Very important', description: 'It weighs heavily in how I decide.' },
  { value: 4, label: 'Extremely passionate', description: 'It is among the issues I care about most.' },
]

export const MAX_IMPORTANCE = 4

/** Selected level as a share of the scale (0–1). Describes the answer, not emotional intensity. */
export const normalizeImportance = (v: ImportanceValue) => v / MAX_IMPORTANCE
