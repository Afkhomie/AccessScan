/* AccessScan frontend — vanilla JS, polls the local API. */

const form = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const crawlInput = document.getElementById('crawl-input');
const maxPagesInput = document.getElementById('maxpages-input');
const formError = document.getElementById('form-error');
const progress = document.getElementById('progress');
const progressPhase = document.getElementById('progress-phase');
const progressSub = document.getElementById('progress-sub');
const progressPct = document.getElementById('progress-pct');
const progressFill = document.getElementById('progress-fill');
const results = document.getElementById('results');
const resultsBody = document.getElementById('results-body');
const newScanBtn = document.getElementById('new-scan');
const exportHtml = document.getElementById('export-html');
const exportJson = document.getElementById('export-json');
const exportPdf = document.getElementById('export-pdf');
const recentSection = document.getElementById('recent');
const recentList = document.getElementById('recent-list');
const scanStatus = document.getElementById('scan-status');

// Announce state changes to screen readers, then move focus to the report.
function announceScan(msg) {
  if (scanStatus) {
    scanStatus.textContent = '';
    scanStatus.textContent = msg;
  }
  if (!results.hidden) results.focus();
}

const PHASE_LABELS = {
  queued: 'Queued…',
  loading: 'Loading page in a real browser…',
  'finding-links': 'Finding same-site links…',
  done: 'Done',
  error: 'Scan failed',
};
const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

// rules-data.js loads before this file and exposes a top-level `const RULES`
// (classic-script global lexical binding) — id → fix guidance lookup.
const RULE_LOOKUP = (() => {
  const m = new Map();
  try {
    if (typeof RULES !== 'undefined') for (const r of RULES) m.set(r.id, r);
  } catch { /* rules data optional — fall back to axe's own text */ }
  return m;
})();
const sevRank = (impact) => {
  const i = SEVERITIES.indexOf(impact || 'minor');
  return i === -1 ? SEVERITIES.length : i;
};

let currentScanId = null;
let lastReportId = null;
let pollTimer = null;
let pollFailures = 0;
let scanStartedAt = 0;
let slowHintShown = false;
let ui = { activePage: 0, severity: 'all', query: '' };

// JS smooth-scroll ignores prefers-reduced-motion; honor it manually.
const smoothScroll = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

function setBusy(busy) {
  scanBtn.disabled = busy;
  scanBtn.textContent = busy ? 'Scanning…' : 'Scan';
  progress.hidden = !busy;
}

function fmtPhase(phase) {
  if (PHASE_LABELS[phase]) return PHASE_LABELS[phase];
  if (typeof phase === 'string' && phase.startsWith('scanning')) {
    return `Scanning linked page (${phase.replace('scanning ', '')})…`;
  }
  return 'Working…';
}

// Map server phase strings to a rough percentage for the progress bar.
function phaseToPct(phase) {
  if (phase === 'queued' || phase === 'loading') return 10;
  if (phase === 'finding-links') return 20;
  if (typeof phase === 'string' && phase.startsWith('scanning')) {
    const m = /scanning (\d+)\/(\d+)/.exec(phase);
    if (m && +m[2] > 0) return Math.min(95, Math.round(20 + (75 * +m[1]) / +m[2]));
    return 45;
  }
  return 8;
}

function setProgress(phase) {
  progressPhase.textContent = fmtPhase(phase);
  const pct = phaseToPct(phase);
  progressPct.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
}

// User-facing error text — never leak raw HTTP codes like "502".
function friendlyHttpError(res, data) {
  if (res.status === 429) {
    return `A scan is already running. ${data.error || 'Please wait for it to finish, then try again.'}`;
  }
  if (res.status >= 500) {
    return 'Something went wrong on our side — the service may be waking up. Please try again in a minute.';
  }
  return data.error || 'Something went wrong. Please try again.';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function startScan(url, crawl, maxPages) {
  showError('');
  setBusy(true);
  progressPhase.textContent = 'Starting scan…';
  progressPct.textContent = '0%';
  progressFill.style.width = '0%';
  progressSub.textContent = 'This can take up to a minute on slow sites.';
  scanStartedAt = Date.now();
  slowHintShown = false;

  let res;
  try {
    res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, crawl, maxPages: crawl ? maxPages : undefined }),
    });
  } catch {
    setBusy(false);
    showError('Could not reach the local server. Is it still running?');
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setBusy(false);
    showError(friendlyHttpError(res, data));
    return;
  }

  currentScanId = data.id;
  addHistoryEntry(data.id, url);
  pollFailures = 0;
  pollTimer = setInterval(pollScan, 900);
  pollScan();
}

