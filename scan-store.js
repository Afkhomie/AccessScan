// AccessScan scan store — in-memory scan records, pruning, URL normalization,
// and rule-level compare. No Playwright dependency: fully unit-testable by
// fabricating records via create() + mutating status/result directly.

const crypto = require('crypto');

const MAX_SCANS = 20;

// Normalization = origin + pathname, lowercased; query string and hash are
// ignored (they rarely change the page's accessibility profile and would
// fragment history).
function normalizeScanUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return String(raw).toLowerCase();
  }
}

// Rule identity is (rule id + page url) — rule-level, not node-level.
function toRuleMap(result) {
  const m = new Map();
  for (const p of result.pages) {
    for (const v of p.violations || []) {
      m.set(`${v.id}|${p.url}`, { id: v.id, pageUrl: p.url, impact: v.impact || 'minor' });
    }
  }
  return m;
}

function diffResults(prevRec, curRec) {
  const prevResult = prevRec.result;
  const curResult = curRec.result;
  const before = toRuleMap(prevResult);
  const after = toRuleMap(curResult);

  const addedRules = [...after.entries()]
    .filter(([k]) => !before.has(k)).map(([, v]) => v);
  const fixedRules = [...before.entries()]
    .filter(([k]) => !after.has(k)).map(([, v]) => v);
  const severityChanges = [...after.entries()]
    .filter(([k, v]) => before.has(k) && before.get(k).impact !== v.impact)
    .map(([k, v]) => ({ id: v.id, pageUrl: v.pageUrl, before: before.get(k).impact, after: v.impact }));

  return {
    comparable: true,
    previousId: prevRec.id,
    previousScannedAt: prevResult.scannedAt,
    addedRules,
    fixedRules,
    severityChanges,
    totalsBefore: prevResult.totals,
    totalsAfter: curResult.totals,
  };
}

function createScanStore({ maxScans = MAX_SCANS } = {}) {
  const scans = new Map(); // id -> { id, status, phase, result?, error?, createdAt, url, maxPages }

  function prune() {
    while (scans.size > maxScans) {
      const oldest = [...scans.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (!oldest) break;
      scans.delete(oldest[0]);
    }
  }

  return {
    // Creates a running record, prunes old scans, returns the record.
    create({ url, maxPages }) {
      // Unguessable IDs — /api/scans/:id/compare and export are unauthenticated.
      const id = `scan_${crypto.randomBytes(12).toString('hex')}`;
      const rec = { id, status: 'running', phase: 'queued', createdAt: Date.now(), url, maxPages };
      scans.set(id, rec);
      prune();
      return rec;
    },

    get(id) {
      return scans.get(id) || null;
    },

    // The "finished scans have result" invariant lives here, once.
    // Returns { rec } on success, { status, error } matching the old HTTP codes.
    getFinished(id) {
      const rec = scans.get(id);
      if (!rec) return { status: 404, error: 'Unknown scan id.' };
      if (rec.status !== 'done' || !rec.result) {
        return { status: 409, error: 'Scan is not finished yet.' };
      }
      return { rec };
    },

    // Status-poll payload for GET /api/scan/:id.
    toStatus(rec) {
      const out = { status: rec.status, phase: rec.phase };
      if (rec.error) out.error = rec.error;
      if (rec.result) out.result = rec.result;
      return out;
    },

    // Recent scans (newest first) — the /api/scans list payload shape.
    list() {
      return [...scans.values()]
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
    },

    // Compare against the nearest EARLIER finished scan of the same
    // normalized URL (createdAt strictly before this scan's), so
    // addedRules/fixedRules always read as "what changed since then".
    // Returns { comparable:false } or the diff payload; { status, error } on failure.
    compare(id) {
      const fin = this.getFinished(id);
      if (fin.error) return fin;
      const rec = fin.rec;

      const key = normalizeScanUrl(rec.url);
      let prev = null;
      for (const other of scans.values()) {
        if (other.id === rec.id || other.status !== 'done' || !other.result) continue;
        if (normalizeScanUrl(other.url) !== key) continue;
        if (other.createdAt >= rec.createdAt) continue;
        if (!prev || other.createdAt > prev.createdAt) prev = other;
      }
      if (!prev) return { comparable: false };

      return diffResults(prev, rec);
    },
  };
}

module.exports = { createScanStore, normalizeScanUrl };
