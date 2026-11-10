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

- `POST /api/scan` `{ "url": "https://…", "crawl": false, "maxPages": 5 }` → `202 { id }` (429 if busy, 400 on bad/private URL or non-numeric `maxPages`; `maxPages` is total pages incl. the submitted URL, clamped 1–10, default 6)
- `GET /api/scan/:id` → `{ status, phase, result | error }`
- `GET /api/scan/:id/export?format=html|json|pdf` → downloadable report (409 until scan finishes)
- `GET /api/scans` → recent scans kept in memory (newest first)
- `GET /api/scans/:id/compare` → diff vs. most recent other finished scan of the same normalized URL (origin+pathname, query/hash ignored): `{ comparable, previousId, addedRules, fixedRules, severityChanges, totalsBefore, totalsAfter }` or `{ comparable: false }`
- `GET /api/health` → `{ ok, busy }`

## Limitations

- Automated scan only — misses contrast-in-images, keyboard-flow, and many cognitive/ARIA-usage issues. axe "incomplete" rules (needs manual review) are listed separately, not counted as violations.
- Single page (+ up to 9 linked pages if crawl enabled, max 10 total); no sitemap or depth-2 crawling.
- SSRF protection is best-effort (DNS-rebinding TOCTOU remains theoretical).
- Local-first MVP: results aren't persisted; restart = clean slate (recent scans list is memory-only too).

See `prd.md` and `architecture.md` for scope and design decisions.