// Give up polling and show an inline error the user can act on.
function abortScan(msg) {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  currentScanId = null;
  pollFailures = 0;
  setBusy(false);
  results.hidden = false;
  resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>Scan interrupted.</strong> ${esc(msg)}</div>`;
  announceScan(`Scan interrupted: ${msg}`);
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
}

async function pollScan() {
  if (!currentScanId) return;
  let data;
  try {
    const res = await fetch(`/api/scan/${currentScanId}`);
    if (!res.ok) {
      abortScan(res.status === 404
        ? 'The scan result expired before it finished (the server keeps only recent scans). Start a new scan to try again.'
        : res.status >= 500
          ? 'The service hiccuped while checking progress. Please try again in a moment.'
          : `Something went wrong while checking scan status. Try again in a moment.`);
      return;
    }
    data = await res.json();
  } catch {
    // Transient network hiccup — tolerate a few, then give up.
    pollFailures += 1;
    if (pollFailures >= 5) {
      abortScan('Lost connection to the local server. Check that it is still running, then try again.');
    }
    return;
  }
  pollFailures = 0;

  // After 60s, gently warn that the scan is slower than usual (server caps ~3min).
  if (!slowHintShown && Date.now() - scanStartedAt > 60_000) {
    slowHintShown = true;
    progressSub.textContent = 'Still working. This one is taking longer than usual.';
  }
  setProgress(data.phase);

  if (data.status === 'done') {
    const doneId = currentScanId;
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    const nRules = data.result?.totals?.rules || 0;
    updateHistoryEntry(doneId, { label: `${nRules} issue rule${nRules === 1 ? '' : 's'}`, status: 'done' });
    renderReport(data.result, doneId);
    announceScan(`Scan complete. ${data.result?.totals?.rules || 0} issue rule${(data.result?.totals?.rules || 0) === 1 ? '' : 's'} found`);
    loadHistory();
  } else if (data.status === 'error') {
    const errId = currentScanId;
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    updateHistoryEntry(errId, { label: 'failed', status: 'error' });
    loadHistory();
    results.hidden = false;
    const errMsg = data.error || 'Unknown error.';
    resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>Scan failed.</strong> ${esc(errMsg)}</div>`;
    announceScan(`Scan failed: ${errMsg}`);
    results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
  }
}

/* ---------- Rendering ---------- */

function sevTile(label, n, cls, note) {
  return `<div class="sev-tile ${cls}"><div class="n">${n}</div><div class="l">${label}</div>${note ? `<div class="sev-note">${note}</div>` : ''}</div>`;
}

