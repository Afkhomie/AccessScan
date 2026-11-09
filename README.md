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

Vanilla HTML/CSS/JS frontend + tiny Express API. Scans run headless Chromium through [axe-core](https://github.com/dequelabs/axe-core) filtered to WCAG 2.x A/AA rules. Optionally crawls up to 5 same-origin links. One scan at a time; results live in memory only.

## API

- `POST /api/scan` `{ "url": "https://…", "crawl": false }` → `202 { id }` (429 if busy, 400 on bad/private URL)
- `GET /api/scan/:id` → `{ status, phase, result | error }`
- `GET /api/health` → `{ ok, busy }`

## Limitations

- Automated scan only — misses contrast-in-images, keyboard-flow, and many cognitive/ARIA-usage issues.
- Single page (+ up to 5 linked pages if crawl enabled); no sitemap crawling.
- SSRF protection is best-effort (DNS-rebinding TOCTOU remains theoretical).
- Local-first MVP: results aren't persisted; restart = clean slate.

See `prd.md` and `architecture.md` for scope and design decisions.
