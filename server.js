// AccessScan — local-first automated WCAG/EAA checker.
// Single-process: Express serves the UI + JSON API, Playwright+axe does scans.
// Honest scope: one scan at a time (weak hardware), results are in-memory only.

const express = require('express');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const PORT = Number(process.env.PORT || 3000);
const SCAN_TIMEOUT_MS = 45_000;
const MAX_PAGES = 6; // submitted URL + up to 5 same-origin links
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
const scans = new Map(); // id -> { status, phase, result?, error?, createdAt }
let scanSeq = 0;

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
  if (html.length > MAX_HTML_BYTES) {
    return { url, error: 'Page is too large to scan safely.', status: resp?.status() ?? null };
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact || 'minor',
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags.filter((t) => t.startsWith('wcag') || t.startsWith('best-practice')),
    nodes: v.nodes.slice(0, 50).map((n) => ({
      target: Array.isArray(n.target) ? n.target.join(' ') : String(n.target),
      html: (n.html || '').slice(0, 500),
      summary: (n.failureSummary || '').slice(0, 500),
    })),
    nodeCount: v.nodes.length,
  }));

  return {
    url,
    status: resp?.status() ?? null,
    title: await page.title().catch(() => ''),
    violations,
    counts: {
      critical: violations.filter((v) => v.impact === 'critical').length,
      serious: violations.filter((v) => v.impact === 'serious').length,
      moderate: violations.filter((v) => v.impact === 'moderate').length,
      minor: violations.filter((v) => v.impact === 'minor').length,
    },
    totalNodes: violations.reduce((s, v) => s + v.nodeCount, 0),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };
}

async function runScan(scanId, startUrl, crawl) {
  const rec = scans.get(scanId);
  try {
    const b = await getBrowser();
    const context = await b.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'AccessScan/0.1 (+local accessibility checker; https://github.com)',
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();

    rec.phase = 'loading';
    const first = await scanOnePage(page, startUrl.toString());
    const pages = [first];

    if (crawl && !first.error) {
      rec.phase = 'finding-links';
      const links = await collectSameOriginLinks(page, startUrl.toString(), MAX_PAGES - 1);
      for (const link of links) {
        rec.phase = `scanning ${pages.length + 1}/${MAX_PAGES}`;
        try {
          pages.push(await scanOnePage(page, link));
        } catch (e) {
          pages.push({ url: link, error: e.message?.slice(0, 200) || 'Scan failed' });
        }
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
  if (scanning) {
    return res.status(429).json({ error: 'A scan is already running. Please wait for it to finish.' });
  }
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!raw || raw.length > 2048) {
    return res.status(400).json({ error: 'Provide a URL to scan.' });
  }
  const { url, error } = await validateScanUrl(raw);
  if (error) return res.status(400).json({ error });

  scanning = true;
  const id = `scan_${Date.now()}_${++scanSeq}`;
  scans.set(id, { status: 'running', phase: 'queued', createdAt: Date.now() });
  const crawl = req.body?.crawl === true;

  // Fire and forget; client polls /api/scan/:id
  runScan(id, url, crawl);

  // Prune old scans (keep last 20)
  if (scans.size > 20) {
    const oldest = [...scans.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) scans.delete(oldest[0]);
  }

  res.status(202).json({ id, status: 'running' });
});

app.get('/api/scan/:id', (req, res) => {
  const rec = scans.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Unknown scan id.' });
  const out = { status: rec.status, phase: rec.phase };
  if (rec.error) out.error = rec.error;
  if (rec.result) out.result = rec.result;
  res.json(out);
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
