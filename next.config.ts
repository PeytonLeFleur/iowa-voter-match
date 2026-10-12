import type { NextConfig } from 'next'

// Path the site is served under. GitHub Pages project sites live at /<repo>,
// so CI sets BASE_PATH=/iowa-voter-match. A custom domain or production server
// at the root leaves it unset. Nothing else in the app changes.
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '')

const config: NextConfig = {
  // Static export: plain HTML/CSS/JS in out/, hostable anywhere. Remove this
  // line to run as a Node server (e.g. once research data moves to Postgres).
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

export default config
