import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Base path the site is served from. GitHub Pages serves project sites under
// /<repo>/, so CI sets BASE_PATH=/iowa-voter-match/. A custom domain or
// production server at the root uses the default "/". Nothing else changes.
const base = process.env.BASE_PATH ?? '/'

// Static hosts without rewrite rules (GitHub Pages) serve 404.html for unknown
// paths. Copying the app shell there lets deep links and refreshes load the SPA,
// which then routes client-side.
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'dist')
      copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],
})
