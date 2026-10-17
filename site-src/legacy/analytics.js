import { inject } from '@vercel/analytics';

// The deployed React app is already compiled, so initialize Web Analytics
// from this small entry point instead of adding a second React root.
const hostname = window.location.hostname;
if (
  hostname === 'www.pritamnathdipta.online' ||
  hostname === 'pritamnathdipta.online' ||
  hostname.endsWith('.vercel.app')
) {
  inject({ mode: 'production' });
}
