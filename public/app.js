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

// All user-facing strings live in copy.js (window.COPY).
const AC = window.COPY.app;
const RPT = AC.report;
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
const pickWord = (n, one, many) => (n === 1 ? one : many);
const ruleWord = (n) => pickWord(n, RPT.ruleWordOne, RPT.ruleWordMany);
const issueRuleWord = (n) => pickWord(n, RPT.issueWordOne, RPT.issueWordMany);
const nodeWord = (n) => pickWord(n, RPT.nodeWordOne, RPT.nodeWordMany);
const passWord = (n) => pickWord(n, RPT.passWordOne, RPT.passWordMany);
const incompleteWord = (n) => pickWord(n, RPT.incompleteWordOne, RPT.incompleteWordMany);
const sevWord = (n) => pickWord(n, RPT.sevWordOne, RPT.sevWordMany);
const elementWord = (n) => pickWord(n, RPT.elementWordOne, RPT.elementWordMany);
const pageWord = (n) => pickWord(n, RPT.pageWordOne, RPT.pageWordMany);

// Announce state changes to screen readers, then move focus to the report.
function announceScan(msg) {
  if (scanStatus) {
    scanStatus.textContent = '';
    scanStatus.textContent = msg;
  }
  if (!results.hidden) results.focus();
}

const PHASE_LABELS = {
  queued: AC.phases.queued,
  loading: AC.phases.loading,
  'finding-links': AC.phases.findingLinks,
  done: AC.phases.done,
  error: AC.phases.error,
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
  scanBtn.textContent = busy ? AC.busy.scanning : AC.busy.scan;
  progress.hidden = !busy;
}

