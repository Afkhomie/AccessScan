# AccessScan

Free, local-first automated accessibility checker for the **EU Accessibility Act (EAA)** and **WCAG 2.x**. Paste a URL, get an honest report — no accounts, no payments, no database, no cloud, no tracking.

> **Honest disclaimer:** automated scans find roughly **30–57%** of WCAG issues (per Deque's research). A clean scan is **not** a compliance guarantee, and EAA enforcement is live in the EU. Use this as a fast first pass; get a manual audit for real assurance.

## Run it

```bash
npm install        # installs deps + downloads Chromium (~170MB first time)
npm start          # serves on http://localhost:3000 (PORT env to change)
```

If the browser download was skipped, run `npx playwright install chromium` once.

## How it works

Vanilla HTML/CSS/JS frontend + tiny Express API. Scans run headless Chromium through [axe-core](https://github.com/dequelabs/axe-core) filtered to WCAG 2.x A/AA rules. Optionally crawls same-origin links — up to 10 pages total, two at a time, with a ~3-minute wall-clock cap per scan. One scan at a time; results live in memory only — recent scans can be re-opened and exported as a self-contained HTML report, PDF, or JSON until the server restarts.

## API

- `POST /api/scan` `{ "url": "https://…", "crawl": false, "maxPages": 5 }` → `202 { id }` (429 if busy or rate-limited, 400 on bad/private URL or non-numeric `maxPages`; `maxPages` is total pages incl. the submitted URL, clamped 1–10, default 6)
- `GET /api/scan/:id` → `{ status, phase, result | error }`
- `GET /api/scan/:id/export?format=html|json|pdf` → downloadable report (409 until scan finishes)
- `GET /api/scans` → recent scans kept in memory (newest first)
- `GET /api/scans/:id/compare` → diff vs. most recent other finished scan of the same normalized URL (origin+pathname, query/hash ignored): `{ comparable, previousId, addedRules, fixedRules, severityChanges, totalsBefore, totalsAfter }` or `{ comparable: false }`
- `GET /api/health` → `{ ok, busy }`

## Deploying

AccessScan is local-first — `node server.js` binds to `127.0.0.1:3000` and is meant to run on your own machine. If you do expose it (e.g. on a LAN or behind a domain), put it behind nginx/Caddy with HTTPS and keep it off the open internet: scans spawn headless Chromium and the rate limiter is the only thing between the API and resource exhaustion.

**Hosted deployment:** the public frontend is served as a static site from `public/` on Vercel (**https://accessscan-theta.vercel.app**), and the scan API runs on Render (**https://accessscan-9gcz.onrender.com**). `public/api/index.js` is a serverless proxy that forwards `/api/*` to the Render backend (a `vercel.json` rewrite routes all `/api/*` paths to it — Vercel rewrites can't add headers, and catch-all function routes only match one segment outside Next.js). The proxy adds an `x-proxy-key` header; when `PROXY_SECRET` is set on Render, **every** request without it gets a bare 403 — the Render URL is unusable directly. `PROXY_SECRET` must be set identically as a Vercel env var (production) and a Render env var; it's unset locally so `node server.js` dev is unaffected. `/api/health` is exempt (Render's own health check can't send the header; it only returns `{ok,busy,playwright}`). Playwright scans can't run on Vercel serverless, which is why the API stays on Render. Deploys: `vercel --prod` from `public/` (project root directory is set to `public` — do not deploy the repo root, the Express server would be picked up as a service). Render cold starts (~50s) apply to the first request after idle.

- **Rate limiting:** `POST /api/scan` is limited to **10 accepted scan requests per IP per 10 minutes**, plus a global cap of 60 per window. Polling (`GET /api/scan/:id`, `/api/scans`, exports) is *not* limited — one scan legitimately generates many polls. Tune via env: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_GLOBAL_MAX`.
- **Behind a proxy:** the limiter keys on `req.ip`. Express doesn't trust `X-Forwarded-For` unless you set `app.set('trust proxy', …)` — either add that in `server.js` (e.g. `app.set('trust proxy', 'loopback')` when nginx is on the same host) or have the proxy overwrite the header. Without it, all proxied clients share one bucket; the global cap still protects the server.
- SEO/social tags point at the GitHub repo as the canonical public face; `public/robots.txt` and `public/sitemap.xml` are included — update both with your real domain if you deploy publicly.

## Limitations

- Automated scan only — misses contrast-in-images, keyboard-flow, and many cognitive/ARIA-usage issues. axe "incomplete" rules (needs manual review) are listed separately, not counted as violations.
- Single page (+ up to 9 linked pages if crawl enabled, max 10 total); no sitemap or depth-2 crawling.
- SSRF protection is best-effort (DNS-rebinding TOCTOU remains theoretical).
- Local-first MVP: results aren't persisted; restart = clean slate (recent scans list is memory-only too).

See `prd.md` and `architecture.md` for scope and design decisions.
