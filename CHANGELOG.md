# Changelog

All notable changes to AccessScan are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - Unreleased

Second public release: the v0.2 feature set, a full visual redesign, and a
security-hardening pass from a self-review/pentest sweep.

### Added

- Scan compare: `GET /api/scans/:id/compare` diffs a finished scan against the
  most recent other finished scan of the same normalized URL and reports added /
  fixed rules, severity changes, and before/after totals.
- Export formats: finished scans can be exported as self-contained HTML,
  PDF, or JSON via `GET /api/scan/:id/export?format=…`.
- Crawl controls: `POST /api/scan` accepts `crawl` and `maxPages` (total pages
  incl. the submitted URL, clamped 1–10, default 6), with same-origin link
  crawling capped at ~3 minutes wall-clock per scan.
- Rules reference page (`rules.html` / `public/rules-data.js`) documenting the
  axe rules AccessScan checks.
- Scan history: `GET /api/scans` lists recent in-memory scans; finished scans
  can be re-opened from the UI.
- SEO/social meta tags and share assets, pointing at the GitHub repo as the
  canonical public face.

### Changed

- Bare domains are now accepted — normalized to `https://` server-side.
- Visual redesign: EU government design language — institutional blue, calm
  spacing, accessibility-focused typography and rhythm.
- Codebase refactor: extracted deep modules — scan store (`scan-store.js`),
  report generation (`report.js`), and axe mapping (`axe-map.js`).

### Fixed

- Bug-hunt sweep: scan race condition, hidden-attribute false positives,
  hash-fragment crash, credential leak in error responses, compare-direction
  logic.
- Clean JSON error responses for malformed request bodies (previously leaked
  stack traces).
- Styled 404 page and error states; audit fixes for a11y, contrast, focus
  states, and motion.
- Responsive fixes: tab truncation, issue-head squeeze, iOS zoom-on-focus;
  compact hero on short viewports.

### Security

- `POST /api/scan` rate limiting: 10 accepted scan requests per IP per
  10 minutes plus a global cap of 60 per window (tunable via `RATE_LIMIT_*`
  env vars). Polling endpoints are intentionally not limited.
- Server binds to `127.0.0.1` by default — local-first, no accidental LAN
  exposure.
- Redirect responses are re-validated against the SSRF/private-address checks
  (redirect-based SSRF bypass closed; DNS-rebinding TOCTOU remains a known,
  documented theoretical limit).
- Private/internal URLs rejected at submit time.

## [0.1.0]

- AccessScan MVP: EAA/WCAG scanner — Express + Playwright + axe-core.