function renderReport(result, scanId) {
  ui = { activePage: 0, severity: 'all', query: '' };
  lastReportId = scanId || null;
  results.hidden = false;
  if (lastReportId) {
    const enc = encodeURIComponent(lastReportId);
    exportHtml.href = `/api/scan/${enc}/export?format=html`;
    exportJson.href = `/api/scan/${enc}/export?format=json`;
    exportPdf.href = `/api/scan/${enc}/export?format=pdf`;
    exportHtml.hidden = exportJson.hidden = exportPdf.hidden = false;
  } else {
    exportHtml.hidden = exportJson.hidden = exportPdf.hidden = true;
  }

  const t = result.totals;
  const allClean = t.rules === 0;
  const scannedAt = new Date(result.scannedAt).toLocaleString();

  let html = `
    <div class="summary-card">
      <p class="summary-meta">
        Scanned ${result.pages.length} page${result.pages.length === 1 ? '' : 's'} · ${esc(scannedAt)}
        ${result.crawled ? ' · included same-site links' : ''}
      </p>
      <div class="sev-grid" aria-describedby="sev-grid-note">
        ${allClean
          ? `<div class="sev-tile clean" style="grid-column:1/-1;text-align:center"><div class="n" style="font-size:1.3rem">No violations found</div><div class="l">by the rules axe ran</div></div>`
          : `
            ${sevTile('Critical', t.critical, 'critical', 'blocks some users entirely')}
            ${sevTile('Serious', t.serious, 'serious', 'major barriers')}
            ${sevTile('Moderate', t.moderate, 'moderate', 'hinders some tasks')}
            ${sevTile('Minor', t.minor, 'minor', 'polish issues')}`}
      </div>
      <span id="sev-grid-note" class="sr-only">Each count is per rule per page. The same rule failing on two pages counts twice.</span>
      <p class="summary-note">
        ${allClean
          ? 'axe-core found no violations on the checked rules. That is not a compliance guarantee. See the disclaimer above.'
          : `${t.rules} rule${t.rules === 1 ? '' : 's'} failed across ${t.nodes} element${t.nodes === 1 ? '' : 's'}. Severity is axe's impact rating; fix critical and serious first.`}
        ${(t.passes || 0) + (t.incomplete || 0) > 0
          ? ` axe passed ${t.passes || 0} check${(t.passes || 0) === 1 ? '' : 's'} and flagged ${(t.incomplete || 0)} rule${(t.incomplete || 0) === 1 ? '' : 's'} needing manual review.`
          : ''}
      </p>
      <p class="summary-note next-step">Share the exported report with whoever maintains this site.</p>
    </div>
    <div id="compare-banner" class="compare-banner" hidden></div>`;

  if (result.pages.length > 1) {
    html += `<div class="page-tabs">` +
      result.pages.map((p, i) => {
        const label = safeHostPath(p.url);
        const err = p.error ? ' (error)' : '';
        return `<button class="page-tab ${i === ui.activePage ? 'active' : ''}" data-page="${i}" aria-pressed="${i === ui.activePage}" title="${esc(p.url)}">${esc(label)}${err}</button>`;
      }).join('') + `</div>`;
  }

  html += `<div id="page-detail"></div>`;
  resultsBody.innerHTML = html;

  resultsBody.querySelectorAll('.page-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.activePage = Number(btn.dataset.page);
      resultsBody.querySelectorAll('.page-tab').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderPageDetail(result.pages[ui.activePage]);
    });
  });

  renderPageDetail(result.pages[ui.activePage]);
  loadCompareBanner();
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
}

// Compact "vs previous scan" banner — silent no-op when there's nothing to compare.
async function loadCompareBanner() {
  const el = document.getElementById('compare-banner');
  if (!el || !lastReportId) return;
  let data;
  try {
    const res = await fetch(`/api/scans/${encodeURIComponent(lastReportId)}/compare`);
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  if (!data || !data.comparable) return;

  const d = new Date(data.previousScannedAt || '');
  const when = isNaN(d) ? 'a previous scan' : d.toLocaleDateString();
  const added = data.addedRules || [];
  const fixed = data.fixedRules || [];
  const sev = data.severityChanges || [];
  const ruleItem = (r) => `<li><code>${esc(r.id)}</code> · ${esc(safeHostPath(r.pageUrl || ''))}</li>`;
  const sevItem = (c) => `<li><code>${esc(c.id)}</code>: ${esc(c.before)} → ${esc(c.after)} · ${esc(safeHostPath(c.pageUrl || ''))}</li>`;

  el.innerHTML = `
    <p class="compare-line">vs scan ${esc(when)}: <strong>+${added.length} new</strong>, <strong>−${fixed.length} fixed</strong>, ${sev.length} severity change${sev.length === 1 ? '' : 's'}</p>
    ${added.length + fixed.length + sev.length ? `<details class="compare-details"><summary>Details</summary>
      ${added.length ? `<p class="compare-sub">New issues</p><ul>${added.map(ruleItem).join('')}</ul>` : ''}
      ${fixed.length ? `<p class="compare-sub">Fixed since then</p><ul>${fixed.map(ruleItem).join('')}</ul>` : ''}
      ${sev.length ? `<p class="compare-sub">Severity changed</p><ul>${sev.map(sevItem).join('')}</ul>` : ''}
    </details>` : ''}`;
  el.hidden = false;
}

function safeHostPath(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    return u.host + path;
  } catch { return url; }
}

function renderPageDetail(page) {
  const el = document.getElementById('page-detail');
  if (!el) return;

  if (page.error) {
    el.innerHTML = `<div class="page-error" role="alert"><strong>Could not scan ${esc(safeHostPath(page.url))}.</strong> ${esc(page.error)}</div>`;
    return;
  }

  const violations = page.violations || [];
  const counts = page.counts || { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const incomplete = page.incomplete || [];

  const reviewHtml = incomplete.length ? `
    <div class="review-box">
      <strong>Needs manual review (${page.incompleteCount || incomplete.length} rule${(page.incompleteCount || incomplete.length) === 1 ? '' : 's'})</strong>
      <p class="review-sub">axe could not determine pass/fail automatically. Check these by hand.</p>
      <ul>${incomplete.map((i) => `<li>${esc(i.help || i.id)} <span class="review-count">${i.nodeCount || 0}×</span>${i.helpUrl ? ` · <a href="${esc(i.helpUrl)}" target="_blank" rel="noopener noreferrer">reference ↗</a>` : ''}</li>`).join('')}</ul>
    </div>` : '';

  let html = reviewHtml + `
    <div class="filters" role="group" aria-label="Filter issues">
      <button class="chip ${ui.severity === 'all' ? 'active' : ''}" data-sev="all" aria-pressed="${ui.severity === 'all'}">All (${violations.length})</button>
      ${SEVERITIES.map((s) => `<button class="chip ${ui.severity === s ? 'active' : ''}" data-sev="${s}" aria-pressed="${ui.severity === s}">${s} (${counts[s] || 0})</button>`).join('')}
      <input type="search" id="issue-search" placeholder="Filter by rule or text…" value="${esc(ui.query)}" aria-label="Filter issues">
    </div>
    <div id="issue-list"></div>`;

  el.innerHTML = html;

  el.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      ui.severity = chip.dataset.sev;
      el.querySelectorAll('.chip').forEach((c) => {
        const on = c === chip;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      renderIssueList(page);
    });
  });
  el.querySelector('#issue-search').addEventListener('input', (e) => {
    ui.query = e.target.value;
    renderIssueList(page);
  });

  renderIssueList(page);
}

function renderIssueList(page) {
  const list = document.getElementById('issue-list');
  if (!list) return;
  const q = ui.query.trim().toLowerCase();

  const items = (page.violations || []).filter((v) => {
    if (ui.severity !== 'all' && v.impact !== ui.severity) return false;
    if (q && !(`${v.id} ${v.help} ${v.description}`.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => sevRank(a.impact) - sevRank(b.impact));

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><strong>No matching issues.</strong><br>Adjust the filters, or this page passed every checked rule.</div>`;
    return;
  }

  list.innerHTML = items.map((v, i) => {
    const nodes = (v.nodes || []).slice(0, 10).map((n) => `
      <div class="issue-field">
        <span class="issue-field-label">Element</span>
        <code>${esc(n.target || '(no selector)')}</code>
      </div>
      <div class="issue-field">
        <span class="issue-field-label">HTML snippet</span>
        <code class="snippet">${esc(n.html || '')}</code>
      </div>
      ${n.summary ? `<div class="issue-field"><span class="issue-field-label">Why it failed</span><code class="snippet">${esc(n.summary)}</code></div>` : ''}
    `).join('');
    const more = (v.nodeCount || 0) > 10 ? `<p class="summary-note">…and ${(v.nodeCount || 0) - 10} more element${(v.nodeCount || 0) - 10 === 1 ? '' : 's'} with this issue.</p>` : '';
    const tags = (v.tags || []).map((t) => `<span class="wcag-tag">${esc(t)}</span>`).join('');

    // Real fix guidance from rules-data.js when we know the rule; otherwise
    // fall back to axe's own one-line summary, labeled honestly.
    const rule = RULE_LOOKUP.get(v.id);
    const ruleLinks = `<a href="rules.html#${esc(v.id)}">What this means</a>${v.helpUrl ? ` · <a href="${esc(v.helpUrl)}" target="_blank" rel="noopener noreferrer">official docs ↗</a>` : ''}`;
    const fixField = rule
      ? `<div class="issue-field">
          <span class="issue-field-label">How to fix</span>
          <ul class="fix-list">${rule.fix.slice(0, 2).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <a href="rules.html#${esc(v.id)}">Full fix guide</a>${v.helpUrl ? ` · <a href="${esc(v.helpUrl)}" target="_blank" rel="noopener noreferrer">official docs ↗</a>` : ''}
        </div>`
      : `<div class="issue-field">
          <span class="issue-field-label">axe summary</span>
          <code>${esc(v.help || v.description || '')}</code>
          ${ruleLinks}
        </div>`;

    return `
    <div class="issue" data-idx="${i}">
      <button class="issue-head" aria-expanded="false" aria-controls="issue-body-${i}">
        <span class="sev-badge ${esc(v.impact || 'minor')}">${esc(v.impact || 'minor')}</span>
        <span class="issue-title">${esc(v.help || v.id)}</span>
        <span class="issue-count">${v.nodeCount || (v.nodes || []).length}×</span>
        <svg class="issue-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="issue-body" id="issue-body-${i}">
        <p class="issue-desc">${esc(v.description || '')}</p>
        <div class="issue-grid">
          ${fixField}
          ${tags ? `<div class="wcag-tags" aria-label="WCAG tags">${tags}</div>` : ''}
          ${nodes}
          ${more}
        </div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.issue-head').forEach((head) => {
    head.addEventListener('click', () => {
      const issue = head.closest('.issue');
      const open = issue.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
    });
  });
}

/* ---------- Wiring ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = urlInput.value.trim();
  if (!raw) {
    showError('Enter a URL first.');
    urlInput.focus();
    return;
  }
  // Accept bare domains (example.com) — default to https://.
  const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!/^https?:\/\/.+/i.test(normalized)) {
    showError('Enter a valid URL, e.g. example.com');
    urlInput.focus();
    return;
  }
  startScan(normalized, crawlInput.checked, Number(maxPagesInput.value));
});

// Enable/disable the page-count select with the crawl checkbox.
crawlInput.addEventListener('change', () => {
  maxPagesInput.disabled = !crawlInput.checked;
});

newScanBtn.addEventListener('click', () => {
  results.hidden = true;
  exportHtml.hidden = exportJson.hidden = exportPdf.hidden = true;
  lastReportId = null;
  urlInput.value = '';
  urlInput.focus();
  window.scrollTo({ top: 0, behavior: smoothScroll });
});

/* ---------- Recent scans (per-browser localStorage history) ---------- */
// History is client-side only: the server keeps a global in-memory list for
// the API, but "Recent scans" must show what THIS browser scanned — never
// other visitors' URLs.
const HISTORY_KEY = 'accessscan-history';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20))); }
  catch { /* storage full/blocked — history is best-effort */ }
}
function addHistoryEntry(id, url) {
  const list = getHistory().filter((h) => h.id !== id);
  list.unshift({ id, url, at: Date.now(), label: 'scanning…', status: 'running' });
  saveHistory(list);
}
function updateHistoryEntry(id, patch) {
  const list = getHistory();
  const i = list.findIndex((h) => h.id === id);
  if (i === -1) return;
  list[i] = { ...list[i], ...patch };
  saveHistory(list);
}

function loadHistory() {
  const scans = getHistory();
  if (!scans.length) { recentSection.hidden = true; return; }

  recentSection.hidden = false;
  recentList.innerHTML = scans.slice(0, 10).map((h) => {
    const when = new Date(h.at).toLocaleString();
    const label = h.label || 'scan';
    return `<li class="recent-item">
      <span class="r-url" title="${esc(h.url || '')}">${esc(safeHostPath(h.url || ''))}</span>
      <span class="r-meta">${esc(when)} · ${esc(label)}</span>
      <button class="btn-mini" type="button" data-scan="${esc(h.id)}" aria-label="View scan of ${esc(safeHostPath(h.url || ''))} from ${esc(when)}">View</button>
    </li>`;
  }).join('');

  recentList.querySelectorAll('.btn-mini').forEach((btn) => {
    btn.addEventListener('click', () => viewScan(btn.dataset.scan));
  });
}

async function viewScan(id) {
  let data;
  try {
    const res = await fetch(`/api/scan/${encodeURIComponent(id)}`);
    if (!res.ok) {
      showError('That scan is no longer available (results are kept in memory only).');
      return;
    }
    data = await res.json();
  } catch {
    showError('Could not reach the local server.');
    return;
  }

  results.hidden = false;
  if (data.status === 'done' && data.result) {
    renderReport(data.result, id);
    announceScan('Scan report loaded');
  } else {
    const failMsg = data.status === 'error' ? (data.error || 'Unknown error.') : 'Scan not finished.';
    resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>${data.status === 'error' ? 'Scan failed.' : 'Scan not finished.'}</strong> ${esc(data.error || '')}</div>`;
    announceScan(`Scan failed: ${failMsg}`);
    exportHtml.hidden = exportJson.hidden = exportPdf.hidden = true;
    lastReportId = null;
  }
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
}

loadHistory();
