import type { Metadata } from 'next'
import IssueExplorer from '@/components/issues/IssueExplorer'
import PageIntro from '@/components/PageIntro'
import { getDataset } from '@/data/load'
import { formatDate } from '@/lib/site'

export const metadata: Metadata = { title: 'Issues' }

export default function IssuesPage() {
  const ds = getDataset()
  const untitled = ds.issues.filter((i) => !i.title && !i.groupTitle).length
  return (
    <>
      <PageIntro eyebrow="Issue explorer" title="Iowa’s 107 policy issues">
        Every issue in the research framework, with each candidate’s evidence as classified in the research
        (current as of {formatDate(ds.meta.researchCutoff)}).
      </PageIntro>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        {untitled} issues are referenced in the candidate research only by number; their titles will be added from the issue
        framework document. They are listed so that missing evidence stays visible.
      </p>
      <IssueExplorer issues={ds.issues} categories={ds.categories} evidence={ds.issueEvidence} candidates={ds.candidates}
        legislation={ds.legislation} questions={ds.questions} />
    </>
  )
}
