# Session Handoff — AccessScan

Last updated: 2026-11-12 (post pentest round-2, pre security/reliability pages commit)

## What this is

Free, local-first EAA/WCAG accessibility scanner. Express + vanilla JS frontend
(`public/`) + Playwright/axe-core backend. No accounts, no DB, no payments.
Public repo: github.com/Afkhomie/AccessScan. Version 0.3.0 (unreleased, see
CHANGELOG.md).

## Architecture (text diagram)

```
Browser
  │  https://access-scan-tool.vercel.app   (canonical; sitemap/llms.txt/keepalive)
  │  https://accessscan-theta.vercel.app   (second domain on same Vercel project, also live)
  ▼
Vercel project `accessscan` (team afkhomies-projects)
  ├─ static site: public/  (project Root Directory = `public`)
  ├─ public/vercel.json: cleanUrls, trailingSlash:false,
  │    rewrite /api/(.*) → /api  (routes into the function below; rewrites
  │    can't add headers, which is why a function is used)
  └─ public/api/index.js — serverless proxy (CJS, dependency-free fetch)
       forwards ALL methods to Render origin, adds header
       `x-proxy-key: $PROXY_SECRET`, strips hop-by-hop +
       accept-encoding/content-encoding (fetch decompresses upstream;
       forwarding them mislabels bodies >~1KB — caused empty bodies).
       Buffers response; maxDuration=60s (Hobby cap — PDF export is the
       first thing to revisit if it times out).
       ▼
Render service `accessscan` (render.yaml blueprint, free plan)
  ├─ server.js — Express, binds 127.0.0.1 locally / 0.0.0.0 on Render
  │    ├─ PROXY_SECRET gate: if env set, EVERY request needs x-proxy-key
  │    │    else bare 403. GET /api/health exempt (Render health check
  │    │    can't send the header; leaks nothing).
  │    ├─ trust proxy = 2 (client → Vercel edge → Render LB → app)
  │    │    → req.ip is real client IP for rate limits.
  │    ├─ SSRF guard: scheme/host allowlist, private-IP + DNS checks,
  │    │    redirect hops re-validated, CDP Fetch interceptor validates
  │    │    every redirect BEFORE connect (pentest round-2 fix).
  │    ├─ rate limit POST /api/scan only: 10/IP/10min + 60 global
  │    │    (RATE_LIMIT_MAX / _WINDOW_MS / _GLOBAL_MAX env tunables)
  │    └─ Playwright + @axe-core/playwright scans; in-memory scan store
  └─ scan-store.js / axe-map.js / report.js — deep modules
```

## Live URLs (verified 2026-11-12 via curl)

- Frontend + API (same-origin via proxy): https://access-scan-tool.vercel.app — `/api/health` → `{"ok":true,"busy":false,"playwright":true}`
- Second live domain on same project: https://accessscan-theta.vercel.app — also 200 + healthy. README still names this one; sitemap/llms.txt/keepalive use `access-scan-tool` — treat `access-scan-tool` as canonical, consider updating README or removing the extra domain.
- API origin (direct hits blocked): https://accessscan-9gcz.onrender.com — `/api/health` open; everything else 403 without `x-proxy-key`.
- Render cold starts ~50s after idle; keepalive workflow mitigates (see Pending).

## What's deployed where

- **Vercel**: static `public/` + `public/api/index.js` function. GitHub repo
  connected — pushes to the connected branch auto-deploy.
- **Render**: `render.yaml` blueprint — `PLAYWRIGHT_BROWSERS_PATH=0 npm install`
  (browsers into node_modules so they persist build→runtime), `npm start`.
  Auto-deploy on push to connected branch — webhook "possibly flaky", verify
  after pushes (see Pending).

## Deploy steps (corrected)

- **Vercel**: run `vercel --prod` from the **REPO ROOT**, not `public/`.
  The Vercel project's Root Directory setting is `public`; running inside
  `public/` fails with "Root Directory public does not exist" (docs fixed in
  commit `1d58ddf`). `vercel login` = device flow, authed as `afkhomie`.
- **Render**: auto-deploy on push (no manual step). `render.yaml` is the
  blueprint; `PROXY_SECRET` is `sync: false` so it's set only via dashboard/API.

## Env vars / secrets (locations only — never commit values)

