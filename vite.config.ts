import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { STATIC_ROUTES } from './src/routes.ts'

// Base path the site is served from. GitHub Pages serves project sites under
// /<repo>/, so CI sets BASE_PATH=/iowa-voter-match/. A custom domain or
// production server at the root uses the default "/". Nothing else changes.
const base = process.env.BASE_PATH ?? '/'

// Static hosts without rewrite rules (GitHub Pages) can't route SPA paths.
// Known routes get their own copy of the app shell (served with HTTP 200);
// 404.html catches everything else so any deep link or refresh still loads.
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'dist')
      const shell = resolve(out, 'index.html')
      copyFileSync(shell, resolve(out, '404.html'))
      for (const route of STATIC_ROUTES) {
        mkdirSync(resolve(out, route), { recursive: true })
        copyFileSync(shell, resolve(out, route, 'index.html'))
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],
})