function fmtPhase(phase) {
  if (PHASE_LABELS[phase]) return PHASE_LABELS[phase];
  if (typeof phase === 'string' && phase.startsWith('scanning')) {
    return fmt(AC.phases.scanningPage, { n: phase.replace('scanning ', '') });
  }
  return AC.phases.working;
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
    return fmt(AC.errors.alreadyRunning, { detail: data.error || AC.errors.alreadyRunningFallback });
  }
  if (res.status >= 500) {
    return AC.errors.serverError;
  }
  return data.error || AC.errors.generic;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function startScan(url, crawl, maxPages) {
  showError('');
  setBusy(true);
  progressPhase.textContent = `${AC.phases.startingScan}…`;
  progressPct.textContent = '0%';
  progressFill.style.width = '0%';
  progressSub.textContent = window.COPY.index.progress.subInitial;
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
    showError(AC.errors.unreachable);
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
  resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>${AC.errors.interrupted}</strong> ${esc(msg)}</div>`;
  announceScan(fmt(AC.errors.interruptedAnnounce, { msg }));
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
}

async function pollScan() {
  if (!currentScanId) return;
  let data;
  try {
    const res = await fetch(`/api/scan/${currentScanId}`);
    if (!res.ok) {
      abortScan(res.status === 404
        ? AC.errors.expired
        : res.status >= 500
          ? AC.errors.hiccup
          : AC.errors.statusError);
      return;
    }
    data = await res.json();
  } catch {
    // Transient network hiccup — tolerate a few, then give up.
    pollFailures += 1;
    if (pollFailures >= 5) {
      abortScan(AC.errors.lostConnection);
    }
    return;
  }
  pollFailures = 0;

  // After 60s, gently warn that the scan is slower than usual (server caps ~3min).
  if (!slowHintShown && Date.now() - scanStartedAt > 60_000) {
    slowHintShown = true;
    progressSub.textContent = window.COPY.index.progress.subSlow;
  }
  setProgress(data.phase);

  if (data.status === 'done') {
    const doneId = currentScanId;
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    const nRules = data.result?.totals?.rules || 0;
    updateHistoryEntry(doneId, { label: `${nRules} ${issueRuleWord(nRules)}`, status: 'done' });
    renderReport(data.result, doneId);
    announceScan(fmt(RPT.scanComplete, { n: data.result?.totals?.rules || 0, ruleWord: issueRuleWord(data.result?.totals?.rules || 0) }));
    loadHistory();
  } else if (data.status === 'error') {
    const errId = currentScanId;
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    updateHistoryEntry(errId, { label: window.COPY.index.recent.failedLabel, status: 'error' });
    loadHistory();
    results.hidden = false;
    const errMsg = data.error || AC.errors.unknown;
    resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>${AC.errors.failed}</strong> ${esc(errMsg)}</div>`;
    announceScan(fmt(AC.errors.scanFailedAnnounce, { msg: errMsg }));
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
        ${fmt(RPT.scannedMeta, { pages: `${result.pages.length} ${pageWord(result.pages.length)}`, date: esc(scannedAt) })}
        ${result.crawled ? RPT.crawledSuffix : ''}
      </p>
      <div class="sev-grid" aria-describedby="sev-grid-note">
        ${allClean
          ? `<div class="sev-tile clean" style="grid-column:1/-1;text-align:center"><div class="n" style="font-size:1.3rem">${RPT.cleanTitle}</div><div class="l">${RPT.cleanSub}</div></div>`
          : `
            ${sevTile(RPT.sevLabels.critical, t.critical, 'critical', RPT.sevNotes.critical)}
            ${sevTile(RPT.sevLabels.serious, t.serious, 'serious', RPT.sevNotes.serious)}
            ${sevTile(RPT.sevLabels.moderate, t.moderate, 'moderate', RPT.sevNotes.moderate)}
            ${sevTile(RPT.sevLabels.minor, t.minor, 'minor', RPT.sevNotes.minor)}`}
      </div>
      <span id="sev-grid-note" class="sr-only">${RPT.sevGridNote}</span>
      <p class="summary-note">
        ${allClean
          ? RPT.cleanNote
          : fmt(RPT.violationsNote, { rules: t.rules, ruleWord: ruleWord(t.rules), nodes: t.nodes, nodeWord: nodeWord(t.nodes) })}
        ${(t.passes || 0) + (t.incomplete || 0) > 0
          ? fmt(RPT.passesNote, { passes: t.passes || 0, passWord: passWord(t.passes || 0), incomplete: t.incomplete || 0, incompleteWord: incompleteWord(t.incomplete || 0) })
          : ''}
      </p>
      <p class="summary-note next-step">${RPT.nextStep}</p>
    </div>
    <div id="compare-banner" class="compare-banner" hidden></div>`;

  if (result.pages.length > 1) {
    html += `<div class="page-tabs">` +
      result.pages.map((p, i) => {
        const label = safeHostPath(p.url);
        const err = p.error ? RPT.tabErrorSuffix : '';
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
  const when = isNaN(d) ? RPT.comparePrevious : d.toLocaleDateString();
  const added = data.addedRules || [];
  const fixed = data.fixedRules || [];
  const sev = data.severityChanges || [];
  const ruleItem = (r) => `<li><code>${esc(r.id)}</code> · ${esc(safeHostPath(r.pageUrl || ''))}</li>`;
  const sevItem = (c) => `<li><code>${esc(c.id)}</code>: ${esc(c.before)} → ${esc(c.after)} · ${esc(safeHostPath(c.pageUrl || ''))}</li>`;

  el.innerHTML = `
    <p class="compare-line">${fmt(RPT.compareLine, { when: esc(when), added: added.length, fixed: fixed.length, sev: sev.length, sevWord: sevWord(sev.length) })}</p>
    ${added.length + fixed.length + sev.length ? `<details class="compare-details"><summary>${RPT.compareDetails}</summary>
      ${added.length ? `<p class="compare-sub">${RPT.compareAdded}</p><ul>${added.map(ruleItem).join('')}</ul>` : ''}
      ${fixed.length ? `<p class="compare-sub">${RPT.compareFixed}</p><ul>${fixed.map(ruleItem).join('')}</ul>` : ''}
      ${sev.length ? `<p class="compare-sub">${RPT.compareSeverity}</p><ul>${sev.map(sevItem).join('')}</ul>` : ''}
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
    el.innerHTML = `<div class="page-error" role="alert"><strong>${fmt(RPT.pageError, { url: esc(safeHostPath(page.url)) })}</strong> ${esc(page.error)}</div>`;
    return;
  }

  const violations = page.violations || [];
  const counts = page.counts || { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const incomplete = page.incomplete || [];

  const nInc = page.incompleteCount || incomplete.length;
  const reviewHtml = incomplete.length ? `
    <div class="review-box">
      <strong>${fmt(RPT.reviewTitle, { n: nInc, ruleWord: ruleWord(nInc) })}</strong>
      <p class="review-sub">${RPT.reviewSub}</p>
      <ul>${incomplete.map((i) => `<li>${esc(i.help || i.id)} <span class="review-count">${i.nodeCount || 0}${RPT.issueCountSuffix}</span>${i.helpUrl ? ` · <a href="${esc(i.helpUrl)}" target="_blank" rel="noopener noreferrer">${RPT.reviewRef}</a>` : ''}</li>`).join('')}</ul>
    </div>` : '';

  let html = reviewHtml + `
    <div class="filters" role="group" aria-label="${RPT.filterSearchLabel}">
      <button class="chip ${ui.severity === 'all' ? 'active' : ''}" data-sev="all" aria-pressed="${ui.severity === 'all'}">${fmt(RPT.filterAll, { n: violations.length })}</button>
      ${SEVERITIES.map((s) => `<button class="chip ${ui.severity === s ? 'active' : ''}" data-sev="${s}" aria-pressed="${ui.severity === s}">${RPT.sevLabels[s]} (${counts[s] || 0})</button>`).join('')}
      <input type="search" id="issue-search" placeholder="${RPT.filterSearchPlaceholder}" value="${esc(ui.query)}" aria-label="${RPT.filterSearchLabel}">
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
    list.innerHTML = `<div class="empty-state"><strong>${RPT.emptyStateTitle}</strong><br>${RPT.emptyStateBody}</div>`;
    return;
  }

  list.innerHTML = items.map((v, i) => {
    const nodes = (v.nodes || []).slice(0, 10).map((n) => `
      <div class="issue-field">
        <span class="issue-field-label">${RPT.fieldElement}</span>
        <code>${esc(n.target || window.COPY.app.report.fieldNoSelector)}</code>
      </div>
      <div class="issue-field">
        <span class="issue-field-label">${RPT.fieldSnippet}</span>
        <code class="snippet">${esc(n.html || '')}</code>
      </div>
      ${n.summary ? `<div class="issue-field"><span class="issue-field-label">${RPT.fieldWhy}</span><code class="snippet">${esc(n.summary)}</code></div>` : ''}
    `).join('');
    const moreCount = (v.nodeCount || 0) - 10;
    const more = moreCount > 0 ? `<p class="summary-note">${fmt(RPT.moreElements, { n: moreCount, elementWord: elementWord(moreCount) })}</p>` : '';
    const tags = (v.tags || []).map((t) => `<span class="wcag-tag">${esc(t)}</span>`).join('');

    // Real fix guidance from rules-data.js when we know the rule; otherwise
    // fall back to axe's own one-line summary, labeled honestly.
    const rule = RULE_LOOKUP.get(v.id);
    const ruleLinks = `<a href="rules.html#${esc(v.id)}">${RPT.linkWhatThisMeans}</a>${v.helpUrl ? ` · <a href="${esc(v.helpUrl)}" target="_blank" rel="noopener noreferrer">${RPT.linkOfficialDocs}</a>` : ''}`;
    const fixField = rule
      ? `<div class="issue-field">
          <span class="issue-field-label">${RPT.fieldFix}</span>
          <ul class="fix-list">${rule.fix.slice(0, 2).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <a href="rules.html#${esc(v.id)}">${RPT.linkFullFixGuide}</a>${v.helpUrl ? ` · <a href="${esc(v.helpUrl)}" target="_blank" rel="noopener noreferrer">${RPT.linkOfficialDocs}</a>` : ''}
        </div>`
      : `<div class="issue-field">
          <span class="issue-field-label">${RPT.fieldAxeSummary}</span>
          <code>${esc(v.help || v.description || '')}</code>
          ${ruleLinks}
        </div>`;

    return `
    <div class="issue" data-idx="${i}">
      <button class="issue-head" aria-expanded="false" aria-controls="issue-body-${i}">
        <span class="sev-badge ${esc(v.impact || 'minor')}">${esc(v.impact || 'minor')}</span>
        <span class="issue-title">${esc(v.help || v.id)}</span>
        <span class="issue-count">${v.nodeCount || (v.nodes || []).length}${RPT.issueCountSuffix}</span>
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
    showError(AC.errors.enterUrl);
    urlInput.focus();
    return;
  }
  // Accept bare domains (example.com) — default to https://.
  const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!/^https?:\/\/.+/i.test(normalized)) {
    showError(AC.errors.invalidUrl);
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
  list.unshift({ id, url, at: Date.now(), label: window.COPY.index.recent.scanningLabel, status: 'running' });
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
    const label = h.label || window.COPY.index.recent.fallbackLabel;
    return `<li class="recent-item">
      <span class="r-url" title="${esc(h.url || '')}">${esc(safeHostPath(h.url || ''))}</span>
      <span class="r-meta">${esc(when)} · ${esc(label)}</span>
      <button class="btn-mini" type="button" data-scan="${esc(h.id)}" aria-label="${esc(fmt(window.COPY.index.recent.viewAria, { url: safeHostPath(h.url || ''), when }))}">${window.COPY.index.recent.view}</button>
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
      showError(AC.errors.historyGone);
      return;
    }
    data = await res.json();
  } catch {
    showError(AC.errors.serverGone);
    return;
  }

  results.hidden = false;
  if (data.status === 'done' && data.result) {
    renderReport(data.result, id);
    announceScan(AC.errors.reportLoaded);
  } else {
    const failMsg = data.status === 'error' ? (data.error || AC.errors.unknown) : AC.errors.notFinished;
    resultsBody.innerHTML = `<div class="page-error" role="alert"><strong>${data.status === 'error' ? AC.errors.failed : AC.errors.notFinished}</strong> ${esc(data.error || '')}</div>`;
    announceScan(fmt(AC.errors.scanFailedAnnounce, { msg: failMsg }));
    exportHtml.hidden = exportJson.hidden = exportPdf.hidden = true;
    lastReportId = null;
  }
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
}

loadHistory();

/* ---------- Back to top ---------- */
const toTopBtn = document.getElementById('to-top');
if (toTopBtn) {
  const onScroll = () => { toTopBtn.hidden = window.scrollY < 400; };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: smoothScroll });
  });
}
