// AccessScan — local-first automated WCAG/EAA checker.
// Single-process: Express serves the UI + JSON API, Playwright+axe does scans.
// Honest scope: one scan at a time (weak hardware), results are in-memory only.

// On Render, browsers must live inside the deployed app dir — the default
// ~/.cache/ms-playwright from the build step does not persist to runtime.
// PLAYWRIGHT_BROWSERS_PATH=0 installs into node_modules/.local-browsers.
// Must be set before playwright is required (path resolved at load time).
if (process.env.RENDER === 'true' && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

const express = require('express');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const { createScanStore } = require('./scan-store');
const { mapAxeResults } = require('./axe-map');
const { buildHtmlReport } = require('./report');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const SCAN_TIMEOUT_MS = 45_000;
const SCAN_DEADLINE_MS = 180_000; // ~3 min total wall-clock per scan
const MAX_PAGES = 6; // default total pages (submitted URL + same-origin links); API allows 1-10
const MAX_PAGES_LIMIT = 10;
const CRAWL_CONCURRENCY = 2;
const MAX_HTML_BYTES = 3 * 1024 * 1024;

const app = express();
// Two proxy hops in production: client -> Vercel edge -> Render LB -> app.
// trust proxy=2 makes req.ip the real client IP so rate limits bucket
// per-user instead of sharing Vercel's egress IP. Caveat: a direct-to-Render
// attacker can spoof X-Forwarded-For to rotate buckets — bounded by the
// global cap (RATE_LIMIT_GLOBAL_MAX) which ignores IPs entirely.
app.set('trust proxy', 2);
// Shared-secret gate: when PROXY_SECRET is set (production), every request —
// static and API — must carry the matching x-proxy-key header, which only the
// Vercel serverless proxy adds. Direct hits on the Render URL get a bare 403
// so nothing leaks about what is expected. Unset locally → dev unaffected.
const PROXY_SECRET = process.env.PROXY_SECRET;
if (PROXY_SECRET) {
  app.use((req, res, next) => {
    // /api/health stays open: Render's own health check can't send the
    // header, and the payload ({ok,busy,playwright}) leaks nothing.
    if (req.method === 'GET' && req.path === '/api/health') return next();
    if (req.get('x-proxy-key') !== PROXY_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}
// Baseline response headers on everything the API/static server emits —
// no framing (clickjacking) and no MIME sniffing.
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- SSRF guard ----------

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||          // link-local + cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224                            // multicast/reserved
    );
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    return (
      s === '::' || s === '::1' ||
      s.startsWith('fe80') ||             // link-local
      s.startsWith('fc') || s.startsWith('fd') || // ULA
      s.startsWith('ff') ||               // multicast
      s.startsWith('::ffff:')             // mapped v4 — checked separately
    );
  }
  return true; // unparseable → treat as unsafe
}

async function validateScanUrl(raw) {
  // Accept bare domains/paths (example.com, example.com/x) — default to https://.
  const trimmed = String(raw || '').trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u;
  try {
    u = new URL(withScheme);
  } catch {
    return { error: 'That does not look like a valid URL.' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { error: 'Only http:// and https:// URLs can be scanned.' };
  }
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' || host.endsWith('.localhost') ||
    host.endsWith('.local') || host.endsWith('.internal') ||
    host.endsWith('.lan') || host.endsWith('.home') ||
    host === 'metadata.google.internal'
  ) {
    return { error: 'Local/internal hostnames are not allowed.' };
  }

  // Literal IP?
  if (net.isIP(host.replace(/^\[|\]$/g, ''))) {
    if (isPrivateIp(host.replace(/^\[|\]$/g, ''))) {
      return { error: 'Private/internal IP addresses are not allowed.' };
    }
    return { url: u };
  }

  // DNS check: every resolved address must be public.
  // shortcut: the browser re-resolves DNS at navigation time, so a fast-rebinding
  // domain could still slip through; acceptable for a local single-user tool.
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) return { error: "We couldn't find that website. Check the spelling and try again." };
    for (const r of records) {
      const ip = r.address;
      const bare = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
      if (isPrivateIp(bare)) {
        return { error: 'That hostname resolves to a private/internal address.' };
      }
    }
  } catch {
    return { error: "We couldn't find that website. Check the spelling and try again." };
  }
  return { url: u };
}

