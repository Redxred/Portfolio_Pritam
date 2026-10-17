import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const themeScript = readFileSync(new URL('./theme-init.txt', import.meta.url), 'utf8');
const themeHash = createHash('sha256').update(themeScript).digest('base64');
const startupHash = createHash('sha256').update("document.documentElement.classList.add('js');").digest('base64');
export const contentPolicy = [
  "default-src 'none'",
  `script-src 'self' 'sha256-${themeHash}' 'sha256-${startupHash}'`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = {
  'Content-Security-Policy': contentPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function secureHtml(html) {
  // frame-ancestors is enforced in the HTTP header; browsers ignore it in meta.
  const metaPolicy = contentPolicy.replace("; frame-ancestors 'none'", '');
  return html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '')
    .replace(/(<meta charset="[^"]+"\s*\/?>)/i, `$1\n    <meta http-equiv="Content-Security-Policy" content="${metaPolicy}">`);
}
