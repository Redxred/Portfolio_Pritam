import assert from 'node:assert/strict';
import http from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { securityHeaders } from '../legacy/security-policy.mjs';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4173';
const artifacts = fileURLToPath(new URL('../../qa-chrome-audit/', import.meta.url));
await mkdir(artifacts, { recursive: true });
const results = [];
const request = (path, method = 'GET', headers = {}) => new Promise((resolve, reject) => {
  const target = new URL(origin);
  const req = http.request({ hostname: target.hostname, port: target.port, path, method, headers }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject); req.end();
});
async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); }
}
for (const path of ['/', '/cv.html', '/cv.css', '/cv.js', '/blog.html', '/blog.css', '/blog.js', '/connect-linkedin.html', '/connect-linkedin.js', '/hero-beams.js', '/seo-fallback.css', '/robots.txt', '/sitemap.xml', '/assets/index-motion.js', '/assets/hero-flow.js', '/assets/hero-flow-mobile.js', '/site-fixes.js', '/welcome-chat.js', '/welcome-chat.css', '/assets/index-local.css', '/fonts/fonts.css', '/fonts/inter-latin.woff2']) {
  await check(`GET ${path}`, async () => {
    const response = await request(path); assert.equal(response.status, 200);
    for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers[name.toLowerCase()], value);
    if (path.endsWith('.js')) assert.match(response.headers['content-type'], /javascript/);
  });
}
await check('Homepage keeps readable HTML without JavaScript', async () => {
  const html = (await request('/')).body.toString();
  assert.match(html, /<h1>Pritam Nath Dipta<\/h1>/);
  assert.match(html, /document\.documentElement\.classList\.add\('js'\)/);
  assert.match(html, /<script type="application\/ld\+json">/);
});
await check('Blog posts are rendered in HTML with verified LinkedIn links', async () => {
  const html = (await request('/blog.html')).body.toString();
  assert.equal((html.match(/class="blog-card"/g) || []).length, 4);
  assert.match(html, /linkedin\.com\/posts\/pritam-nath-dipta_/);
  assert.match(html, /linkedin\.com\/pulse\/social-engineering/);
  assert.doesNotMatch(html, /BLOG_POSTS|BLOG_COUNT/);
});
await check('LinkedIn connection page is private setup content', async () => {
  const html = (await request('/connect-linkedin.html')).body.toString();
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /Private connection key/);
  assert.doesNotMatch(html, /LINKEDIN_CLIENT_SECRET|LINKEDIN_CONNECT_KEY/);
});
for (const path of ['/.env', '/.git/config', '/.htaccess', '/site-src/package.json', '/node_modules/', '/qa-chrome-audit/', '/assets/', '/backup.sql', '/server.php', '/assets/app.js.map', '/%2e%2e/site-src/package.json', '/assets/%2e%2e/%2e%2e/site-src/package.json', '/assets%5c..%5cpackage.json']) {
  await check(`Block ${path}`, async () => { assert.equal((await request(path)).status, 403); });
}
for (const path of ['/missing-page', '/assets/missing.js', '/.well-known/acme-challenge/qa-nonexistent-token']) {
  await check(`Real 404 ${path}`, async () => { const r = await request(path); assert.equal(r.status, 404); assert.match(r.body.toString(), /Page not found/); });
}
for (const method of ['POST', 'PUT', 'DELETE', 'TRACE', 'PATCH']) {
  await check(`Reject ${method}`, async () => { const r = await request('/', method); assert.equal(r.status, 405); assert.equal(r.headers.allow, 'GET, HEAD, OPTIONS'); });
}
await check('HEAD has no body', async () => { const r = await request('/', 'HEAD'); assert.equal(r.status, 200); assert.equal(r.body.length, 0); assert.ok(Number(r.headers['content-length']) > 0); });
await check('OPTIONS advertises supported methods', async () => { const r = await request('/', 'OPTIONS'); assert.equal(r.status, 204); assert.equal(r.headers.allow, 'GET, HEAD, OPTIONS'); });
await check('CV view and download serve the same PDF', async () => {
  const view = await request('/Pritam_Nath_Dipta_CV.pdf');
  const download = await request('/download/Pritam_Nath_Dipta_CV.pdf');
  assert.equal(view.status, 200);
  assert.equal(download.status, 200);
  assert.equal(view.headers['content-type'], 'application/pdf');
  assert.equal(download.headers['content-type'], 'application/pdf');
  assert.match(download.headers['content-disposition'], /^attachment; filename="Pritam_Nath_Dipta_CV\.pdf"$/);
  assert.doesNotMatch(view.headers['content-disposition'] || '', /attachment/i);
  assert.equal(download.body.subarray(0, 5).toString(), '%PDF-');
  assert.match(download.body.subarray(-128).toString(), /%%EOF/);
  assert.deepEqual(view.body, download.body);
});
await check('Query input is not reflected into HTML', async () => { const value = '<svg onload=alert(1)>'; const r = await request(`/?q=${encodeURIComponent(value)}`); assert.equal(r.status, 200); assert.ok(!r.body.toString().includes(value)); });
await check('No permissive cross-origin access', async () => { const r = await request('/', 'GET', { Origin: 'https://untrusted.invalid' }); assert.equal(r.headers['access-control-allow-origin'], undefined); });
await check('No sensitive data in response headers', async () => { const r = await request('/'); assert.equal(r.headers['x-powered-by'], undefined); assert.equal(r.headers['set-cookie'], undefined); });
await check('Conditional resource caching', async () => { const r = await request('/assets/hero-flow.js'); assert.equal((await request('/assets/hero-flow.js', 'GET', { 'If-Modified-Since': r.headers['last-modified'] })).status, 304); });
await writeFile(`${artifacts}/http-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed) }, null, 2));
if (results.some(r => !r.passed)) process.exitCode = 1;