// ---------- Rate limiting (scan creation only) ----------
// In-memory sliding window — no DB; it's abuse protection, not quota
// accounting, so losing it on restart is fine. Polling/export endpoints are
// deliberately NOT limited (one scan = many polls). Tunables via env:
//   RATE_LIMIT_MAX        accepted scans per IP per window   (default 10)
//   RATE_LIMIT_WINDOW_MS  window length                      (default 10 min)
//   RATE_LIMIT_GLOBAL_MAX accepted scans globally per window (default 60)
// req.ip is used as-is. Behind a reverse proxy either enable
// `app.set('trust proxy', …)` or have the proxy overwrite X-Forwarded-For —
// see README "Deploying". Without it all proxied clients share one bucket
// (the global cap still protects the box).
const RATE_LIMIT_MAX = Math.max(1, Number(process.env.RATE_LIMIT_MAX || 10));
const RATE_LIMIT_WINDOW_MS = Math.max(1000, Number(process.env.RATE_LIMIT_WINDOW_MS || 600_000));
const RATE_LIMIT_GLOBAL_MAX = Math.max(1, Number(process.env.RATE_LIMIT_GLOBAL_MAX || 60));
const scanHits = new Map(); // ip -> number[] of accepted-request timestamps
const globalHits = [];

function checkScanRateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const prune = (arr) => { while (arr.length && arr[0] < cutoff) arr.shift(); };
  prune(globalHits);
  let hits = scanHits.get(ip);
  if (!hits) { hits = []; scanHits.set(ip, hits); }
  prune(hits);
  // Lazy map cleanup so one-shot IPs don't grow it forever.
  if (scanHits.size > 5000) {
    for (const [k, v] of scanHits) if (!v.length) scanHits.delete(k);
  }
  const retryAfterFor = (arr) =>
    Math.max(1, Math.ceil((arr[0] + RATE_LIMIT_WINDOW_MS - now) / 1000));
  if (globalHits.length >= RATE_LIMIT_GLOBAL_MAX) {
    return { allowed: false, retryAfter: retryAfterFor(globalHits) };
  }
  if (hits.length >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: retryAfterFor(hits) };
  }
  hits.push(now);
  globalHits.push(now);
  return { allowed: true };
}

// ---------- Scan engine ----------

let browser = null;
let scanning = false;
const scanStore = createScanStore();

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // Bound the renderer's JS heap — a hostile/challenge page spinning
        // JS should kill the tab, not the whole Node process (512MB hosts).
        '--js-flags=--max-old-space-size=256',
      ],
    });
  }
  return browser;
}

function collectSameOriginLinks(page, baseUrl, max) {
  // NB: the page function runs in the browser — no closure vars allowed.
  return page.$$eval('a[href]', (anchors, base) => {
    const out = [];
    const seen = new Set([base]);
    for (const a of anchors) {
      try {
        const u = new URL(a.href, base);
        if (u.origin !== new URL(base).origin) continue;
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        u.hash = '';
        const s = u.toString();
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
      } catch { /* skip bad hrefs */ }
    }
    return out;
  }, baseUrl).then((links) => links.slice(0, max)).catch(() => []);
}

