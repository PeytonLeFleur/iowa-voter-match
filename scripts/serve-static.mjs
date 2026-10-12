// Minimal static server for the exported site, mounted under BASE_PATH exactly
// as GitHub Pages serves it. Used by Playwright and `npm start`. No dependencies.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'out')
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '')
const port = Number(process.env.PORT ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
}

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  if (base && url === base) { res.writeHead(301, { Location: `${base}/` }); return res.end() }
  if (!url.startsWith(`${base}/`)) return send(res, 404, join(root, '404.html'))
  let file = normalize(join(root, url.slice(base.length)))
  if (!file.startsWith(root)) { res.writeHead(400); return res.end() }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: `${url}/` }); return res.end() }
    file = join(file, 'index.html')
  }
  if (existsSync(file)) return send(res, 200, file)
  send(res, 404, join(root, '404.html'))
}).listen(port, () => console.log(`Serving out/ at http://localhost:${port}${base}/`))
