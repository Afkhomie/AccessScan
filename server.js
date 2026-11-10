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
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
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

  // axe "incomplete" = could not tell pass/fail — needs a human. Surface honestly.
  const incomplete = results.incomplete.slice(0, 50).map((i) => ({
    id: i.id,
    impact: i.impact || 'minor',
    help: i.help,
    helpUrl: i.helpUrl,
    nodeCount: i.nodes?.length || 0,
  }));

  return {
    url,
    status: resp?.status() ?? null,
    title: await page.title().catch(() => ''),
    violations,
    incomplete,
    incompleteCount: results.incomplete.length,
    counts: {
      critical: violations.filter((v) => v.impact === 'critical').length,
      serious: violations.filter((v) => v.impact === 'serious').length,
      moderate: violations.filter((v) => v.impact === 'moderate').length,
      minor: violations.filter((v) => v.impact === 'minor').length,
    },
    totalNodes: violations.reduce((s, v) => s + v.nodeCount, 0),
    passes: results.passes.length,
  };
}

async function runScan(scanId, startUrl, crawl, maxPages) {
  const rec = scans.get(scanId);
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
  if (scanning) {
    return res.status(429).json({ error: 'A scan is already running. Please wait for it to finish.' });
  }
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!raw || raw.length > 2048) {
    return res.status(400).json({ error: 'Provide a URL to scan.' });
  }
  const { url, error } = await validateScanUrl(raw);
  if (error) return res.status(400).json({ error });

  // Optional maxPages: total pages including the submitted URL, clamped 1-10.
  // Non-numeric → 400; numeric out-of-range → clamped (not an error).
  let maxPages = MAX_PAGES;
  const rawMax = req.body?.maxPages;
  if (rawMax !== undefined && rawMax !== null && rawMax !== '') {
    const n = typeof rawMax === 'number' ? rawMax : Number(rawMax);
    if (!Number.isFinite(n)) {
      return res.status(400).json({ error: 'maxPages must be a number.' });
    }
    maxPages = Math.min(MAX_PAGES_LIMIT, Math.max(1, Math.trunc(n)));
  }

  scanning = true;
  const id = `scan_${Date.now()}_${++scanSeq}`;
  scans.set(id, { id, status: 'running', phase: 'queued', createdAt: Date.now(), url: url.toString(), maxPages });
  const crawl = req.body?.crawl === true;

  // Fire and forget; client polls /api/scan/:id
  runScan(id, url, crawl, maxPages);

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

// Recent scans (newest first) — in-memory only, vanish on restart.
app.get('/api/scans', (_req, res) => {
  const list = [...scans.values()]
    .map((r) => ({
      id: r.id,
      url: r.url,
      status: r.status,
      createdAt: r.createdAt,
      scannedAt: r.result?.scannedAt || null,
      totals: r.result?.totals || null,
      error: r.error || null,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ scans: list });
});

// Compare a finished scan against the most recent OTHER finished scan of the
// same normalized URL. Normalization = origin + pathname, lowercased; query
// string and hash are ignored (they rarely change the page's accessibility
// profile and would fragment history). "Most recent" = greatest createdAt.
// Rule identity is (rule id + page url) — rule-level, not node-level.
function normalizeScanUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return String(raw).toLowerCase();
  }
}

app.get('/api/scans/:id/compare', (req, res) => {
  const rec = scans.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Unknown scan id.' });
  if (rec.status !== 'done' || !rec.result) {
    return res.status(409).json({ error: 'Scan is not finished yet.' });
  }

  const key = normalizeScanUrl(rec.url);
  let prev = null;
  for (const other of scans.values()) {
    if (other.id === rec.id || other.status !== 'done' || !other.result) continue;
    if (normalizeScanUrl(other.url) !== key) continue;
    if (!prev || other.createdAt > prev.createdAt) prev = other;
  }
  if (!prev) return res.json({ comparable: false });

  const toRuleMap = (result) => {
    const m = new Map();
    for (const p of result.pages) {
      for (const v of p.violations || []) {
        m.set(`${v.id}|${p.url}`, { id: v.id, pageUrl: p.url, impact: v.impact || 'minor' });
      }
    }
    return m;
  };
  const before = toRuleMap(prev.result);
  const after = toRuleMap(rec.result);

  const addedRules = [...after.entries()]
    .filter(([k]) => !before.has(k)).map(([, v]) => v);
  const fixedRules = [...before.entries()]
    .filter(([k]) => !after.has(k)).map(([, v]) => v);
  const severityChanges = [...after.entries()]
    .filter(([k, v]) => before.has(k) && before.get(k).impact !== v.impact)
    .map(([k, v]) => ({ id: v.id, pageUrl: v.pageUrl, before: before.get(k).impact, after: v.impact }));

  res.json({
    comparable: true,
    previousId: prev.id,
    previousScannedAt: prev.result.scannedAt,
    addedRules,
    fixedRules,
    severityChanges,
    totalsBefore: prev.result.totals,
    totalsAfter: rec.result.totals,
  });
});

// ---------- Report export ----------

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const SEV_ORDER = ['critical', 'serious', 'moderate', 'minor'];

