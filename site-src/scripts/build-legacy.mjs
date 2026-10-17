import { access, copyFile, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build, transformWithEsbuild } from 'vite';
import { applyQaFixes } from '../legacy/patch-original.mjs';
import { contentPolicy, secureHtml } from '../legacy/security-policy.mjs';

const source = fileURLToPath(new URL('../legacy/', import.meta.url));
const destination = fileURLToPath(new URL('../../pritamnathdipta.online/', import.meta.url));

for (const asset of [
  'assets/index-BHnZK2SX.js',
  'assets/index-KhmYL6oY.css',
  'assets/hero-bg-_CdMadRT.jpg',
  'assets/profile-D_u2psRt.jpg',
]) {
  await access(join(destination, asset));
}

// Keep the original bundle untouched. The new hero owns its decorative canvas.
// All foreground content and the original asset remain unchanged.
let original = await readFile(join(destination, 'assets/index-BHnZK2SX.js'), 'utf8');
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
const originalCss = await readFile(join(destination, 'assets/index-KhmYL6oY.css'), 'utf8');
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

for (const file of ['legacy-motion.css', 'legacy-motion.js', 'welcome-chat.css', 'welcome-chat.js', 'site-fixes.js', 'cv-fixes.css']) {
  await copyFile(join(source, file), join(destination, file));
}
for (const file of ['index.html', '404.html']) {
  await writeFile(join(destination, file), secureHtml(await readFile(join(source, file), 'utf8')));
}
const cvPath = join(destination, 'cv.html');
let cvHtml = secureHtml(await readFile(cvPath, 'utf8'));
cvHtml = cvHtml.replace(/\s*<link[^>]*href="https:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
if (!cvHtml.includes('/fonts/fonts.css')) cvHtml = cvHtml.replace('</head>', '  <link rel="stylesheet" href="/fonts/fonts.css">\n</head>');
if (!cvHtml.includes('/cv-fixes.css')) cvHtml = cvHtml.replace('</head>', '  <link rel="stylesheet" href="/cv-fixes.css">\n</head>');
await writeFile(cvPath, cvHtml);
const apache = (await readFile(join(source, '.htaccess.template'), 'utf8')).replace('__CSP__', contentPolicy);
await writeFile(join(destination, '.htaccess'), apache);

console.log('Original website, animated footer, and flowing hero background are ready in ../pritamnathdipta.online/');
