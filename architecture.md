# AccessScan — Architecture (MVP)

## Shape
One Node.js process. No build step, no framework, no DB.

```
Browser (vanilla JS)
   │  POST /api/scan {url, crawl}      GET /api/scan/:id (poll)
   ▼
Express server (server.js)
   ├── static files: public/ (index.html, style.css, app.js)
   ├── SSRF validation (URL scheme, hostname blocklist, DNS lookup → private IP check)
   └── Scan queue (in-memory, 1 at a time, 429 if busy)
          │
          ▼
   Playwright Chromium (headless, fresh context per scan)
          │  page.goto (30s timeout) → waitForLoadState networkidle (6s best-effort)
          │  content-size cap (3MB) → AxeBuilder.analyze (wcag2a/aa, 21a/aa, 22aa)
          │  optional: collect same-origin <a href> links (≤5) → repeat per page
          ▼
   Results kept in-memory Map (last ~20 scans), returned as JSON
```

## Key decisions
- **Express over node:http**: barely more code, static + JSON routing for free.
- **`playwright` (not `playwright-core`)**: `npm install` auto-downloads Chromium via postinstall; we also expose `postinstall: npx playwright install chromium` for reliability.
- **Fresh browser context per scan**: no cookie/cache bleed between scans; browser process reused across scans to stay cheap on 2 cores.
- **Poll, not SSE/WebSocket**: simplest thing that works; UI polls every ~900ms.
- **In-memory results only**: consistent with "no database" requirement; scans vanish on restart.
- **SSRF is best-effort**: we resolve DNS once and check IPs, but Chromium does its own connection (DNS-rebinding TOCTOU remains a theoretical gap — acceptable for a local-first MVP, documented).

## Data flow
1. `POST /api/scan` → validate → return `{id}` (202). Client polls.
2. `runScan` opens a context, scans the submitted URL, optionally up to 5 same-origin links.
3. `GET /api/scan/:id` → `{status, phase, result|error}`.
4. axe `violations[]` are trimmed to: id, impact, help, description, helpUrl, wcag/best-practice tags, and per-node target/html/failureSummary (capped at 50 nodes, 500 chars each).

## Failure modes
- Busy → 429, UI shows server error message.
- Page timeout / unreachable → scan record gets `error`, UI shows it per-page.
- Oversized HTML (>3MB) → page marked error, others still report.
- Browser crash → `browser.isConnected()` check relaunches on next scan.