function buildHtmlReport(rec, id) {
  const r = rec.result;
  const t = r.totals;
  const sevCounts = SEV_ORDER.map((s) => `<td class="${s}">${t[s] || 0}</td>`).join('');

  const pagesHtml = r.pages.map((p) => {
    if (p.error) {
      return `<section class="page"><h3>${escHtml(p.url)}</h3><p class="err">Could not scan this page: ${escHtml(p.error)}</p></section>`;
    }
    const violations = (p.violations || []).map((v) => {
      const nodes = (v.nodes || []).slice(0, 10).map((n) => `
        <div class="node">
          <div class="target">${escHtml(n.target || '(no selector)')}</div>
          <pre>${escHtml(n.html || '')}</pre>
          ${n.summary ? `<div class="why">${escHtml(n.summary)}</div>` : ''}
        </div>`).join('');
      const more = (v.nodeCount || 0) > 10
        ? `<p class="meta">…and ${(v.nodeCount || 0) - 10} more element(s) with this issue.</p>` : '';
      const tags = (v.tags || []).map((tag) => `<span class="tag">${escHtml(tag)}</span>`).join(' ');
      return `
      <div class="violation">
        <h4><span class="badge ${escHtml(v.impact || 'minor')}">${escHtml(v.impact || 'minor')}</span> ${escHtml(v.help || v.id)}</h4>
        <p class="desc">${escHtml(v.description || '')}</p>
        <p class="meta">Rule: ${escHtml(v.id)}${v.helpUrl ? ` · <a href="${escHtml(v.helpUrl)}">reference</a>` : ''} ${tags}</p>
        ${nodes}${more}
      </div>`;
    }).join('') || '<p class="clean">No violations found by the rules axe ran on this page.</p>';

    const incomplete = (p.incompleteCount || 0) > 0 ? `
      <div class="review">
        <h4>Needs manual review (${p.incompleteCount} rule${p.incompleteCount === 1 ? '' : 's'})</h4>
        <p class="meta">axe could not determine pass/fail automatically. Check these by hand.</p>
        <ul>${(p.incomplete || []).map((i) => `<li><strong>${escHtml(i.help || i.id)}</strong> — ${i.nodeCount || 0} element(s)${i.helpUrl ? ` · <a href="${escHtml(i.helpUrl)}">reference</a>` : ''}</li>`).join('')}</ul>
      </div>` : '';

    return `<section class="page">
      <h3>${escHtml(p.url)}</h3>
      <p class="meta">HTTP ${p.status ?? '—'} · "${escHtml(p.title || '')}" · ${p.passes || 0} checks passed</p>
      ${incomplete}
      ${violations}
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AccessScan report — ${escHtml(rec.url)}</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1a2332;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.55}
  h1{font-size:1.6rem} h2{font-size:1.2rem;margin-top:2em} h3{font-size:1.05rem;word-break:break-all}
  h4{margin:1em 0 .3em;font-size:.95rem}
  .disclaimer{background:#e8effa;border:1px solid #c9d8f2;border-radius:8px;padding:14px 18px;font-size:.9rem}
  table{border-collapse:collapse;margin:12px 0} td,th{border:1px solid #dfe4ec;padding:6px 14px;text-align:left}
  td.critical,td.serious{font-weight:700}
  .page{border-top:2px solid #dfe4ec;padding-top:8px;margin-top:28px}
  .violation{background:#fff;border:1px solid #dfe4ec;border-radius:8px;padding:12px 16px;margin:12px 0}
  .badge{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:999px;color:#fff}
  .badge.critical{background:#b3261e}.badge.serious{background:#b25e09}.badge.moderate{background:#8a6d00}.badge.minor{background:#5b6472}
  .desc{color:#4a5568;font-size:.92rem;margin:.4em 0}
  .meta{font-size:.82rem;color:#4a5568}
  .node{margin:10px 0;padding:8px 10px;background:#f6f8fb;border:1px solid #dfe4ec;border-radius:6px}
  .target{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.8rem;word-break:break-all}
  pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.78rem;white-space:pre-wrap;word-break:break-all;margin:4px 0}
  .why{font-size:.8rem;color:#4a5568}
  .review{background:#fdf6dd;border:1px solid #ece0b3;border-radius:8px;padding:12px 16px;margin:12px 0}
  .tag{font-family:ui-monospace,monospace;font-size:.72rem;background:#e8effa;color:#1f4e8c;border-radius:4px;padding:1px 6px}
  .err{color:#b3261e}.clean{color:#1e6b3a}
  a{color:#1f4e8c}
  @media print{body{margin:0;max-width:none} .page{break-inside:avoid}}
</style></head><body>
<h1>Accessibility scan report</h1>
<p class="meta">Scanned <strong>${escHtml(rec.url)}</strong> · ${escHtml(r.scannedAt)} · ${r.pages.length} page(s)${r.crawled ? ' (included same-site links)' : ''} · generated by AccessScan</p>
<div class="disclaimer"><strong>Honest disclaimer:</strong> automated scans find roughly <strong>30–57%</strong> of WCAG issues (per Deque's research). This report is a fast first pass, not a compliance guarantee — and EAA enforcement is live in the EU. Manual review is required for real assurance.</div>
<h2>Summary</h2>
<table><tr><th></th><th>Critical</th><th>Serious</th><th>Moderate</th><th>Minor</th></tr>
<tr><td><strong>${t.rules || 0} rule check(s) failed</strong> across ${t.nodes || 0} element(s) — counted per page</td>${sevCounts}</tr></table>
<p class="meta">axe also passed ${t.passes || 0} checks and flagged ${t.incomplete || 0} rule(s) needing manual review.</p>
${pagesHtml}
<p class="meta" style="margin-top:2em">Report id: ${escHtml(id)} · AccessScan — local-first, MIT licensed.</p>
</body></html>`;
}

app.get('/api/scan/:id/export', async (req, res) => {
  const rec = scans.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Unknown scan id.' });
  if (rec.status !== 'done' || !rec.result) {
    return res.status(409).json({ error: 'Scan is not finished yet.' });
  }
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
