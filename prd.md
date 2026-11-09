# AccessScan — PRD (MVP)

## What it is
Free, public, **local-first** automated accessibility checker for the EU Accessibility Act (EAA) / WCAG 2.x. Paste a URL → get an honest report of common automated-detectable issues. No accounts, no payments, no database, no external services.

## Why
EAA enforcement is live in the EU (June 2025). Site owners need a fast, free first-pass check. Commercial scanners cost money and send your URL/data to third parties; AccessScan runs everything on the user's own machine.

## Users
Site owners, devs, agencies, auditors doing quick pre-checks before manual review.

## Core requirements (MVP)
- Single-page web app: URL input → scan → report.
- Scan via headless Chromium + axe-core (WCAG 2.x A/AA rule tags).
- Optional: also scan up to 5 same-origin links found on the page.
- Results: violations grouped by WCAG rule, severity (critical/serious/moderate/minor), element selector + HTML snippet + fix hint, per-page breakdown.
- SSRF protection: http/https only, block private/internal hosts & IPs, DNS resolution check, timeouts, page-size cap.
- One scan at a time (queue of 1) → HTTP 429 when busy. Weak-hardware friendly.
- **Honest framing (required):** UI states automated scans find ~30–57% of WCAG issues; not a compliance guarantee.

## Non-goals (MVP)
- No login/accounts/billing/database/persistence across restarts.
- No PDF/CSV export, no scheduled re-scans, no multi-user, no hosted service.
- No manual-review workflow; automated scan only.
- No axe-incomplete/needs-review triage UI beyond raw counts (v2).

## Success criteria
- `npm install && npm start` works on a fresh machine (document `npx playwright install chromium` if needed).
- Scanning a real URL returns a real axe report via API and UI.
- SSRF: localhost/private IPs rejected.
- UI communicates severity honestly and shows the disclaimer.

## Risks
- axe only catches a subset of WCAG → mitigated by persistent disclaimer.
- Playwright browser download (~170MB) on first install → documented.
- Single scan at a time → fine for MVP/local use.