// Plain-English scan errors — raw Playwright/Node messages stay in server
// logs; users get messages they can act on.
function toUserError(e) {
  const m = String(e?.message || e || '');
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|getaddrinfo|resolve host/i.test(m)) {
    return "We couldn't find that website. Check the spelling and try again.";
  }
  if (/timeout|timed out/i.test(m)) {
    return 'The site took too long to respond. Try again, or try a different page.';
  }
  if (/ERR_CERT|SSL|certificate|ERR_SSL/i.test(m)) {
    return "The site has a security certificate problem we couldn't get past.";
  }
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(m)) {
    return 'The site refused the connection. It may be down or blocking scanners.';
  }
  if (/ERR_ABORTED|net::ERR/i.test(m)) {
    return "The page didn't finish loading. The site may be slow or blocking automated visits.";
  }
  return 'Something went wrong while scanning this page.';
}

// CDP resource types we never let near the network. 'Fetch'/'XHR'/'Script'/
// 'Stylesheet'/'Document'/'TextTrack' stay — SPAs need them to render.
// 'Preflight' stays (blocking it would break every CORS fetch/XHR).
const CDP_BLOCKED_TYPES = new Set([
  'Image', 'Media', 'Font', 'Ping', 'WebSocket', 'EventSource',
  'Manifest', 'CSPViolationReport', 'SignedExchange', 'Prefetch',
]);

// Per-page CDP Fetch interceptor. context.route() does NOT see redirect
// hops in Playwright 1.65 (verified: the request event fires but the route
// handler is skipped for redirected requests) — that gap was the blind-SSRF
// hole. Fetch.requestPaused fires for EVERY request including each redirect
// hop BEFORE Chromium connects, so validating 'Document' URLs here closes it.
// Returns { blockedUrl } so callers can report the guard rejection.
// page -> guard state; dedupes arming (context 'page' event fires for pages
// we create ourselves, and crawl batches arm explicitly).
const scanGuardPages = new WeakMap();

async function armScanGuards(page) {
  const existing = scanGuardPages.get(page);
  if (existing) return existing;
  const state = { blockedUrl: null };
  scanGuardPages.set(page, state); // mark before awaits so concurrent callers dedupe
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  cdp.on('Fetch.requestPaused', (ev) => {
    const reply = (cmd, params) => cdp.send(cmd, params).catch(() => {});
    const type = ev.resourceType || '';
    const url = ev.request?.url || '';
    if (CDP_BLOCKED_TYPES.has(type)) {
      return reply('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'BlockedByClient' });
    }
    if (type === 'Document' && /^https?:/i.test(url)) {
      validateScanUrl(url).then((check) => {
        if (check.error) {
          state.blockedUrl = url;
          console.warn(`scan blocked (pre-connect): ${url} -> ${check.error}`);
          return reply('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'BlockedByClient' });
        }
        return reply('Fetch.continueRequest', { requestId: ev.requestId });
      }).catch(() =>
        // Guard itself failed — fail closed on document navigations.
        reply('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'BlockedByClient' })
      );
      return;
    }
    return reply('Fetch.continueRequest', { requestId: ev.requestId });
  });
  return state;
}

async function scanOnePage(page, url) {
  const resp = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: SCAN_TIMEOUT_MS,
  });
  // Give late scripts a moment, but don't hang on networkidle.
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});

  const httpStatus = resp?.status() ?? null;

  // Error pages and bot-challenge interstitials aren't real content —
  // report them honestly instead of scanning a 503/challenge page and
  // returning violations that look authoritative.
  if (httpStatus !== null && httpStatus >= 400) {
    return {
      url,
      error: httpStatus === 403 || httpStatus === 429 || httpStatus === 503
        ? `The site returned "${httpStatus}" — it may be down or blocking automated scans.`
        : `The site returned an error (${httpStatus}). It may be down.`,
      status: httpStatus,
    };
  }
  const earlyTitle = await page.title().catch(() => '');
  if (/just a moment|attention required|checking your browser|verify you are human|cf-chl|are you a robot/i.test(earlyTitle)) {
    return {
      url,
      error: 'This site blocked the scan with bot protection. Try again later or scan a different page.',
      status: httpStatus,
    };
  }

  // A redirect may have landed on an internal host — re-validate the
  // final URL the same way the submitted URL was validated.
  const finalUrl = page.url();
  if (finalUrl && finalUrl !== url) {
    const check = await validateScanUrl(finalUrl);
    if (check.error) {
      return { url, error: `Redirected to a disallowed address. ${check.error}`, status: httpStatus };
    }
  }

  const html = await page.content();
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { url, error: 'Page is too large to scan safely.', status: httpStatus };
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const title = earlyTitle || (await page.title().catch(() => ''));
  return mapAxeResults(results, {
    url,
    status: httpStatus,
    title,
  });
}

