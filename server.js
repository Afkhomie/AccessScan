// AccessScan — local-first automated WCAG/EAA checker.
// Single-process: Express serves the UI + JSON API, Playwright+axe does scans.
// Honest scope: one scan at a time (weak hardware), results are in-memory only.

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
const SCAN_TIMEOUT_MS = 45_000;
const SCAN_DEADLINE_MS = 180_000; // ~3 min total wall-clock per scan
const MAX_PAGES = 6; // default total pages (submitted URL + same-origin links); API allows 1-10
const MAX_PAGES_LIMIT = 10;
const CRAWL_CONCURRENCY = 2;
const MAX_HTML_BYTES = 3 * 1024 * 1024;

const app = express();
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
  let u;
  try {
    u = new URL(raw);
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
    if (!records.length) return { error: 'Could not resolve that hostname.' };
    for (const r of records) {
      const ip = r.address;
      const bare = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
      if (isPrivateIp(bare)) {
        return { error: 'That hostname resolves to a private/internal address.' };
      }
    }
  } catch {
    return { error: 'Could not resolve that hostname.' };
  }
  return { url: u };
}

// ---------- Scan engine ----------

let browser = null;
let scanning = false;
const scanStore = createScanStore();

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
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

async function scanOnePage(page, url) {
  const resp = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: SCAN_TIMEOUT_MS,
  });
  // Give late scripts a moment, but don't hang on networkidle.
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});

  const html = await page.content();
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { url, error: 'Page is too large to scan safely.', status: resp?.status() ?? null };
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const title = await page.title().catch(() => '');
  return mapAxeResults(results, {
    url,
    status: resp?.status() ?? null,
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
    });
    const page = await context.newPage();

    rec.phase = 'loading';
    const first = await scanOnePage(page, startUrl.toString());
    const pages = [first];
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
        try {
          return await scanOnePage(p, link);
        } catch (e) {
          return { url: link, error: e.message?.slice(0, 200) || 'Scan failed' };
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

    await context.close();

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
    rec.error = e.message?.slice(0, 300) || 'Scan failed unexpectedly.';
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

// Recent scans (newest first) — in-memory only, vanish on restart.
app.get('/api/scans', (_req, res) => {
  res.json({ scans: scanStore.list() });
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

app.listen(PORT, () => {
  console.log(`AccessScan listening on http://localhost:${PORT}`);
});
