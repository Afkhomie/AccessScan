// Extended smoke tests for AccessScan — no Playwright, no network, no deps.
// Covers what test/smoke.js misses: axe-map edge cases, report rendering
// (escaping, ordering, empty states), scan-store compare chains/pruning,
// and the SSRF URL guard extracted from server.js (which can't be require()d
// because it auto-listens and pulls in Playwright).
// Run: node test/smoke2.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createScanStore, normalizeScanUrl } = require('../scan-store');
const { mapAxeResults } = require('../axe-map');
const { buildHtmlReport, escHtml, SEV_ORDER } = require('../report');

// ---------- SSRF guard extraction (server.js is not requirable) ----------
// isPrivateIp + validateScanUrl are self-contained; slice them out of the
// real source so we test the shipped code, not a copy.
const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const gStart = serverSrc.indexOf('function isPrivateIp');
const gEnd = serverSrc.indexOf('// ---------- Rate limiting');
assert.ok(gStart > -1 && gEnd > gStart, 'could not locate SSRF guard in server.js');
const { isPrivateIp, validateScanUrl } = new Function(
  'dns', 'net',
  `${serverSrc.slice(gStart, gEnd)}\nreturn { isPrivateIp, validateScanUrl };`
)(require('dns').promises, require('net'));

// ---------- helpers ----------
const v = (id, impact, pageUrl = 'https://a.com/') => ({
  id, impact, pageUrl,
  nodes: [{ target: 'a', html: '<a>', summary: 'x' }],
});
function fakeResult(violations, scannedAt = '2025-01-01T00:00:00Z', pageUrl = 'https://a.com/') {
  return {
    scannedAt, crawled: false,
    pages: [{
      url: pageUrl, status: 200, title: 'T',
      violations, incomplete: [], incompleteCount: 0, passes: 10, totalNodes: 0,
      counts: { critical: 0, serious: 0, moderate: 0, minor: violations.length },
    }],
    totals: { rules: violations.length, nodes: 0, critical: 0, serious: 0, moderate: 0, minor: violations.length },
    passes: 10, incomplete: 0,
  };
}

// ================= mapAxeResults =================

// Empty input → all zeros, no crash.
{
  const m = mapAxeResults({ violations: [], incomplete: [], passes: [] },
    { url: 'https://x/', status: 200, title: 'X' });
  assert.deepStrictEqual(m.violations, []);
  assert.deepStrictEqual(m.incomplete, []);
  assert.strictEqual(m.incompleteCount, 0);
  assert.deepStrictEqual(m.counts, { critical: 0, serious: 0, moderate: 0, minor: 0 });
  assert.strictEqual(m.totalNodes, 0);
  assert.strictEqual(m.passes, 0);
  assert.strictEqual(m.url, 'https://x/');
  assert.strictEqual(m.status, 200);
  assert.strictEqual(m.title, 'X');
}

// Node cap boundary: exactly 50 stays 50; 51 trims to 50 but nodeCount keeps 51.
{
  const mk = (n) => ({
    id: 'r', impact: 'minor', description: 'd', help: 'h', helpUrl: 'u',
    tags: ['wcag2a'],
    nodes: Array.from({ length: n }, (_, i) => ({ target: `#n${i}`, html: '<p>', failureSummary: 'f' })),
  });
  const m50 = mapAxeResults({ violations: [mk(50)], incomplete: [], passes: [] }, { url: 'u', status: 200, title: 't' });
  assert.strictEqual(m50.violations[0].nodes.length, 50);
  assert.strictEqual(m50.violations[0].nodeCount, 50);
  const m51 = mapAxeResults({ violations: [mk(51)], incomplete: [], passes: [] }, { url: 'u', status: 200, title: 't' });
  assert.strictEqual(m51.violations[0].nodes.length, 50);
  assert.strictEqual(m51.violations[0].nodeCount, 51);
  assert.strictEqual(m51.totalNodes, 51); // totalNodes uses untrimmed count
}

// Incomplete list caps at 50 entries; incompleteCount reports the true length.
{
  const inc = Array.from({ length: 60 }, (_, i) => ({ id: `i${i}`, impact: 'minor', help: 'h', nodes: [{}] }));
  const m = mapAxeResults({ violations: [], incomplete: inc, passes: [] }, { url: 'u', status: 200, title: 't' });
  assert.strictEqual(m.incomplete.length, 50);
  assert.strictEqual(m.incompleteCount, 60);
  assert.strictEqual(m.incomplete[0].nodeCount, 1);
}