async function runScan(scanId, startUrl, crawl, maxPages) {
  const rec = scanStore.get(scanId);
  const deadline = Date.now() + SCAN_DEADLINE_MS;
  try {
    const b = await getBrowser();
    const context = await b.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'AccessScan/0.1 (+local accessibility checker; https://github.com)',
      // Service workers can issue requests that bypass context.route —
      // and cache/poison scanned pages. axe doesn't need them.
      serviceWorkers: 'block',
    });
    // page -> URL the route-level guard refused (first hops, incl. popups).
    const blockedByPage = new Map();
    // Popups (window.open) get the same CDP redirect-hop guard, best effort.
    // Arming must NOT happen synchronously inside the 'page' event: Fetch.enable
    // sent while the page is still initializing loses to Playwright's own
    // routing Fetch setup and silently stops intercepting (verified). The
    // defer lets init settle; pages we scan are armed explicitly after
    // newPage() resolves, which is the ordering that works. Popup first
    // requests remain covered context-wide by context.route regardless.
    context.on('page', (p) => {
      setTimeout(() => { armScanGuards(p).catch(() => {}); }, 50);
    });
    // axe-core analyzes the DOM, not pixels — abort heavy subresources to
    // keep memory/bandwidth low (Render free tier is 512MB; images, video,
    // and fonts are the biggest offenders on media-heavy pages). 'ping'/
    // 'beacon'/'websocket'/'eventsource'/'other' are blocked too — they
    // are analytics/telemetry channels that only leak scan traffic.
    // 'fetch'/'xhr' MUST keep flowing or JS-heavy pages/CSRF tokens break.
    // Document requests additionally run the SSRF guard on EVERY redirect
    // hop BEFORE the browser connects to it (pentest: a 302 to
    // 127.0.0.1:10000/api/health returned 200 — the post-navigation
    // page.url() check came too late).
    await context.route('**/*', async (route) => {
      const req = route.request();
      const t = req.resourceType();
      if (
        t === 'image' || t === 'media' || t === 'font' ||
        t === 'ping' || t === 'beacon' || t === 'websocket' ||
        t === 'eventsource' || t === 'other'
      ) {
        return route.abort();
      }
      if (t === 'document') {
        // Walk redirectedFrom() to cover the whole chain — route fires per
        // hop, and a hop's predecessors are already validated, but re-check
        // is cheap insurance for any chain shape Playwright hands us.
        for (let hop = req; hop; hop = hop.redirectedFrom()) {
          const check = await validateScanUrl(hop.url());
          if (check.error) {
            console.warn(`scan blocked: ${hop.url()} -> ${check.error}`);
            // Tag the page so the scan reports the guard rejection instead
            // of a generic net::ERR from the aborted navigation.
            try {
              const pg = req.frame()?.page?.();
              if (pg) blockedByPage.set(pg, hop.url());
            } catch { /* frame lookup is best-effort */ }
            return route.abort();
          }
        }
      }
      return route.continue();
    });
    const page = await context.newPage();
    const firstGuard = await armScanGuards(page).catch(() => null);
    const pages = [];

    try {
    rec.phase = 'loading';
    let first;
    try {
      first = await scanOnePage(page, startUrl.toString());
    } catch (e) {
      const blocked = firstGuard?.blockedUrl || blockedByPage.get(page);
      if (blocked) {
        const err = new Error(`Redirected to a disallowed address (${blocked}).`);
        err.blocked = true;
        throw err;
      }
      throw e;
    }
    pages.push(first);
    // Progress counts COMPLETED pages (first page already done → 1).
    let completed = 1;
    let totalPlanned = crawl && !first.error ? maxPages : 1;
    const bumpProgress = () => {
      completed += 1;
      rec.phase = `scanning ${Math.min(completed, totalPlanned)}/${totalPlanned}`;
    };

    if (crawl && !first.error && Date.now() < deadline) {
      rec.phase = 'finding-links';
      const links = await collectSameOriginLinks(page, startUrl.toString(), maxPages - 1);
      totalPlanned = 1 + links.length; // actual count once links are known
      // Crawl pages run CRAWL_CONCURRENCY at a time; each gets its own page so
      // navigations don't race on a shared tab.
      const scanLink = async (link) => {
        const p = await context.newPage();
        const guard = await armScanGuards(p).catch(() => null);
        try {
          return await scanOnePage(p, link);
        } catch (e) {
          const blocked = guard?.blockedUrl || blockedByPage.get(p);
          return {
            url: link,
            error: blocked
              ? `Redirected to a disallowed address (${blocked}).`
              : toUserError(e),
          };
        } finally {
          await p.close().catch(() => {});
          bumpProgress();
        }
      };
      for (let i = 0; i < links.length; i += CRAWL_CONCURRENCY) {
        if (Date.now() > deadline) {
          // Time guard: mark every not-yet-started page honestly, keep partial result.
          for (const link of links.slice(i)) {
            pages.push({ url: link, error: 'Scan time limit reached' });
            bumpProgress();
          }
          break;
        }
        const batch = links.slice(i, i + CRAWL_CONCURRENCY);
        pages.push(...(await Promise.all(batch.map(scanLink))));
      }
    }

    } finally {
      // Always close — a thrown scanOnePage would otherwise leak the
      // context (and its pages) in the long-lived shared browser.
      await context.close().catch(() => {});
    }

    rec.status = 'done';
    rec.phase = 'done';
    rec.result = {
      scannedAt: new Date().toISOString(),
      crawled: crawl,
      pages,
      totals: {
        rules: pages.reduce((s, p) => s + (p.violations?.length || 0), 0),
        nodes: pages.reduce((s, p) => s + (p.totalNodes || 0), 0),
        critical: pages.reduce((s, p) => s + (p.counts?.critical || 0), 0),
        serious: pages.reduce((s, p) => s + (p.counts?.serious || 0), 0),
        moderate: pages.reduce((s, p) => s + (p.counts?.moderate || 0), 0),
        minor: pages.reduce((s, p) => s + (p.counts?.minor || 0), 0),
      },
      passes: pages.reduce((s, p) => s + (p.passes || 0), 0),
      incomplete: pages.reduce((s, p) => s + (p.incompleteCount || 0), 0),
    };
  } catch (e) {
    rec.status = 'error';
    rec.phase = 'error';
    rec.error = e.blocked ? e.message : toUserError(e);
  }
  scanning = false;
}

