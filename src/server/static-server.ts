import { createReadStream, existsSync, statSync } from 'fs';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { extname, normalize, resolve, sep } from 'path';
import type { LiveReloadHub } from './live-reload';

/**
 * Development server for `yassb watch` and `yassb serve`. Do not use it in production.
 *
 * Routing (same as 1.x):
 * - multi-language sites: `/<lang>/…` → `out/<lang>/…`; other paths → `out/<first lang>/…`, then `out/…`;
 * - folders redirect to a trailing slash and serve their `index.html`;
 * - anything not found → the home page (`index.html` of the first language), with status 200.
 */
export interface StaticServerOptions {
  /** Current output folder and languages (read on every request, so a config change is picked up). */
  site: () => { out: string; langs: Array<string> };
  port: number;
  liveReload?: LiveReloadHub;
}

const MIME_TYPES: { [extension: string]: string } = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.wasm': 'application/wasm',
  '.vcf': 'text/vcard', '.webmanifest': 'application/manifest+json'
};

export function startStaticServer(options: StaticServerOptions): Promise<{ server: Server; port: number }> {
  const server = createServer((request, response) => handle(request, response, options));
  return listen(server, options.port);
}

function listen(server: Server, port: number, attempts: number = 10): Promise<{ server: Server; port: number }> {
  return new Promise((resolvePromise, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      if (error.code === 'EADDRINUSE' && attempts > 1 && port !== 0) {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        resolvePromise(listen(server, port + 1, attempts - 1));
      } else
        reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      const address = server.address();
      resolvePromise({ server, port: typeof address === 'object' && address ? address.port : port });
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

function handle(request: IncomingMessage, response: ServerResponse, options: StaticServerOptions): void {
  const url = new URL(request.url || '/', 'http://localhost');
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    path = url.pathname;
  }

  if (path === '/__yassb/events' && options.liveReload) {
    options.liveReload.connect(response);
    return;
  }
  if (path === '/__yassb/status' && options.liveReload) {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(options.liveReload.status()));
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }

  const { out, langs } = options.site();
  const roots: Array<{ root: string; path: string }> = [];
  const lang = langs.find(candidate => path === `/${candidate}` || path.startsWith(`/${candidate}/`));
  if (lang)
    roots.push({ root: resolve(out, lang), path: path.slice(lang.length + 1) || '/' });
  if (langs.length)
    roots.push({ root: resolve(out, langs[0]), path });
  roots.push({ root: out, path });

  for (const candidate of roots) {
    const outcome = tryServe(candidate.root, candidate.path, url, request, response);
    if (outcome)
      return;
  }

  const fallback = langs.length ? resolve(out, langs[0], 'index.html') : resolve(out, 'index.html');
  if (existsSync(fallback))
    sendFile(fallback, request, response);
  else {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found. Is the site built?');
  }
}

/** Serves `path` from `root` if it exists. Returns true if the request was answered. */
function tryServe(root: string, path: string, url: URL, request: IncomingMessage, response: ServerResponse): boolean {
  const file = normalize(resolve(root, `.${path}`));
  if (file !== root && !file.startsWith(root + sep))
    return false;
  if (!existsSync(file))
    return false;
  const stat = statSync(file);
  if (stat.isDirectory()) {
    if (!url.pathname.endsWith('/')) {
      response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
      response.end();
      return true;
    }
    const index = resolve(file, 'index.html');
    if (!existsSync(index))
      return false;
    sendFile(index, request, response);
    return true;
  }
  sendFile(file, request, response);
  return true;
}

function sendFile(file: string, request: IncomingMessage, response: ServerResponse): void {
  const size = statSync(file).size;
  const type = MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const headers: { [name: string]: string | number } = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(request.headers.range || ''));
  if (range && size > 0) {
    const start = range[1] ? parseInt(range[1], 10) : Math.max(0, size - parseInt(range[2], 10));
    const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
    if (start <= end && start < size) {
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      if (request.method === 'HEAD')
        response.end();
      else
        createReadStream(file, { start, end }).pipe(response);
      return;
    }
  }
  response.writeHead(200, { ...headers, 'Content-Length': size });
  if (request.method === 'HEAD')
    response.end();
  else
    createReadStream(file).pipe(response);
}
