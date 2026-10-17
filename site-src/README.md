# Pritam Nath Dipta website

The active website is the original compiled site in `../pritamnathdipta.online/`. Its original JavaScript and CSS bundles are retained there. Motion additions are maintained in `legacy/`.

Run `npm run build` to prepare the active homepage, motion files, and optimized images in both `../pritamnathdipta.online/` and `dist/`. Vercel serves `dist/`; Apache deployments use the sibling website folder. The build preserves the original bundle and generates `assets/index-motion.js` with its original content. The hero's animated light ribbons are built from `legacy/hero-flow.js` and load after the page becomes visible and the browser is idle. Run `npm run dev` to preview the active website locally.

`legacy/legacy-motion.js` maintains the animated PRITAM wordmark, footer interactions, and the back-to-top button located inside the footer. The hero canvas limits its frame rate, reduces work on small screens, and pauses when offscreen or in hidden tabs. Reduced motion and data saving preferences skip the animation download.

`legacy/welcome-chat.js` and `legacy/welcome-chat.css` provide the glass-style welcome message. It opens five seconds after a visitor loads the homepage, offers three quick replies with automatic follow-ups, and links to the appropriate site section. After closing it, visitors can use the compact contact icon to open a menu for the message, WhatsApp, or email. Quick replies are local; they do not send a message to the site owner.

The older `index.html`, `src/`, and Vite configuration in this folder belong to the superseded redesign and are not part of the active build.

The checked original-bundle patches in `legacy/patch-original.mjs` fix navigation and inactive controls without rebuilding the UI. `legacy/site-fixes.js` provides form validation, safe email draft preparation, labels, and keyboard behavior. The contact form prepares an email draft; it has no mail delivery backend and does not claim to send a message.

Fonts are served locally from `legacy/fonts/` with their OFL licenses. `legacy/security-policy.mjs` defines the browser policy used by the preview server and generated Apache configuration. The one original theme initialization script is authorized with its SHA-256 hash; arbitrary inline scripts and eval are not allowed. Inline styles remain necessary for the existing UI animations.

Use `npm run dev` for the hardened loopback preview at `http://127.0.0.1:4173/`. After building and starting the preview, run `npm run qa:http` and `npm run qa:browser`. Browser QA requires Chrome (`CHROME_PATH` overrides its executable path), and writes reports/screenshots to `../qa-chrome-audit/`, outside the deployment folder. `QA_ORIGIN` overrides the preview URL.

Upload only `../pritamnathdipta.online/` when deploying to Apache. Vercel uses `dist/` as its output directory, configured in `vercel.json`; `.htaccess` is excluded from that output because Vercel does not use Apache rules. The generated `.htaccess` requires Apache 2.4 with the appropriate override permissions and modules; its redirects, TLS behavior, HSTS, and headers still need verification on the actual host. The cPanel-managed PHP handler is preserved; no PHP files are used by this static website, and requests to PHP files are denied. Select a supported PHP version in cPanel if PHP is enabled on the account.
