# Session Handoff — AccessScan

Last updated: 2026-11-10 (end of local session)

## What this is

Free, local-first EAA/WCAG accessibility scanner. Express + vanilla JS frontend
(`public/`) + Playwright/axe-core backend. No accounts, no DB, no payments.
Public repo: github.com/Afkhomie/AccessScan

## Current state (all committed + pushed)

- `e613743` — EU government design language (institutional blue #003399, Inter
  type, calm spacing). Replaced earlier swiss-brutalist design.
- `1fd560e` — bare domains accepted (`example.com` → `https://example.com`)
- `3e365a4` — (superseded) swiss brutalist design
- `3330be9` — bug-hunt fixes: scan race, [hidden] CSS, URIError, cred leak,
  compare direction
- `e3d1128` — refactor: scan-store.js / report.js / axe-map.js deep modules +
  test/smoke.js
- `460d20d` — v0.2: PDF export, compare API+UI, crawl controls, rules.html
  (91 axe rules), fix hints, scan history

## Architecture map

- `server.js` (~370 lines) — HTTP routes only, thin adapters
- `scan-store.js` — scans Map, pruning, compare/diff (factory: createScanStore)
- `axe-map.js` — pure axe→report mapping
- `report.js` — HTML report + escHtml
- `test/smoke.js` — run `node test/smoke.js` (no Playwright needed)
- `public/app.js` — UI logic; `public/rules-data.js` — 91 rules data+renderer
- Server: `node server.js` → localhost:3000

## Open items / known issues

1. **Spacing/typography pass was IN PROGRESS** when session ended — a subagent
   was auditing computed styles and fixing vertical rhythm/type scale in
   public/style.css. Check `git status`/recent commits; if nothing landed,
   redo the audit: measure font-size/margin/padding/line-height per element
   at 1440px and 390px, establish 4-8px spacing scale + modular type scale.
2. **Security audit was IN PROGRESS** — a black-box "hacker" agent was probing
   SSRF bypasses, XSS-via-scan-results, DoS, traversal. Findings were NOT yet
   reported. Re-run that audit or check for a report.
3. **Untracked `audit-tmp.js`** may exist — leftover temp file, safe to delete.
4. Known minor: 180s crawl deadline can overrun ~50s on slow batches;
   Playwright error logs leak ANSI codes into API messages (cosmetic).
5. Non-goals (do NOT build): persistence/DB, scheduling, hosted/multi-user,
   i18n, AAA level, CSV export.

## How to run / verify

```bash
cd AccessScan && npm install   # if needed
node server.js                 # :3000
node test/smoke.js             # fast unit checks
```

Real scan test: POST /api/scan {"url":"example.com"} → poll
GET /api/scan/:id → export?format=html|json|pdf.

## Working style notes

- User wants verified claims only — test with real scans/curl, never assume.
- Keep it lean (ponytail): no new deps without reason, vanilla JS, no DB.
- Commits: conventional style, push to master is fine (public repo).

## Hosted deployment (added later — Vercel + Render split)

- **Frontend:** https://accessscan-theta.vercel.app — Vercel project `accessscan`
  (team afkhomies-projects), static deploy of `public/` only.
- **API:** https://accessscan-9gcz.onrender.com — unchanged Render service.
- **Proxy:** `public/vercel.json` rewrites `/api/:path*` → Render, so the site
  is same-origin (no CORS). Verified live: `/api/health` → `{"ok":true}` and a
  real POST /api/scan example.com → 202 → done through the Vercel URL.
- **Deploy:** `cd public && vercel --prod --yes`. Do NOT deploy repo root —
  Vercel CLI 65 auto-detects `server.js` as an Express "service" and rejects
  top-level `outputDirectory`; project Root Directory is set to `public` in
  Vercel project settings, and the GitHub repo is connected (pushes to the
  connected branch auto-deploy `public/`).
- **Auth:** `vercel login` uses device flow; CLI is authed as `afkhomie`.
- **Caveat:** `server.js` does not set `trust proxy`, so behind the Vercel→Render
  rewrite all clients share Render's ingress IP for rate limiting (10 scans/10min
  per IP + 60 global). If rate limits bite in production, add
  `app.set('trust proxy', 1)` (or appropriate hops) on the Render service —
  needs a Render redeploy, do it deliberately.
- Render cold starts (~50s) still apply after idle.

## 2026-11-11 EOD state
- LIVE: https://access-scan-tool.vercel.app (Vercel static, public/ = root dir)
- API: https://accessscan-9gcz.onrender.com (Render free tier, auto-deploy on push)
- /api/* proxied via public/vercel.json rewrites — same-origin, no CORS
- vercel.json lives in public/ NOT repo root (root conflicts with Express detect)
- .github/workflows/{test,keepalive}.yml exist LOCALLY ONLY — push needs `gh auth refresh -s workflow`
- Keep-alive: GH Action cron */10min drafted; if unpushed, Render sleeps after ~15min idle (cold start ~50s, self-heals on visit)
- TODO next: trust proxy on Render for real per-IP rate limits; Search Console once custom domain exists
