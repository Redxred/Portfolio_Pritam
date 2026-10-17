# Website QA and security review

Date: 17 October 2026, Asia/Dhaka. Target: the current static portfolio in `pritamnathdipta.online/`, its CV page and PDF, and the maintained local preview at `http://127.0.0.1:4173/`.

## Scope and result

The local application was reviewed and tested, and confirmed defects were repaired while retaining the existing page layout and sections. Testing covered browser interactions, light/dark themes, responsive layouts, keyboard access, automated accessibility, static code review, dependency scanning, input handling, local HTTP controls, and non-destructive injection/path probes. Security categories were informed by the [OWASP Web Security Testing Guide](https://owasp.org/projects/web-security-testing-guide).

**This is not a completed production infrastructure VAPT.** Both `pritamnathdipta.online` and `www.pritamnathdipta.online` failed DNS resolution from this environment, and the public website could not be opened through the independent web tool either. Production DNS, TLS certificates/protocols, Apache behavior, actual HTTP redirects and headers, hosting account configuration, and network services remain unverified. Apache is not installed in this workspace; its configuration was reviewed against official documentation, while the shared security policy and equivalent HTTP protections were exercised on the Node preview server.

## Fixes applied

| ID | Area | Finding and correction |
| --- | --- | --- |
| QA-01 | Contact form | The original form displayed “Message sent” and erased input without any delivery request. It now validates input and prepares an explicitly labeled email draft. Users send it from their own email app; no delivery is claimed. Editing input invalidates the previous draft. |
| QA-02 | Input handling | Added field names, associated labels, autocomplete, length limits, whitespace checks, fixed recipient/scheme, and encoded subject/body. Draft input is inserted as text, never HTML. No form data is submitted to the website. |
| QA-03 | Navigation | Section tracking used offsets relative to different wrappers and assumed navigation order matched document order. It now selects the nearest actual section position. Navigating to a section makes its reveal wrapper stable before scrolling, and headings clear the fixed header. The hero work action reaches Projects. |
| QA-04 | Inactive actions | Project repository controls and “View All” controls now have real destinations. Project details and papers without public URLs create relevant contact requests instead of opening empty links. The unconfigured Twitter controls are visibly disabled rather than linking to `#`; no account was invented. |
| QA-05 | Keyboard and controls | Added a skip link, icon/dot button names, menu state and labels, Escape-to-close behavior, and form label associations. Hidden header controls are inert. Removed nested link/button markup from WhatsApp. |
| QA-06 | Contrast | Corrected eight dark-mode contrast failures, including purple text and the WhatsApp action, and 21 CV contrast failures. Existing light-mode improvements remain in place. Automated audits now report zero violations for the selected WCAG tags. Gradients were additionally inspected visually; automated color analysis still marks some gradient cases for manual review. |
| QA-07 | Motion | Reduced motion stops the typewriter and letter motion, skips the hero animation download, and uses immediate navigation. Review autoplay respects reduced motion and hidden tabs. The hero uses a bounded Canvas 2D light-ribbon animation that pauses when offscreen. |
| SEC-01 | Browser policy | Added a restrictive CSP with self-hosted scripts, a SHA-256 allowance for the original theme initialization script, no arbitrary inline scripts or eval, no objects, no base URL overrides, no native form submissions, and no framing. An injected inline script was blocked in the browser. Inline styles remain allowed because the existing UI uses dynamic React styles. |
| SEC-02 | HTTP hardening | Added `nosniff`, frame denial, referrer restrictions, permissions restrictions, and opener isolation to the preview and Apache template. Apache additionally configures HTTPS-only HSTS and a fixed canonical HTTPS redirect. Production enforcement needs verification on the host. |
| SEC-03 | File and method exposure | Added directory-listing protection, private/dotfile/source/backup/script restrictions, allowed-method checks, and real missing-resource 404 responses. Traversal, encoded traversal, forbidden methods, and protected-path probes were rejected by the local preview. |
| SEC-04 | External dependencies | Self-hosted the existing font families with their OFL licenses. Runtime font requests no longer require third-party domains, allowing tighter style/font policy and avoiding remote font outages. |
| QA-08 | CV and metadata | Verified the CV layout and printable two-page output, synchronized the PDF used for downloads, restored canonical/social metadata, and provided a branded missing-page response. |
| QA-09 | Welcome message | Added a glass-style welcome card that opens after five seconds, accepts predefined quick replies, and shows local automatic follow-ups. Closing it reveals a compact contact icon with a menu for the message, WhatsApp, and email. The card identifies itself as automated and does not imply message delivery. |
| QA-10 | Footer navigation | Kept one back-to-top button inside the footer and removed the original floating arrow. The footer button scrolls smoothly to the start, with an immediate jump for visitors who prefer reduced motion. |

The hosting header implementation follows the official [Apache mod_headers documentation](https://httpd.apache.org/docs/2.4/mod/mod_headers.html). CSP choices were checked against the [browser CSP reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

## Evidence and tests

Final result: **40 HTTP/security checks and 42 browser checks passed (82 total), with zero failed checks**. The individual results are recorded in `qa-chrome-audit/http-results.json` and `qa-chrome-audit/browser-results.json`. Build and syntax checks also passed.

| Check | Coverage/result |
| --- | --- |
| Browser QA | Original sections, work action, section tracking, contact requests, safe draft creation, welcome card timing and quick reply, footer back-to-top navigation, inactive social handling, review filters/navigation, theme switching, mobile menu, reduced motion, CSP, CV print output, and runtime errors. |
| Responsive QA | Chrome viewport emulation at 320, 390, 768, 1024, and 1440 pixels. No document horizontal overflow in those checks; the PRITAM footer name fits. This is not a substitute for testing physical devices or other browser engines. |
| Accessibility | axe-core audits using WCAG 2 A, WCAG 2 AA, and WCAG 2.1 AA tags: zero reported violations on light mode, dark mode, and CV. Keyboard controls and focus behavior were also exercised. This is not an accessibility certification or a complete screen-reader audit. |
| HTTP/security | Successful resources and headers; denied dotfiles, source directories, backups, PHP files, and maps; disabled directory listing; encoded traversal; unsupported POST/PUT/DELETE/TRACE/PATCH; HEAD/OPTIONS behavior; real 404s; conditional caching; no permissive CORS; no query reflection. |
| Injection | SVG/HTML-like input stayed inert in fields and an encoded email body. Query/hash payloads did not create executable DOM nodes. A deliberately inserted inline script was blocked by CSP. No real message was sent during testing. |
| Dependencies | `npm audit`: zero reported vulnerabilities in the installed source dependencies. RetireJS 6.1.0 reported no matching vulnerable components in the deployed asset scan. Signature scanning of minified bundles has limited identification coverage; the original compiled vendor bundle has no complete package manifest/SBOM. |
| Secrets review | No matches for the private-key and common live API-token patterns used in the reviewed source/public files. Pattern scans do not prove the absence of every possible secret. |
| PDF | Download returns PDF MIME/signature/EOF; current CV prints to two pages. No JavaScript, Launch, OpenAction, or EmbeddedFiles markers were found in the generated PDF bytes; this was not a separate PDF exploit assessment. |
| Console | No application JavaScript exceptions or unexpected console errors in the final browser run. The deliberate injection test produced the expected CSP rejection messages. |

Artifacts are outside the deployment folder in `qa-chrome-audit/`: test JSON, accessibility JSON, console/request evidence, screenshots, the validated CV PDF, and the RetireJS output. Test traffic used ordinary local requests and benign payload markers; no destructive, brute-force, or denial-of-service testing was performed.

## Remaining production and content checks

1. Restore/confirm DNS for the public hostname, deploy the prepared files, and verify HTTPS, certificate validity, redirects, headers on success/error responses, and the `.htaccess` rules against the actual host. The Node preview passing does not prove Apache/cPanel deployment behavior.
2. The preserved cPanel-generated handler refers to `ea-php81`. PHP 8.1 reached end of life on 31 December 2025 according to [PHP’s unsupported branches list](https://www.php.net/eol.php). This website has no PHP endpoints and now denies PHP file requests, but the hosting account should use a supported runtime if PHP is enabled. The actual server runtime was not observable.
3. There is no mail delivery service configured. The repaired form prepares a draft rather than claiming delivery. Server-side mail delivery would require a separately configured endpoint/service and its own abuse controls and testing.
4. Twitter has no supplied profile URL, and three papers lack public URLs. These now have honest disabled/request behavior. Existing project/publication/testimonial claims and contact identities were retained; their factual accuracy was not established by a security test. Homepage contact details differ from the CV contact details and need the owner’s choice before standardization.
5. External checks reached GitHub with 200 and IEEE with 202; LinkedIn rejected an automated HEAD request with 405, which does not establish that the profile is broken. The hacknfix.site check failed during TLS negotiation from this environment. Its hosting/TLS should be checked independently; its URL was retained because that failure alone does not prove a permanent outage.

There are no login, session, database, upload, payment, or server-side application endpoints in the reviewed project. Authentication bypass, SQL injection, session/cookie security, upload exploitation, and state-changing CSRF tests therefore have no application target here. This does not assess other applications or services on the hosting account.

## Reproduce locally

From `site-src/`, run `npm install` and `npm run build`, then keep `npm run dev` running. In another terminal run `npm run qa:http`, `npm run qa:browser`, and `npm audit`. Browser QA requires the installed Chrome executable; set `CHROME_PATH` if needed. `QA_ORIGIN` can select another test origin. Upload only `pritamnathdipta.online/`, including its generated `.htaccess`; do not upload the source, reports, browser profiles, or QA artifacts.
