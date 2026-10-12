// Build-time access to the research dataset. Imported by server components and
// generateStaticParams; parsed once and validated against the schema so a bad
// data file fails the build instead of rendering wrong evidence.
import meta from '@data/meta.json'
import candidates from '@data/candidates.json'
import categories from '@data/categories.json'
import issues from '@data/issues.json'
import issueEvidence from '@data/issue-evidence.json'
import legislation from '@data/legislation.json'
import sources from '@data/sources.json'
import statements from '@data/statements.json'
import positions from '@data/positions.json'
import questions from '@data/questions.json'
import verifications from '@data/verifications.json'
import { Dataset } from './schema'

export const RAW_DATASET = {
  meta, candidates, categories, issues, issueEvidence, legislation, sources, statements, positions, questions, verifications,
}

let cached: Dataset | null = null

export function getDataset(): Dataset {
  cached ??= Dataset.parse(RAW_DATASET)
  return cached
}
