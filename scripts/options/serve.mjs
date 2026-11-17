// Serves dist/ with gzip, like the CDN does, so the slow-3G numbers in capture.mjs are not
// inflated by `vite preview` sending the 190 KB prerendered index.html uncompressed.
//   node scripts/options/serve.mjs [port=4173]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve('dist');
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml']);
const cache = new Map();

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, pathname);
    // Stay inside dist/ and fall back to the page for "/" (query strings pick the option).
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(pathname)) {
        res.writeHead(404).end('Not found');
        return;
      }
      file = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(file);
    const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
    const key = `${file}|${gzip}`;
    if (!cache.has(key)) {
      const raw = fs.readFileSync(file);
      cache.set(key, gzip ? gzipSync(raw, { level: 9 }) : raw);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(cache.get(key));
  })
  .listen(PORT, () => console.log(`dist/ on http://localhost:${PORT} (gzip)`));
