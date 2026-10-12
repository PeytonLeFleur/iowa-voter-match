# Iowa Voter Match

A nonpartisan tool that helps Iowa voters compare their views with candidates for Governor.

**Live (development):** https://peytonlefleur.github.io/iowa-voter-match/

## Stack

- [Next.js](https://nextjs.org) App Router + TypeScript, exported as static files (`output: 'export'`)
- Tailwind CSS, Zod, custom SVG/HTML charts
- Vitest (unit, acceptance tests A–J) and Playwright + axe (end-to-end, accessibility)
- Research data as validated JSON in `data/`; assessment answers in the browser's localStorage only

No server, database, or API is needed to view the site.

## Development

```bash
npm install
npm run dev          # http://localhost:3000/
npm run check        # validate data, typecheck, lint, unit tests
npm run build        # static site in out/
npm start            # serve out/ (set BASE_PATH=/iowa-voter-match to mirror Pages)
npm run test:e2e     # Playwright against the built site
```

Requires Node 24 (see `.nvmrc`).

## Research data

```
research/raw/                 research documents exactly as received (quote provenance)
scripts/import-research.ts    raw research → data/issues.json, issue-evidence.json, categories, legislation
scripts/curated/build-curated.py  editorial layer → questions, statements, positions, sources, candidates
scripts/validate.ts           schema + integrity rules; CI fails on any error
src/data/schema.ts            Zod schemas (single source of truth); db/ will mirror them for Postgres
```

Integrity rules enforced on every build include: every quotation appears verbatim in `research/raw/`;
unknown values are `null`, never `false`/`0`; "No documented position" can't carry a stance; option
relations require verified explicit/proposal/action evidence and cite statements; conflicting
evidence keeps at least two dated statements; every candidate × question has an explicit record.

Questions, options, and position-to-option mappings are editorial drafts (`reviewStatus: "draft"`)
until reviewed on `/internal/audit`.

## Project structure

```
src/app/                 routes (/, /assessment, /results, /results/report, /compare, /issues, /issues/[slug],
                         /candidates, /candidates/[slug], /methodology, /sources, /about, /privacy, /internal/audit)
src/components/          UI (assessment, results, compare, evidence, issues, report, viz)
src/lib/compare.ts       user choice × candidate record → labeled relation (never a number)
src/lib/analytics/       the 20 descriptive analytics; every percentage carries numerator/denominator
src/lib/assessment/      localStorage store and candidate column order
tests/unit, tests/e2e    Vitest and Playwright suites
deploy/                  example production server config
```

## Deployment

### GitHub Pages (current)

Every push to `main` runs `.github/workflows/deploy.yml`: validate data, typecheck, lint, unit
tests, build with `BASE_PATH=/iowa-voter-match`, end-to-end tests, then publish `out/` to Pages.
Every route is pre-rendered (`trailingSlash: true`), so deep links and refreshes return HTTP 200.

### Moving to a production server / custom domain

The app is the same build either way; only the base path changes.

1. Build for the domain root: `npm run build` (leave `BASE_PATH` unset),
   or for a subpath: `BASE_PATH=/voter npm run build`.
2. Copy `out/` to the server's web root.
3. Serve directories' `index.html` and `404.html` for misses — see `deploy/nginx.conf`.

To serve a custom domain from GitHub Pages instead, add the domain in repo
Settings → Pages and remove the `BASE_PATH` env from the workflow.

### Adding a backend later

Pages read research data only through `src/data/load.ts` (build time) and `src/lib/client-data.ts`.
To move research data to PostgreSQL, implement those against the database (schemas in
`src/data/schema.ts`), remove `output: 'export'` from `next.config.ts`, and run `next start`.
`deploy/nginx.conf` shows where an `/api/` proxy goes.

## License

[MIT](LICENSE)