// ---------- API ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, busy: scanning, playwright: !!browser });
});

app.post('/api/scan', async (req, res) => {
  // Reserve the single scan slot BEFORE any await — concurrent requests must
  // not all pass the busy check while DNS validation is in flight.
  if (scanning) {
    return res.status(429).json({ error: 'A scan is already running. Please wait for it to finish.' });
  }
  scanning = true;
  // Rate-limit only requests that would actually create a scan: the busy
  // check above already 429s without consuming budget, and accepted requests
  // consume a token even if the URL later fails validation (anti-abuse).
  const rl = checkScanRateLimit(req.ip || 'unknown');
  if (!rl.allowed) {
    scanning = false;
    res.set('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Too many scan requests from this address. Please wait a few minutes and try again.' });
  }
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!raw || raw.length > 2048) {
    scanning = false;
    return res.status(400).json({ error: 'Provide a URL to scan.' });
  }
  const { url, error } = await validateScanUrl(raw);
  if (error) {
    scanning = false;
    return res.status(400).json({ error });
  }

  // Optional maxPages: total pages including the submitted URL, clamped 1-10.
  // Non-numeric → 400; numeric out-of-range → clamped (not an error).
  let maxPages = MAX_PAGES;
  const rawMax = req.body?.maxPages;
  if (rawMax !== undefined && rawMax !== null && rawMax !== '') {
    const n = typeof rawMax === 'number' ? rawMax : Number(rawMax);
    if (!Number.isFinite(n)) {
      scanning = false;
      return res.status(400).json({ error: 'maxPages must be a number.' });
    }
    maxPages = Math.min(MAX_PAGES_LIMIT, Math.max(1, Math.trunc(n)));
  }

  // Store a credential-free copy for display/history — rec.url ends up in
  // /api/scans, reports and exports, so user:pass@ must not persist there.
  // Navigation still uses the original URL (basic-auth sites keep working).
  const storedUrl = new URL(url.toString());
  storedUrl.username = '';
  storedUrl.password = '';
  const rec = scanStore.create({ url: storedUrl.toString(), maxPages });
  const crawl = req.body?.crawl === true;

  // Fire and forget; client polls /api/scan/:id
  runScan(rec.id, url, crawl, maxPages);

  res.status(202).json({ id: rec.id, status: 'running' });
});

