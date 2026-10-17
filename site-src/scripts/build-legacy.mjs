import { access, copyFile, cp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';
import { build, transformWithEsbuild } from 'vite';
import { applyQaFixes } from '../legacy/patch-original.mjs';
import { contentPolicy, secureHtml } from '../legacy/security-policy.mjs';

const source = fileURLToPath(new URL('../legacy/', import.meta.url));
const destination = fileURLToPath(new URL('../../pritamnathdipta.online/', import.meta.url));

for (const file of ['original-site.js', 'original-site.css']) await access(join(source, 'assets', file));

// Keep the original bundle untouched. The new hero owns its decorative canvas.
// All foreground content and the original asset remain unchanged.
let original = await readFile(join(source, 'assets/original-site.js'), 'utf8');
const backgroundStart = original.indexOf('fk=()=>{');
const backgroundEnd = original.indexOf(',pk=Ah(', backgroundStart);
if (backgroundStart < 0 || backgroundEnd < 0) throw new Error('Original background component was not found.');
const background = 'fk=()=>null';
original = original.slice(0, backgroundStart) + background + original.slice(backgroundEnd);
for (const [before, after] of [
  ['/assets/profile-D_u2psRt.jpg', '/assets/profile-optimized.webp'],
  ['/assets/hero-bg-_CdMadRT.jpg', '/assets/hero-optimized.webp'],
]) {
  if (!original.includes(before)) throw new Error(`Original image URL is missing: ${before}`);
  original = original.replace(before, after);
}
await writeFile(join(destination, 'assets/index-motion.js'), applyQaFixes(original));
const originalCss = await readFile(join(source, 'assets/original-site.css'), 'utf8');
const localCss = originalCss.replace(/@import"https:\/\/fonts\.googleapis\.com\/[^\"]+";/g, '');
if (localCss.includes('fonts.googleapis.com')) throw new Error('A remote font import remains');
await writeFile(join(destination, 'assets/index-local.css'), `@import url("/fonts/fonts.css");\n${localCss}`);
await mkdir(join(destination, 'fonts'), { recursive: true });
for (const file of await readdir(join(source, 'fonts'))) {
  await copyFile(join(source, 'fonts', file), join(destination, 'fonts', file));
}

for (const file of ['profile-optimized.webp', 'hero-optimized.webp']) {
  await copyFile(join(source, 'assets', file), join(destination, 'assets', file));
}
await copyFile(join(source, 'assets/Pritam_Nath_Dipta_CV.pdf'), join(destination, 'Pritam_Nath_Dipta_CV.pdf'));
for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'social-card.png', 'robots.txt', 'sitemap.xml', 'llms.txt', '641baf96f1d35bf3322be08a41073b28.txt']) {
  await copyFile(fileURLToPath(new URL(`../public/${file}`, import.meta.url)), join(destination, file));
}

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: join(destination, 'assets'),
    emptyOutDir: false,
    target: 'es2020',
    minify: 'esbuild',
    lib: { entry: join(source, 'hero-flow.js'), formats: ['es'], fileName: () => 'hero-flow.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

// Vite retains whitespace in ES library builds; the scene is already shaken,
// so minify this final module before serving it as a delayed enhancement.
const scenePath = join(destination, 'assets/hero-flow.js');
const sceneCode = await readFile(scenePath, 'utf8');
const minified = await transformWithEsbuild(sceneCode, 'hero-flow.js', {
  minify: true, target: 'es2020', legalComments: 'eof',
});
await writeFile(scenePath, minified.code);

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: join(destination, 'assets'),
    emptyOutDir: false,
    target: 'es2020',
    minify: 'esbuild',
    lib: { entry: join(source, 'analytics.js'), formats: ['es'], fileName: () => 'analytics.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

for (const file of ['legacy-motion.css', 'legacy-motion.js', 'welcome-chat.css', 'welcome-chat.js', 'site-fixes.js', 'cv-fixes.css', 'cv.css', 'cv.js', 'seo-fallback.css']) {
  await copyFile(join(source, file), join(destination, file));
}
for (const file of ['index.html', '404.html']) {
  await writeFile(join(destination, file), secureHtml(await readFile(join(source, file), 'utf8')));
}
const cvPath = join(destination, 'cv.html');
let cvHtml = secureHtml(await readFile(join(source, 'cv.html'), 'utf8'));
cvHtml = cvHtml.replace(/\s*<link[^>]*href="https:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
if (!cvHtml.includes('/fonts/fonts.css')) cvHtml = cvHtml.replace('</head>', '  <link rel="stylesheet" href="/fonts/fonts.css">\n</head>');
if (!cvHtml.includes('/cv-fixes.css')) cvHtml = cvHtml.replace('</head>', '  <link rel="stylesheet" href="/cv-fixes.css">\n</head>');
if (!cvHtml.includes('/assets/analytics.js')) cvHtml = cvHtml.replace('</head>', '  <script type="module" src="/assets/analytics.js"></script>\n</head>');
await writeFile(cvPath, cvHtml);
const apache = (await readFile(join(source, '.htaccess.template'), 'utf8')).replace('__CSP__', contentPolicy);
await writeFile(join(destination, '.htaccess'), apache);

// Vercel serves a clean, explicit output; Apache deployments use the sibling folder.
const vercelOutput = fileURLToPath(new URL('../dist/', import.meta.url));
if (dirname(resolve(vercelOutput)) !== dirname(resolve(source)) || basename(vercelOutput) !== 'dist') {
  throw new Error('Unexpected Vercel output path');
}
await rm(vercelOutput, { recursive: true, force: true });
await mkdir(join(vercelOutput, 'assets'), { recursive: true });
for (const file of ['index.html', 'cv.html', '404.html', 'cv.css', 'cv.js', 'cv-fixes.css', 'legacy-motion.css', 'legacy-motion.js', 'welcome-chat.css', 'welcome-chat.js', 'site-fixes.js', 'seo-fallback.css', 'Pritam_Nath_Dipta_CV.pdf', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'social-card.png', 'robots.txt', 'sitemap.xml', 'llms.txt', '641baf96f1d35bf3322be08a41073b28.txt']) {
  await copyFile(join(destination, file), join(vercelOutput, file));
}
for (const file of ['index-motion.js', 'index-local.css', 'hero-flow.js', 'analytics.js', 'hero-optimized.webp', 'profile-optimized.webp']) {
  await copyFile(join(destination, 'assets', file), join(vercelOutput, 'assets', file));
}
await cp(join(destination, 'fonts'), join(vercelOutput, 'fonts'), { recursive: true });

console.log('Website ready in ../pritamnathdipta.online/ and ./dist/');
