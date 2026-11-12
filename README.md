# AccessScan

AccessScan is a free, automated accessibility checker for the **EU Accessibility Act (EAA)** and **WCAG 2.x**. It is a **local-first** tool: `node server.js` serves a self-contained web UI and JSON API bound to `localhost`. A public hosted instance is also maintained — a static frontend on Vercel proxies `/api/*` to a Render-hosted backend.

> **Honest disclaimer:** automated scans detect roughly **30–57%** of WCAG issues (per Deque's research). A clean scan is **not** a compliance guarantee, and EAA enforcement is live in the EU. Use AccessScan as a fast first pass; obtain a manual audit for real assurance.

## Features

- Paste a URL, receive an automated WCAG 2.x A/AA report via headless Chromium and [axe-core](https://github.com/dequelabs/axe-core)
- Optional same-origin crawl — up to 10 pages total (submitted URL + up to 9 linked pages), two pages scanned concurrently, ~3-minute wall-clock cap per scan
- Results re-openable in memory; export as self-contained HTML report, PDF, or JSON
- Scan comparison — diff a finished scan against the most recent finished scan of the same URL (`addedRules`, `fixedRules`, `severityChanges`)
- SSRF protection: private/internal IPs, local hostnames, and redirect hops are blocked before the browser connects
- Rate limiting on scan creation; polling and export endpoints are not limited

## Quickstart (local)

Requirements: Node.js >= 18.

```bash
npm install        # installs deps + downloads Chromium (~170MB first time)
npm start          # serves on http://localhost:3000
```

- `PORT` overrides the port (default `3000`); `HOST` overrides the bind address (default `127.0.0.1`).
- If the browser download was skipped, run `npx playwright install chromium` once.
- Open `http://localhost:3000`, paste a URL, scan. No accounts, no database, no tracking.

## API

All endpoints are JSON unless noted. Polling endpoints return the current scan state.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/scan` | Body `{ "url": "https://…", "crawl": false, "maxPages": 5 }` → `202 { id, status: "running" }`. `429` if a scan is busy or rate-limited, `400` on invalid/private URL or non-numeric `maxPages`. `maxPages` is total pages including the submitted URL, clamped 1–10, default 6. |
| `GET` | `/api/scan/:id` | `{ status, phase, result \| error }` |
| `GET` | `/api/scan/:id/export?format=html\|json\|pdf` | Downloadable report (`409` until the scan finishes) |
| `GET` | `/api/scans/:id/compare` | Diff vs. most recent other finished scan of the same normalized URL (origin+pathname, query/hash ignored): `{ comparable, previousId, addedRules, fixedRules, severityChanges, totalsBefore, totalsAfter }` or `{ comparable: false }` |
| `GET` | `/api/health` | `{ ok, busy, playwright }` |

## Rate limits

Rate limiting applies **only** to `POST /api/scan` (accepted scan creations). Polling (`GET /api/scan/:id`, exports, compare) is deliberately unlimited — one scan legitimately generates many polls.

- Per-IP: **10 accepted scans per 10-minute sliding window** (default)
- Global cap: **60 accepted scans per window** across all IPs
- Excess requests get `429` with a `Retry-After` header
- Tunables via env vars: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (ms), `RATE_LIMIT_GLOBAL_MAX`

In production the server runs with `trust proxy = 2` (two hops: client → Vercel edge → Render load balancer), so `req.ip` resolves to the real client IP and buckets stay per-user. Known caveat: a direct-to-Render attacker could spoof `X-Forwarded-For` to rotate per-IP buckets, but the global cap still bounds total load.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the Express server listens on |
| `HOST` | `127.0.0.1` | Bind address. Render sets `HOST=0.0.0.0`; locally leave the default |
| `PROXY_SECRET` | unset | Shared secret for the Vercel→Render proxy. When set, **every** request must carry a matching `x-proxy-key` header or it gets a bare `403` — the Render URL becomes unusable directly. `GET /api/health` is exempt (Render's health check can't send headers; it only returns `{ok,busy,playwright}`). Must be identical on Vercel and Render |
| `RATE_LIMIT_MAX` | `10` | Accepted scans per IP per window |
| `RATE_LIMIT_WINDOW_MS` | `600000` | Rate-limit window length (ms) |
| `RATE_LIMIT_GLOBAL_MAX` | `60` | Accepted scans globally per window |

`PROXY_SECRET` and the `RATE_LIMIT_*` variables are unset locally, so `node server.js` dev is unaffected.

## Deployment architecture

AccessScan is local-first by design — `node server.js` is meant to run on your own machine. The hosted public instance uses a split architecture because Playwright scans cannot run on Vercel serverless:

```
browser ──► Vercel (static frontend, deploy root = public/)
              public/vercel.json rewrites /api/* → serverless function
              public/api/index.js ── fetch + x-proxy-key: PROXY_SECRET ──►
Render (accessscan-9gcz.onrender.com, node server.js, HOST=0.0.0.0)
              gated: all requests except GET /api/health require x-proxy-key
```

- **Frontend:** the contents of `public/` are deployed to Vercel as a static site (Vercel project Root Directory is `public`). `public/vercel.json` contains only static config and a rewrite routing all `/api/*` paths to the serverless function — Vercel rewrites cannot add headers, which is why the proxy is a function.
- **Proxy:** `public/api/index.js` is a dependency-free Node serverless function that forwards `/api/*` to `https://accessscan-9gcz.onrender.com`, preserving method, query string, and headers while stripping hop-by-hop/compression headers, and injects `x-proxy-key: <PROXY_SECRET>`. It buffers the response body in function memory (fine at current report sizes; `maxDuration` is 60s).
- **Backend:** the Render web service (`render.yaml`) runs `npm install` with `PLAYWRIGHT_BROWSERS_PATH=0` (browsers install into `node_modules` so they persist from build to runtime) then `npm start`. It requires `PROXY_SECRET` to be set via the Render dashboard/API (`sync: false` in `render.yaml` — never commit the value).
- **Deploying the frontend:** run `vercel --prod` from the **repository root**. Do not run it inside `public/` — that fails with "Root Directory public does not exist".

### Self-hosting / LAN deployment

`deploy/` contains optional production assets for running the server directly:

- `render.yaml` — Render blueprint (free Node plan) for the backend described above
- `accessscan.service` — systemd unit
- `Caddyfile` / `nginx.conf` — reverse-proxy configs for HTTPS
- `.env.example` — annotated env-var reference

If you expose `node server.js` beyond localhost, put it behind nginx/Caddy with HTTPS. Scans spawn headless Chromium and the in-app rate limiter is the only thing between the API and resource exhaustion — do not expose the port directly to the open internet without a proxy and the `PROXY_SECRET` gate.

## Tests

Two dependency-free smoke-test scripts live in `test/` (no Playwright, no network):

```bash
node test/smoke.js    # scan-store compare/finished-state assertions
node test/smoke2.js   # axe-map, report rendering, scan-store edge cases, SSRF guard (extracted from server.js source)
```

## Limitations

- **Automated scan only** — misses contrast-in-images, keyboard-flow issues, and many cognitive/ARIA-usage problems. axe "incomplete" rules (needs manual review) are listed separately, not counted as violations.
- **Coverage ceiling** — automated tools detect roughly 30–57% of WCAG issues; a clean result is not a compliance guarantee.
- **Crawl depth** — same-origin links only, max 10 pages total, two concurrent, ~3-minute wall-clock cap; no sitemap or depth-2 crawling.
- **Single scan slot** — one scan runs at a time (single-process design for weak hardware); concurrent requests get `429`.
- **In-memory only** — results and rate-limit state are lost on restart; nothing is persisted or shared between instances.
- **SSRF guard is best-effort** — DNS-rebinding TOCTOU remains theoretical (documented in `server.js`).
- **Hosted instance caveats** — Render free tier sleeps after idle, so the first request after a cold start can take ~50s; cold starts also drop the in-memory scan history and rate-limit counters. Scan results are shared per backend instance — there is no per-user isolation.
- **Vercel function limits** — the proxy buffers responses and has a 60s `maxDuration`; very large PDF exports could time out.

See `prd.md` and `architecture.md` for scope and design decisions.
