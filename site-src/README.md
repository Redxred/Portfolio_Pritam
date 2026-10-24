# Pritam Nath Dipta website

The active website is built from `legacy/`. The supplied compiled app is retained as `legacy/assets/original-site.js` and `legacy/assets/original-site.css`; the maintained homepage, CV, styles, and motion enhancements are alongside it. `../pritamnathdipta.online/` is generated deployment output.

Run `npm run build` to prepare the active homepage, Blog, CV, motion files, and optimized images in both `../pritamnathdipta.online/` and `dist/`. Vercel serves a clean, explicit `dist/`; Apache deployments use the sibling website folder. The build generates `assets/index-motion.js` from the original bundle and applies checked UI patches. The Three.js hero scene in `legacy/hero-flow.js` loads on larger screens; phones load the lightweight canvas scene in `legacy/hero-flow-mobile.js`. Both start after the page is visible and the browser is idle. Run `npm run dev` to preview the active website locally.

## LinkedIn Blog feed

`/blog.html` always has selected, verified posts from `legacy/blog-posts.json`. On Vercel it also displays the latest public posts from the private LinkedIn feed. The private OAuth connection is at `/connect-linkedin.html`; only the owner with the connection key can start it. The callback exchanges the authorization code server-side and stores the token and feed in a **private** Vercel Blob store. A Vercel Cron refreshes the feed daily at 03:00 UTC. The browser sees post excerpts and URLs only, never tokens.

One-time setup in the Vercel production project:

1. In the LinkedIn Developer Portal, register the exact authorized redirect URL `https://www.pritamnathdipta.online/api/linkedin/callback`. The app needs `r_member_social` post-read permission. This integration requests that scope only.
2. Create a **Private** Vercel Blob store in the project's Storage tab and connect it to the production environment. The connection supplies `BLOB_READ_WRITE_TOKEN`.
3. Add production environment variables `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_CONNECT_KEY`, and `CRON_SECRET`. Generate each of the latter two as an independent random value of at least 32 bytes. Keep all secrets in Vercel; do not commit them. If the verified post used to identify the author cannot be read by your app, also set `LINKEDIN_PERSON_URN` to your LinkedIn Person URN. `LINKEDIN_API_VERSION` can override the default `202609` when LinkedIn retires that version.
4. Redeploy after adding environment variables. Visit `/connect-linkedin.html`, enter `LINKEDIN_CONNECT_KEY`, and approve LinkedIn access. The first sync runs immediately. Later daily syncs use the stored token.

This app has post-read access but no programmatic refresh token. LinkedIn access tokens generally expire after 60 days, so the owner must revisit the connection page and reauthorize before expiry. The last successful feed remains visible if a later sync fails. If programmatic refresh is granted later, the code already uses a returned refresh token when available. Apache output contains the Blog and connection page, but the automatic feed requires Vercel Functions and Blob.

`legacy/legacy-motion.js` builds the contact-focused footer and its back-to-top button. `legacy/footer-redesign.css` styles the footer illustration, orbit, and entrance motion. `legacy/security-motion.js` and its stylesheet add decorative circuit grids, scan sweeps, card corners, button highlights, and typography accents without replacing the original layout. Background and footer motion pause offscreen or in hidden tabs, and respect reduced motion. The hero scenes cap their frame rates and skip downloading when reduced motion or data saving is enabled.

`legacy/welcome-chat.js` and `legacy/welcome-chat.css` provide the glass-style welcome message. On desktop it opens five seconds after a visitor loads the homepage; on mobile it starts as a compact contact icon. It offers three quick replies with automatic follow-ups and links to the appropriate site section. After closing it, visitors can use the contact icon to open a menu for the message, WhatsApp, or email. Quick replies are local; they do not send a message to the site owner.

The unused alternate redesign and old asset bundles were removed. The active CV source is `legacy/cv.html`, with `legacy/cv.css` and `legacy/cv.js`.

The checked original-bundle patches in `legacy/patch-original.mjs` fix navigation and inactive controls without rebuilding the UI. `legacy/site-fixes.js` provides form validation, safe email draft preparation, labels, and keyboard behavior. The contact form prepares an email draft; it has no mail delivery backend and does not claim to send a message.

Fonts are served locally from `legacy/fonts/` with their OFL licenses. `legacy/security-policy.mjs` defines the browser policy used by the preview server and generated Apache configuration. The original theme script and the small startup script that hides the crawlable fallback for JavaScript visitors are authorized by SHA-256 hashes; arbitrary inline scripts and eval are not allowed. Inline styles remain necessary for the existing UI animations.

Use `npm run dev` for the hardened loopback preview at `http://127.0.0.1:4173/`. After building and starting the preview, run `npm run qa:http` and `npm run qa:browser`. Browser QA requires Chrome (`CHROME_PATH` overrides its executable path), and writes reports/screenshots to `../qa-chrome-audit/`, outside the deployment folder. `QA_ORIGIN` overrides the preview URL.

Upload only `../pritamnathdipta.online/` when deploying to Apache. Vercel uses `dist/` as its output directory, configured in `vercel.json`; `.htaccess` is excluded from that output because Vercel does not use Apache rules. The generated `.htaccess` requires Apache 2.4 with the appropriate override permissions and modules; its redirects, TLS behavior, HSTS, and headers still need verification on the actual host. The cPanel-managed PHP handler is preserved; no PHP files are used by this static website, and requests to PHP files are denied. Select a supported PHP version in cPanel if PHP is enabled on the account.