// Counts math across impacts; missing impact defaults to 'minor'.
{
  const m = mapAxeResults({
    violations: [
      { id: 'c', impact: 'critical', tags: [], nodes: [{ target: 'a' }] },
      { id: 's1', impact: 'serious', tags: [], nodes: [{}, {}] },
      { id: 's2', impact: 'serious', tags: [], nodes: [{ target: 'b', html: 'x', failureSummary: 'y' }] },
      { id: 'mo', impact: 'moderate', tags: [], nodes: [] },
      { id: 'noimpact', tags: [], nodes: [{}] }, // impact missing → 'minor'
    ],
    incomplete: [], passes: [{}],
  }, { url: 'u', status: 200, title: 't' });
  assert.deepStrictEqual(m.counts, { critical: 1, serious: 2, moderate: 1, minor: 1 });
  assert.strictEqual(m.totalNodes, 5);
  assert.strictEqual(m.violations[4].impact, 'minor');
  assert.strictEqual(m.passes, 1);
}

// Weird node shapes: missing target/html/failureSummary, array vs string target,
// html/summary sliced at 500 chars.
{
  const long = 'x'.repeat(600);
  const m = mapAxeResults({
    violations: [{
      id: 'r', impact: 'minor', tags: ['wcag2a', 'best-practice', 'ACT', 'cat.text'],
      nodes: [
        {},                                                        // everything missing
        { target: ['#a', ' .b'], html: long, failureSummary: long }, // array target, overlong fields
        { target: '#plain', html: null, failureSummary: undefined },
      ],
    }],
    incomplete: [{ id: 'i', impact: null, help: 'ih', nodes: null }], // nodes:null → nodeCount 0
    passes: [],
  }, { url: 'u', status: 200, title: 't' });
  const nodes = m.violations[0].nodes;
  assert.strictEqual(nodes[0].target, 'undefined'); // String(undefined) — documents quirk
  assert.strictEqual(nodes[0].html, '');
  assert.strictEqual(nodes[0].summary, '');
  assert.strictEqual(nodes[1].target, '#a  .b'); // array joined with space
  assert.strictEqual(nodes[1].html.length, 500);
  assert.strictEqual(nodes[1].summary.length, 500);
  assert.strictEqual(nodes[2].target, '#plain');
  assert.strictEqual(nodes[2].html, '');
  assert.strictEqual(nodes[2].summary, '');
  assert.deepStrictEqual(m.violations[0].tags, ['wcag2a', 'best-practice']); // ACT/cat.text filtered
  assert.strictEqual(m.incomplete[0].nodeCount, 0);
  assert.strictEqual(m.incomplete[0].impact, 'minor'); // null impact → 'minor'
}

// ================= buildHtmlReport =================

