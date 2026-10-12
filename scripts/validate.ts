// Validates data/ against the schema and integrity rules. Exits non-zero on any
// error so CI blocks a deploy with broken or unsupported evidence.
//   npm run validate            summary
//   npm run validate -- --all   also list every warning
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { RAW_DATASET } from '../src/data/load'
import { checkIntegrity } from '../src/data/integrity'
import { Dataset } from '../src/data/schema'

function readRawResearch(): string | null {
  const dir = join(process.cwd(), 'research', 'raw')
  const files = readdirSync(dir).filter((f) => /\.(md|txt)$/i.test(f))
  return files.length ? files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n\n') : null
}

const parsed = Dataset.safeParse(RAW_DATASET)
if (!parsed.success) {
  console.error('Schema validation failed:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

const ds = parsed.data
const { errors, warnings } = checkIntegrity(ds, readRawResearch())
const showAll = process.argv.includes('--all')

console.log(
  `Dataset ${ds.meta.datasetVersion} (${ds.meta.status}): ${ds.issues.length} issues, ${ds.questions.length} questions, ` +
    `${ds.statements.length} statements, ${ds.positions.length} positions, ${ds.sources.length} sources`,
)

const byRule = new Map<string, number>()
for (const w of warnings) byRule.set(w.rule, (byRule.get(w.rule) ?? 0) + 1)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const [rule, n] of byRule) console.log(`  ${rule}: ${n}`)
  if (showAll) for (const w of warnings) console.log(`  - [${w.rule}] ${w.entity}: ${w.message}`)
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`)
  for (const e of errors) console.error(`  ✗ [${e.rule}] ${e.entity}: ${e.message}`)
  process.exit(1)
}
console.log('\n✓ No integrity errors')