app.get('/api/scan/:id', (req, res) => {
  const rec = scanStore.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Unknown scan id.' });
  res.json(scanStore.toStatus(rec));
});

// Compare a finished scan against the most recent OTHER finished scan of the
// same normalized URL — see scan-store.js for the rules.
app.get('/api/scans/:id/compare', (req, res) => {
  const out = scanStore.compare(req.params.id);
  if (out.error) return res.status(out.status).json({ error: out.error });
  res.json(out);
});

// ---------- Report export ----------

app.get('/api/scan/:id/export', async (req, res) => {
  const fin = scanStore.getFinished(req.params.id);
  if (fin.error) return res.status(fin.status).json({ error: fin.error });
  const rec = fin.rec;
  const format = ['json', 'html', 'pdf'].includes(req.query.format) ? req.query.format : 'html';
  const safeId = String(rec.id).replace(/[^a-zA-Z0-9_-]/g, '');

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="accessscan-${safeId}.json"`);
    return res.json({ id: rec.id, url: rec.url, ...rec.result });
  }

  const html = buildHtmlReport(rec, rec.id);

  if (format === 'pdf') {
    // Reuse the HTML report, rendered to PDF by the same headless chromium.
    try {
      const b = await getBrowser();
      const ctx = await b.newContext();
      try {
        const p = await ctx.newPage();
        await p.setContent(html, { waitUntil: 'load' });
        const pdf = await p.pdf({ format: 'A4', printBackground: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="accessscan-${safeId}.pdf"`);
        return res.send(pdf);
      } finally {
        await ctx.close().catch(() => {});
      }
    } catch (e) {
      console.error('PDF export failed:', e);
      return res.status(500).json({ error: 'PDF export failed. Try the HTML export instead.' });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="accessscan-${safeId}.html"`);
  res.send(html);
});

// ---------- errors ----------
// Malformed JSON / body-parser failures: clean JSON, no stack trace leak.
app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  console.error('unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---------- 404s ----------
// Unknown API routes get JSON; everything else gets the styled 404 page.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});
app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Graceful-ish shutdown
process.on('SIGINT', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });
process.on('SIGTERM', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });

app.listen(PORT, HOST, () => {
  console.log(`AccessScan listening on http://${HOST}:${PORT}`);
});