| Var | Where | Notes |
|---|---|---|
| `PROXY_SECRET` | Render env (dashboard/API) **and** Vercel env (production) | Must match on both. Gates ALL Render requests except `/api/health`. Unset locally → dev unaffected. Value lives only in the two dashboards. |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_GLOBAL_MAX` | Render env (optional) | Defaults 10 / 600000 / 60. |
| `PORT`, `HOST`, `NODE_ENV` | Render env (render.yaml sets HOST=0.0.0.0, NODE_ENV=production) | PORT default 3000 locally. |
| Vercel CLI auth | `vercel login` device flow | Authed as `afkhomie`. |
| `gh` auth | local | Needs `workflow` scope to push `.github/workflows/` (see Pending). |

## Recent major work

- **Pentest round-2 fixes** (`8faeef1`): blind SSRF via redirect hops closed
  with a CDP `Fetch` interceptor that validates every redirect before connect
  (`context.route` does NOT fire for redirect hops in Playwright 1.65);
  resource blocking hardened (serviceWorkers blocked, ping/beacon/websocket
  etc. blocklisted at both layers); scan IDs now `crypto.randomBytes(12)` hex
  (unguessable); `GET /api/scans` public dump REMOVED — frontend history now
  uses per-browser `localStorage` key `accessscan-history` (last 20 scans,
  `public/app.js` ~line 523); `X-Frame-Options: DENY` + `nosniff` on all
  responses. Earlier round also added: SSRF guard, rate limits, credential
  leak fix, compare-direction fix.
- **`trust proxy = 2`** (`server.js:38`) — real per-IP rate limiting behind
  Vercel→Render works now. Caveat documented in code: a direct-to-Render
  attacker could spoof XFF to rotate buckets, but PROXY_SECRET 403s direct
  hits anyway; the global cap ignores IPs entirely.
- **copy.js single-source text system** (`public/copy.js`): `window.COPY`
  holds ALL user-facing strings; elements opt in via `data-copy="path"`
  (textContent) or `data-copy-html="path"` (innerHTML, for markup strings).
  Loaded before app.js/rules-data.js on every page. New copy = add keys here,
  not inline strings.
- **Prerendered pages** (`49d2d39`): privacy/terms/rules ship full static HTML
  content; copy.js/rules-data.js re-fill/re-render identical markup on load.
  Reason: non-JS clients (pentest scanners, LLM crawlers) saw near-empty
  shells when copy was JS-only.
- **rules.html + rules-data.js**: 91 axe rules documented (~1086 lines data).
- **Workflows** (LOCAL ONLY, unpushed): `.github/workflows/test.yml` (syntax
  check + `node test/smoke.js` on push/PR) and `keepalive.yml` (cron */10min,
  curls `/api/health` via the Vercel domain — needs no secret since proxy
  adds it).

## Known limitations

- In-memory everything: scans vanish on Render restart/deploy; compare and
  history are per-instance/per-browser only.
- Vercel function buffers bodies, 60s maxDuration — big PDF exports could
  time out (documented shortcut in `public/api/index.js`).
- DNS-rebinding TOCTOU remains a documented theoretical SSRF limit.
- `trust proxy = 2` assumes exactly two hops (Vercel edge → Render LB). If the
  proxy chain changes, `req.ip` silently breaks.
- Playwright error logs can leak ANSI codes into API messages (cosmetic).
- 180s crawl deadline can overrun ~50s on slow batches.
- Non-goals (do NOT build): persistence/DB, scheduling, multi-user, i18n,
  AAA level, CSV export.

## Pending items

1. **Uncommitted work in tree** — footer now links `security.html` +
   `reliability.html` on index/privacy/terms/404/rules, plus sitemap.xml and
   llms.txt entries. `reliability.html` exists (untracked); **`security.html`
   does NOT exist yet** → live broken link once deployed. Either finish
   security.html or pull the links before committing. Then commit + push
   (deploys Vercel + Render).
2. **`.github/workflows/` unpushed** — `gh auth refresh -s workflow` then
   `git add .github && commit && push`, else push is rejected.
3. **Render auto-deploy webhook possibly flaky** — after the next push,
   confirm Render actually picked it up (dashboard or hit a changed endpoint);
   if not, check the webhook in Render dashboard / re-connect.
4. **Canonical domain cleanup** — README says `accessscan-theta`, everything
   else says `access-scan-tool`. Pick one, align docs, maybe detach the other.
5. **Search Console** once a custom domain exists.
6. Optional: rotate/verify `PROXY_SECRET` still matches on both platforms if
   either was ever redeployed from scratch.

## How to run / verify locally

```bash
cd AccessScan && npm install        # postinstall pulls Chromium
node server.js                      # :3000 on 127.0.0.1, PROXY_SECRET unset → open
node test/smoke.js                  # fast unit checks, no browser
```

Real scan: `POST /api/scan {"url":"example.com","maxPages":3}` → poll
`GET /api/scan/:id` → `GET /api/scan/:id/export?format=html|json|pdf`.

## Working style notes

- Verified claims only — curl the live URLs, run the smoke test, don't assume.
- Ponytail rules apply: no new deps, vanilla JS, smallest complete change.
- Conventional commits; push to master is fine (public repo) — but check
  `git status` first, there may be someone else's uncommitted work (right now
  there is: see Pending #1).
