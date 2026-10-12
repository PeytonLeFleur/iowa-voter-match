import type { Issue } from '@/data/schema'

/** Display name for an issue; IDs the research names only by number say so plainly. */
export const issueName = (i: Pick<Issue, 'id' | 'title' | 'groupTitle'>) =>
  i.title ?? (i.groupTitle ? `${i.groupTitle} (${i.id})` : `Issue ${i.id}`)

export const issueTitlePending = (i: Pick<Issue, 'title' | 'groupTitle'>) => !i.title && !i.groupTitle
