# Iowa Voter Match

A nonpartisan tool that helps Iowa voters compare their views with candidates for Governor.

**Live (development):** https://peytonlefleur.github.io/iowa-voter-match/

## Stack

- [Vite](https://vite.dev) + React + TypeScript, built to plain static files
- React Router (client-side routing)
- Candidate/issue data as static JSON in `public/data/`

No server, database, or API is needed to view the site.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # outputs dist/
npm run preview    # serve the production build locally
```

Requires Node 24 (see `.nvmrc`).

## Project structure

```
public/data/        static JSON data (candidates, issues, etc.)
src/components/     shared UI (layout, nav)
src/pages/          route-level pages
src/lib/data.ts     data access layer — the only place that knows where data lives
deploy/             example production server config
.github/workflows/  GitHub Pages CI/CD
```

## Deployment

### GitHub Pages (current)

Every push to `main` runs `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/iowa-voter-match/` and publishes `dist/` to GitHub Pages.
`404.html` is a copy of `index.html` so deep links and page refreshes work.

### Moving to a production server / custom domain

The app is the same build either way; only the base path changes.

1. Build for the domain root: `BASE_PATH=/ npm run build`
   (or a subpath: `BASE_PATH=/voter/ npm run build`).
2. Copy `dist/` to the server's web root.
3. Configure the server to fall back to `index.html` for unknown paths —
   see `deploy/nginx.conf`.

To serve a custom domain from GitHub Pages instead, add the domain in repo
Settings → Pages and change `BASE_PATH` in the workflow to `/`.

### Adding a backend later

Components never fetch directly; they call functions in `src/lib/data.ts`.
Set `VITE_DATA_URL` at build time to point at an API, or reimplement those
functions against it. `deploy/nginx.conf` shows where an `/api/` proxy goes.

## License

[MIT](LICENSE)
