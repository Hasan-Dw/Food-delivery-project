/**
 * Static server for the design reference package.
 *
 * The reference mockups use absolute `/public/assets/...` and `/public/fonts/...`
 * paths, so the repository root must be the web root. This script exists purely
 * for design review and is never imported by the app.
 *
 * Usage: npm run design:serve  →  http://127.0.0.1:4318/docs/design-references/_src/cart.html
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT ?? 4318);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? HOST}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/') pathname = '/docs/design-references/_src/restaurants.html';

    const candidate = resolve(join(ROOT, normalize(pathname)));

    // Never serve outside the repository.
    if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    if (!existsSync(candidate) || !statSync(candidate).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Not found: ${pathname}`);
      return;
    }

    const type = MIME[extname(candidate).toLowerCase()] ?? 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(candidate).pipe(response);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Savora design references: http://${HOST}:${PORT}/docs/design-references/_src/restaurants.html`);
  console.log(`Reference images:          http://${HOST}:${PORT}/docs/design-references/my-pages/01-home.png`);
});
