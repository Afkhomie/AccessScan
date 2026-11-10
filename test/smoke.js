// Smoke test for scan-store — no Playwright needed; fabricate scan records.
// Run: node test/smoke.js
'use strict';
const assert = require('assert');
const { createScanStore, normalizeScanUrl } = require('../scan-store');
const { mapAxeResults } = require('../axe-map');

const store = createScanStore({ maxScans: 5 });

function fakeResult(violations, scannedAt = '2025-01-01T00:00:00Z') {
  return {
    scannedAt,
    crawled: false,
    pages: [{
      url: 'https://example.com/', status: 200, title: 'T',
      violations, incomplete: [], incompleteCount: 0, passes: 10, totalNodes: 2,
      counts: { critical: 0, serious: 0, moderate: 0, minor: violations.length },
    }],
    totals: { rules: violations.length, nodes: 2, critical: 0, serious: 0, moderate: 0, minor: violations.length },
    passes: 10, incomplete: 0,
  };
}
const v = (id, impact) => ({ id, impact, nodes: [{ target: 'a', html: '<a>', summary: 'x' }], nodeCount: 1 });

// 404 unknown / 409 not finished
assert.strictEqual(store.compare('nope').status, 404);
const running = store.create({ url: 'https://example.com/', maxPages: 1 });
assert.strictEqual(store.compare(running.id).status, 409);
assert.strictEqual(store.getFinished('nope').status, 404);
assert.strictEqual(store.getFinished(running.id).status, 409);

// First finished scan of a URL → comparable:false
running.status = 'done';
running.result = fakeResult([v('rule-a', 'serious')]);
assert.deepStrictEqual(store.compare(running.id), { comparable: false });

// Second finished scan, same normalized URL (query differs → still matches)
running.createdAt -= 1000; // ensure it's the "previous" one
const second = store.create({ url: 'https://example.com/?utm=1', maxPages: 1 });
second.status = 'done';
second.result = fakeResult([
  v('rule-a', 'critical'),   // severity change serious→critical
  v('rule-b', 'minor'),      // added
], '2025-01-02T00:00:00Z');
// rule-a was in first scan; need it there too — first scan only had rule-a. OK.

const diff = store.compare(second.id);
assert.strictEqual(diff.comparable, true);
assert.strictEqual(diff.previousId, running.id);
assert.strictEqual(diff.addedRules.length, 1);
assert.strictEqual(diff.addedRules[0].id, 'rule-b');
assert.strictEqual(diff.fixedRules.length, 0);
assert.deepStrictEqual(diff.severityChanges, [
  { id: 'rule-a', pageUrl: 'https://example.com/', before: 'serious', after: 'critical' },
]);

// Different URL → not comparable
const other = store.create({ url: 'https://other.com/', maxPages: 1 });
other.status = 'done';
other.result = fakeResult([]);
assert.deepStrictEqual(store.compare(other.id), { comparable: false });

// list() shape + pruning (maxScans=5; we have 3, add 3 more → oldest pruned)
for (let i = 0; i < 3; i++) {
  const r = store.create({ url: `https://p${i}.com/`, maxPages: 1 });
  r.status = 'done'; r.result = fakeResult([]);
}
const list = store.list();
assert.strictEqual(list.length, 5);
assert.ok(list.every((s) => s.id && s.url && 'status' in s && 'createdAt' in s));
assert.ok(!list.some((s) => s.id === running.id), 'oldest scan should be pruned');

// normalizeScanUrl
assert.strictEqual(normalizeScanUrl('HTTPS://Example.COM/path?x=1#h'), 'https://example.com/path');

// mapAxeResults pure mapping
const mapped = mapAxeResults({
  violations: [{ id: 'r1', impact: 'serious', description: 'd', help: 'h', helpUrl: 'u',
    tags: ['wcag2aa', 'cat.sensory'], nodes: Array.from({ length: 60 }, () => ({ target: ['a'], html: '<a>', failureSummary: 'f' })) }],
  incomplete: [{ id: 'i1', impact: 'minor', help: 'ih', helpUrl: 'iu', nodes: [{}] }],
  passes: [{}, {}],
}, { url: 'https://x.com/', status: 200, title: 'X' });
assert.strictEqual(mapped.violations[0].nodes.length, 50); // capped
assert.strictEqual(mapped.violations[0].nodeCount, 60);
assert.strictEqual(mapped.violations[0].tags.length, 1); // non-wcag/bp tag filtered
assert.strictEqual(mapped.incompleteCount, 1);
assert.strictEqual(mapped.counts.serious, 1);
assert.strictEqual(mapped.totalNodes, 60);
assert.strictEqual(mapped.passes, 2);

console.log('smoke: all assertions passed');
