# AccessScan — Architecture (MVP)

## Shape
One Node.js process. No build step, no framework, no DB.

```
Browser (vanilla JS)
   │  POST /api/scan {url, crawl, maxPages}   GET /api/scan/:id (poll)
   ▼
Express server (server.js)
   ├── static files: public/ (index.html, style.css, app.js)
   ├── SSRF validation (URL scheme, hostname blocklist, DNS lookup → private IP check)
   └── Scan queue (in-memory, 1 at a time, 429 if busy)
          │
          ▼
   Playwright Chromium (headless, fresh context per scan)
          │  page.goto (45s timeout) → waitForLoadState networkidle (6s best-effort)
          │  content-size cap (3MB) → AxeBuilder.analyze (wcag2a/aa, 21a/aa, 22aa)
          │  optional: collect same-origin <a href> links (maxPages-1, ≤9)
          │  → scan crawl pages 2 at a time (own tab each), ~3min total deadline
          ▼
   Results kept in-memory via scan-store.js (last ~20 scans), returned as JSON
```

## Modules
- `server.js` — Express routes, SSRF validation, scan orchestration. Thin adapters only.
- `scan-store.js` — in-memory scan Map, keep-last-20 pruning, URL normalization, finished-scan invariant (404/409), rule-level compare diff. Pure logic, no Playwright.
- `axe-map.js` — pure `mapAxeResults(axeResults, {url,status,title})`: trims raw axe output to the stored per-page shape.
- `report.js` — `buildHtmlReport` + `escHtml`/`SEV_ORDER`: self-contained HTML export rendering.

## Key decisions
- **Express over node:http**: barely more code, static + JSON routing for free.
- **`playwright` (not `playwright-core`)**: `npm install` auto-downloads Chromium via postinstall; we also expose `postinstall: npx playwright install chromium` for reliability.
- **Fresh browser context per scan**: no cookie/cache bleed between scans; browser process reused across scans to stay cheap on 2 cores.
- **Poll, not SSE/WebSocket**: simplest thing that works; UI polls every ~900ms.
- **In-memory results only**: consistent with "no database" requirement; scans vanish on restart.
- **SSRF is best-effort**: we resolve DNS once and check IPs, but Chromium does its own connection (DNS-rebinding TOCTOU remains a theoretical gap — acceptable for a local-first MVP, documented).

## Data flow
1. `POST /api/scan` → validate → return `{id}` (202). Client polls.
2. `runScan` opens a context, scans the submitted URL, optionally crawls same-origin links up to `maxPages` total pages (default 6, clamped 1–10; non-numeric → 400). Crawl pages run with concurrency 2 on separate tabs; a ~3-minute wall-clock deadline marks unstarted pages `{error:'Scan time limit reached'}` and returns the partial result.
3. `GET /api/scan/:id` → `{status, phase, result|error}`.
4. axe `violations[]` are trimmed to: id, impact, help, description, helpUrl, wcag/best-practice tags, and per-node target/html/failureSummary (capped at 50 nodes, 500 chars each). `incomplete[]` (needs-manual-review) is trimmed to id/impact/help/helpUrl/nodeCount.
5. `GET /api/scan/:id/export?format=html|json|pdf` renders a self-contained print-friendly HTML report (inline CSS, disclaimer, summary table, per-page violations + review items), dumps the raw JSON result, or prints that same HTML to PDF via headless Chromium (`page.pdf`, A4). `GET /api/scans` lists recent in-memory scans for the UI's "Recent scans" re-view; `GET /api/scans/:id/compare` diffs a finished scan against the most recent other finished scan of the same normalized URL (origin+pathname lowercased, query/hash ignored) at rule level (id + pageUrl).

## Failure modes
- Busy → 429, UI shows server error message.
- Page timeout / unreachable → scan record gets `error`, UI shows it per-page.
- Oversized HTML (>3MB) → page marked error, others still report.
- ~3min total deadline → remaining crawl pages marked `Scan time limit reached`, partial result still returned as done.
- Browser crash → `browser.isConnected()` check relaunches on next scan.
