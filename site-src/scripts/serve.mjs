import { createServer } from 'node:http';
import { stat, readFile, realpath } from 'node:fs/promises';
import { extname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityHeaders } from '../legacy/security-policy.mjs';

const root = fileURLToPath(new URL('../../pritamnathdipta.online/', import.meta.url));
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.woff2': 'font/woff2' };
const forbidden = /(?:~$|\.(?:bak|old|orig|log|ini|env|map|sqlite|db|sql|ya?ml|toml|conf|key|pem|p12|pfx|php[0-9]*|phtml|cgi|pl|sh)$|(?:^|\/)(?:package(?:-lock)?\.json|composer\.(?:json|lock)|AGENTS\.md)$)/i;
const outsideRoot = path => { const part = relative(root, path); return part === '..' || part.startsWith(`..${sep}`) || resolve(path) === resolve(root, '..'); };

const server = createServer(async (req, res) => {
  for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
  const finish = (status, text) => {
    const body = Buffer.from(text);
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    finish(405, 'Method not allowed');
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, HEAD, OPTIONS' });
    res.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0]); }
  catch { finish(400, 'Invalid URL encoding'); return; }
  if (!pathname.startsWith('/') || /[\\\u0000]/.test(pathname) || pathname.split('/').includes('..')) {
    finish(403, 'Forbidden'); return;
  }
  const acme = /^\/\.well-known\/acme-challenge\/[A-Za-z0-9_-]+$/.test(pathname);
  if ((!acme && /(^|\/)\./.test(pathname)) || /^\/(node_modules|site-src|qa-chrome[^/]*)(\/|$)/i.test(pathname) || forbidden.test(pathname)) {
    finish(403, 'Forbidden'); return;
  }
  let path = resolve(root, `.${pathname}`);
  if (outsideRoot(path)) { finish(403, 'Forbidden'); return; }
  if (pathname === '/') path = resolve(root, 'index.html');
  try {
    path = await realpath(path);
    if (outsideRoot(path)) { finish(403, 'Forbidden'); return; }
    const info = await stat(path);
    if (info.isDirectory()) { finish(403, 'Directory listing is disabled'); return; }
    const modified = info.mtime.toUTCString();
    res.setHeader('Last-Modified', modified);
    res.setHeader('Cache-Control', ['.html', '.js', '.css'].includes(extname(path)) ? 'no-cache' : 'public, max-age=3600');
    if (req.headers['if-modified-since'] === modified) { res.writeHead(304); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Content-Length': info.size });
    res.end(req.method === 'HEAD' ? undefined : await readFile(path));
  } catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes(error.code)) { finish(500, 'Unable to serve this file'); return; }
    const page = await readFile(resolve(root, '404.html'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': page.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : page);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Portfolio preview: http://127.0.0.1:${port}/`));
