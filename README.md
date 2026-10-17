# Pritam Nath Dipta portfolio

This repository contains the portfolio website and the source files used to maintain it.

- `pritamnathdipta.online/` contains the ready-to-deploy static website.
- `site-src/` contains the maintained source, build scripts, and local QA tools. See its [README](site-src/README.md) for details.
- `QA_SECURITY_REPORT.md` records the local QA and security review, including checks that still need to be made on the production host.

To rebuild the deployable folder:

```sh
cd site-src
npm ci
npm run build
```

Upload the contents of `pritamnathdipta.online/` to the web host. The `site-src/` directory and QA artifacts are not part of the deployed website.