// escHtml unit checks.
assert.strictEqual(escHtml(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
assert.strictEqual(escHtml(null), '');
assert.strictEqual(escHtml(undefined), '');
assert.strictEqual(escHtml(42), '42');
assert.deepStrictEqual(SEV_ORDER, ['critical', 'serious', 'moderate', 'minor']);

function reportRec(overrides = {}) {
  return {
    url: 'https://example.com/',
    result: {
      scannedAt: '2025-01-01T00:00:00Z', crawled: false,
      totals: { rules: 1, nodes: 12, critical: 1, serious: 0, moderate: 0, minor: 0, passes: 5, incomplete: 1 },
      pages: [{
        url: 'https://example.com/', status: 200, title: 'Home', passes: 5,
        violations: [{
          id: 'v1', impact: 'critical', description: 'desc', help: 'help text',
          helpUrl: 'https://deque.com/rules/v1', tags: ['wcag2a'], nodeCount: 12,
          nodes: [{ target: '#img', html: '<img src=x>', summary: 'missing alt' }],
        }],
        incomplete: [{ id: 'i1', impact: 'minor', help: 'ih', helpUrl: 'https://deque.com/i1', nodeCount: 2 }],
        incompleteCount: 1,
      }],
      ...overrides,
    },
  };
}

{
  const html = buildHtmlReport(reportRec(), 'report-id-1');
  assert.ok(html.includes('Honest disclaimer'), 'disclaimer present');
  assert.ok(html.includes('30–57%'), 'disclaimer cites Deque range');
  assert.ok(html.includes('<title>AccessScan report — https://example.com/</title>'));
  assert.ok(html.includes('Report id: report-id-1'));
  assert.ok(html.includes('1 rule check(s) failed'));
  assert.ok(html.includes('12 element(s)'));
  // severity column order in summary table
  const iC = html.indexOf('>Critical');
  const iS = html.indexOf('>Serious');
  const iM = html.indexOf('>Moderate');
  const iN = html.indexOf('>Minor');
  assert.ok(iC > -1 && iC < iS && iS < iM && iM < iN, 'severity columns ordered critical→minor');
  // nodeCount 12 but only 1 node rendered → "and N more" note (10 shown max)
  assert.ok(html.includes('…and 2 more element(s) with this issue.'));
  // incomplete section, singular "rule"
  assert.ok(html.includes('Needs manual review (1 rule)'));
  assert.ok(!html.includes('Needs manual review (1 rules)'));
  // badge + helpUrl rendered
  assert.ok(html.includes('badge critical'));
  assert.ok(html.includes('href="https://deque.com/rules/v1"'));
}

// Escaping: inject markup into every user-controlled field.
{
  const evil = {
    url: 'https://evil.example/<script>alert(1)</script>',
    result: {
      scannedAt: '2025-01-01', crawled: true,
      totals: { rules: 1, nodes: 1, critical: 0, serious: 0, moderate: 0, minor: 1, passes: 0, incomplete: 0 },
      pages: [{
        url: 'https://evil.example/', status: 200,
        title: '<script>alert(2)</script>', passes: 0,
        violations: [{
          id: '<script>alert(3)</script>', impact: 'minor',
          description: '<img src=x onerror=alert(4)>', help: '<b>bold</b>',
          helpUrl: 'https://example.com/?q=<script>', tags: ['<script>'], nodeCount: 1,
          nodes: [{ target: '<script>', html: '<script>alert(5)</script>', summary: '<script>' }],
        }],
        incomplete: [{ id: 'i', impact: 'minor', help: '<script>', helpUrl: 'u', nodeCount: 1 }],
        incompleteCount: 1,
      }],
    },
  };
  const html = buildHtmlReport(evil, 'id');
  assert.ok(!html.includes('<script>'), 'no raw <script> anywhere in report');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(4)&gt;'));
  assert.ok(html.includes('href="https://example.com/?q=&lt;script&gt;"'));
  assert.ok(html.includes('(included same-site links)')); // crawled flag
}

// Empty-result page → clean message; page error → error block; empty totals.
{
  const rec = {
    url: 'https://empty.example/',
    result: {
      scannedAt: '2025-01-01', crawled: false,
      totals: { rules: 0, nodes: 0, critical: 0, serious: 0, moderate: 0, minor: 0, passes: 9, incomplete: 0 },
      pages: [
        { url: 'https://empty.example/', status: 200, title: 'Clean', passes: 9, violations: [], incomplete: [], incompleteCount: 0 },
        { url: 'https://empty.example/dead', status: null, error: 'net::ERR_FAILED', violations: [] },
      ],
    },
  };
  const html = buildHtmlReport(rec, 'id');
  assert.ok(html.includes('No violations found by the rules axe ran on this page.'));
  assert.ok(html.includes('Could not scan this page: net::ERR_FAILED'));
  assert.ok(html.includes('0 rule check(s) failed'));
  assert.ok(!html.includes('Needs manual review'));
  // error page renders only the error block (no status/passes meta line)
  assert.ok(!html.includes('HTTP —'));
}

// ================= scan-store =================

// normalizeScanUrl edge cases.
assert.strictEqual(normalizeScanUrl('HTTPS://Example.COM/Path?x=1#h'), 'https://example.com/path');
assert.strictEqual(normalizeScanUrl('https://example.com'), 'https://example.com/'); // adds /
assert.strictEqual(normalizeScanUrl('not a url'), 'not a url');                        // unparseable → lowercase raw
assert.strictEqual(normalizeScanUrl(''), '');
assert.strictEqual(normalizeScanUrl('ftp://X.com/A'), 'ftp://x.com/a');                // non-http scheme kept
assert.strictEqual(normalizeScanUrl('https://a.com/x#frag'), 'https://a.com/x');      // hash dropped

// A→B→C chain on same URL: each compares to its IMMEDIATE predecessor.
{
  const store = createScanStore({ maxScans: 10 });
  const mk = (rules, scannedAt, createdAt) => {
    const rec = store.create({ url: 'https://chain.example/', maxPages: 1 });
    rec.status = 'done';
    rec.result = fakeResult(rules, scannedAt);
    rec.createdAt = createdAt;
    return rec;
  };
  const A = mk([v('r1', 'minor')], '2025-01-01T00:00:00Z', 1000);
  const B = mk([v('r1', 'minor'), v('r2', 'minor')], '2025-01-02T00:00:00Z', 2000);
  const C = mk([v('r2', 'minor')], '2025-01-03T00:00:00Z', 3000);

  const dB = store.compare(B.id);
  assert.strictEqual(dB.previousId, A.id, 'B compares to A');
  assert.deepStrictEqual(dB.addedRules.map((r) => r.id), ['r2']);
  assert.deepStrictEqual(dB.fixedRules, []);

  const dC = store.compare(C.id);
  assert.strictEqual(dC.previousId, B.id, 'C compares to B, not A');
  assert.deepStrictEqual(dC.fixedRules.map((r) => r.id), ['r1'], 'r1 fixed between B→C');
  assert.deepStrictEqual(dC.addedRules, []);

  // Same ruleset diffed against A would show added=[r2] fixed=[] — prove we didn't diff A→C.
  assert.notDeepStrictEqual(dC.addedRules.map((r) => r.id), ['r2']);
}

// Same normalized URL despite query/hash/case differences.
{
  const store = createScanStore({ maxScans: 10 });
  const a = store.create({ url: 'HTTPS://Same.Example.com/Page?utm=1', maxPages: 1 });
  a.status = 'done'; a.result = fakeResult([v('r1', 'minor')]); a.createdAt = 1;
  const b = store.create({ url: 'https://same.example.com/page#section', maxPages: 1 });
  b.status = 'done'; b.result = fakeResult([v('r1', 'minor'), v('r2', 'minor')]); b.createdAt = 2;
  const d = store.compare(b.id);
  assert.strictEqual(d.comparable, true);
  assert.strictEqual(d.previousId, a.id);
}

// Different path → NOT comparable even on same origin.
{
  const store = createScanStore({ maxScans: 10 });
  const a = store.create({ url: 'https://diff.example/a', maxPages: 1 });
  a.status = 'done'; a.result = fakeResult([v('r1', 'minor')]); a.createdAt = 1;
  const b = store.create({ url: 'https://diff.example/b', maxPages: 1 });
  b.status = 'done'; b.result = fakeResult([v('r1', 'minor')]); b.createdAt = 2;
  assert.deepStrictEqual(store.compare(b.id), { comparable: false });
}

// Failed/running/done-without-result scans are excluded as predecessors.
{
  const store = createScanStore({ maxScans: 10 });
  const failed = store.create({ url: 'https://f.example/', maxPages: 1 });
  failed.status = 'error'; failed.error = 'boom';
  failed.result = fakeResult([v('x', 'minor')]); // even WITH a result, status gate excludes it
  const running = store.create({ url: 'https://f.example/', maxPages: 1 }); // stays 'running'
  const noResult = store.create({ url: 'https://f.example/', maxPages: 1 });
  noResult.status = 'done'; // done but result never set
  const ok = store.create({ url: 'https://f.example/', maxPages: 1 });
  ok.status = 'done'; ok.result = fakeResult([v('y', 'minor')]);

  assert.strictEqual(store.compare(noResult.id).status, 409, 'done-without-result → 409');
  assert.strictEqual(store.compare(running.id).status, 409);
  const d = store.compare(ok.id);
  assert.deepStrictEqual(d, { comparable: false }, 'no valid predecessor → not comparable');
}

// Pruning at exactly maxScans and one past it.
{
  const store = createScanStore({ maxScans: 3 });
  const r1 = store.create({ url: 'https://p1.example/', maxPages: 1 }); r1.createdAt = 1;
  const r2 = store.create({ url: 'https://p2.example/', maxPages: 1 }); r2.createdAt = 2;
  const r3 = store.create({ url: 'https://p3.example/', maxPages: 1 }); r3.createdAt = 3;
  assert.strictEqual(store.list().length, 3, 'at capacity: nothing pruned');
  assert.ok(store.get(r1.id) && store.get(r2.id) && store.get(r3.id));

  const r4 = store.create({ url: 'https://p4.example/', maxPages: 1 }); r4.createdAt = 4;
  assert.strictEqual(store.list().length, 3, 'over capacity: pruned back to max');
  assert.strictEqual(store.get(r1.id), null, 'oldest pruned');
  assert.ok(store.get(r2.id) && store.get(r3.id) && store.get(r4.id));
}

// toStatus / getFinished shapes.
{
  const store = createScanStore();
  const rec = store.create({ url: 'https://s.example/', maxPages: 1 });
  assert.deepStrictEqual(store.toStatus(rec), { status: 'running', phase: 'queued' });
  rec.status = 'error'; rec.error = 'fail';
  assert.deepStrictEqual(store.toStatus(rec), { status: 'error', phase: 'queued', error: 'fail' });
  assert.strictEqual(store.getFinished(rec.id).status, 409);
  rec.status = 'done'; rec.result = fakeResult([]);
  const fin = store.getFinished(rec.id);
  assert.strictEqual(fin.rec, rec);
  const st = store.toStatus(rec);
  assert.strictEqual(st.result, rec.result);
  assert.strictEqual(store.get('nope'), null);
  assert.strictEqual(store.getFinished('nope').error, 'Unknown scan id.');
}

// ================= validateScanUrl / isPrivateIp (extracted, no network) =================

(async () => {
  // isPrivateIp direct checks
  assert.strictEqual(isPrivateIp('10.0.0.1'), true);
  assert.strictEqual(isPrivateIp('127.0.0.1'), true);
  assert.strictEqual(isPrivateIp('169.254.169.254'), true);   // cloud metadata
  assert.strictEqual(isPrivateIp('172.16.0.1'), true);
  assert.strictEqual(isPrivateIp('172.15.0.1'), false);        // just outside 172.16/12
  assert.strictEqual(isPrivateIp('192.168.1.1'), true);
  assert.strictEqual(isPrivateIp('100.64.0.1'), true);         // CGNAT
  assert.strictEqual(isPrivateIp('8.8.8.8'), false);
  assert.strictEqual(isPrivateIp('::1'), true);
  assert.strictEqual(isPrivateIp('fd00::1'), true);            // ULA
  assert.strictEqual(isPrivateIp('fe80::1'), true);            // link-local
  assert.strictEqual(isPrivateIp('::ffff:10.0.0.1'), true);    // v4-mapped
  assert.strictEqual(isPrivateIp('2001:4860:4860::8888'), false); // public v6
  assert.strictEqual(isPrivateIp('not-an-ip'), true);          // unparseable → unsafe

  // validateScanUrl — cases that resolve before any DNS lookup (fully offline)
  const bad = async (raw, expected) => {
    const r = await validateScanUrl(raw);
    assert.ok(r.error, `expected error for ${raw}`);
    assert.strictEqual(r.error, expected, `wrong error for ${raw}`);
  };

  await bad('', 'That does not look like a valid URL.');
  await bad('javascript:alert(1)', 'That does not look like a valid URL.'); // no // → https://javascript:alert(1) → bad port
  await bad('file:///etc/passwd', 'Only http:// and https:// URLs can be scanned.');
  await bad('ftp://example.com/', 'Only http:// and https:// URLs can be scanned.');

  for (const h of [
    'localhost', 'foo.localhost', 'printer.local', 'nas.lan',
    'server.internal', 'box.home', 'metadata.google.internal',
  ]) {
    await bad(`http://${h}/`, 'Local/internal hostnames are not allowed.');
  }

  for (const ip of [
    '127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5',
    '169.254.169.254', '100.64.0.1', '224.0.0.1',
    '[::1]', '[fd12::1]', '[fe80::1]', '[::ffff:127.0.0.1]',
  ]) {
    await bad(`http://${ip}/`, 'Private/internal IP addresses are not allowed.');
  }

  // Public IP literals succeed with NO DNS involved.
  for (const [raw, proto] of [
    ['http://8.8.8.8/', 'http:'],
    ['8.8.8.8', 'https:'],                       // bare → scheme-less normalization to https
    ['http://[2606:4700:4700::1111]/', 'http:'], // public v6 literal
    ['  http://8.8.8.8:8080/path?q=1  ', 'http:'], // whitespace trimmed, port/path kept
  ]) {
    const r = await validateScanUrl(raw);
    assert.ok(r.url, `expected success for ${raw}, got ${JSON.stringify(r)}`);
    assert.strictEqual(r.url.protocol, proto, `protocol for ${raw}`);
    assert.strictEqual(r.url.hostname.replace(/^\[|\]$/g, ''), raw.includes('2606') ? '2606:4700:4700::1111' : '8.8.8.8');
  }
  // bare '8.8.8.8' proves scheme-less → https; check href explicitly
  {
    const r = await validateScanUrl('8.8.8.8');
    assert.strictEqual(r.url.href, 'https://8.8.8.8/');
  }

  // Hostnames that pass all pre-DNS checks: outcome depends on network.
  // Offline → 'Could not resolve'; online → { url } with https for bare input.
  for (const [raw, wantProto] of [['example.com', 'https:'], ['http://example.com/x', 'http:']]) {
    const r = await validateScanUrl(raw);
    if (r.url) {
      assert.strictEqual(r.url.protocol, wantProto, `protocol for ${raw}`);
    } else {
      assert.strictEqual(r.error, 'Could not resolve that hostname.',
        `unexpected pre-DNS rejection for ${raw}: ${r.error}`);
    }
  }

  console.log('smoke2: all assertions passed');
})().catch((e) => { console.error(e); process.exit(1); });
