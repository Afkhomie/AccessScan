/* AccessScan frontend — vanilla JS, polls the local API. */

const form = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const crawlInput = document.getElementById('crawl-input');
const formError = document.getElementById('form-error');
const progress = document.getElementById('progress');
const progressPhase = document.getElementById('progress-phase');
const results = document.getElementById('results');
const resultsBody = document.getElementById('results-body');
const newScanBtn = document.getElementById('new-scan');

const PHASE_LABELS = {
  queued: 'Queued…',
  loading: 'Loading page in a real browser…',
  'finding-links': 'Finding same-site links…',
  done: 'Done',
  error: 'Scan failed',
};
const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

let currentScanId = null;
let pollTimer = null;
let pollFailures = 0;
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

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function startScan(url, crawl) {
  showError('');
  setBusy(true);
  progressPhase.textContent = 'Starting scan…';

  let res;
  try {
    res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, crawl }),
    });
  } catch {
    setBusy(false);
    showError('Could not reach the local server. Is it still running?');
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setBusy(false);
    if (res.status === 429) {
      showError(`A scan is already running — ${data.error || 'please wait for it to finish, then try again.'}`);
    } else {
      showError(data.error || `Request failed (${res.status}). Please try again.`);
    }
    return;
  }

  currentScanId = data.id;
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
  resultsBody.innerHTML = `<div class="page-error"><strong>Scan interrupted.</strong> ${esc(msg)}</div>`;
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
        : `The server returned an error (${res.status}) while checking scan status. Try again in a moment.`);
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

  progressPhase.textContent = fmtPhase(data.phase);

  if (data.status === 'done') {
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    renderReport(data.result);
  } else if (data.status === 'error') {
    clearInterval(pollTimer);
    pollTimer = null;
    currentScanId = null;
    setBusy(false);
    results.hidden = false;
    resultsBody.innerHTML = `<div class="page-error"><strong>Scan failed.</strong> ${esc(data.error || 'Unknown error.')}</div>`;
    document.getElementById('results').scrollIntoView({ behavior: smoothScroll, block: 'start' });
  }
}

/* ---------- Rendering ---------- */

function sevTile(label, n, cls) {
  return `<div class="sev-tile ${cls}"><div class="n">${n}</div><div class="l">${label}</div></div>`;
}

function renderReport(result) {
  ui = { activePage: 0, severity: 'all', query: '' };
  results.hidden = false;

  const t = result.totals;
  const allClean = t.rules === 0;
  const scannedAt = new Date(result.scannedAt).toLocaleString();

  let html = `
    <div class="summary-card">
      <p class="summary-meta">
        Scanned ${result.pages.length} page${result.pages.length === 1 ? '' : 's'} · ${esc(scannedAt)}
        ${result.crawled ? ' · included same-site links' : ''}
      </p>
      <div class="sev-grid">
        ${allClean
          ? `<div class="sev-tile clean" style="grid-column:1/-1;text-align:center"><div class="n" style="font-size:1.3rem">No violations found</div><div class="l">by the rules axe ran</div></div>`
          : `
            ${sevTile('Critical', t.critical, 'critical')}
            ${sevTile('Serious', t.serious, 'serious')}
            ${sevTile('Moderate', t.moderate, 'moderate')}
            ${sevTile('Minor', t.minor, 'minor')}`}
      </div>
      <p class="summary-note">
        ${allClean
          ? 'axe-core found no violations on the checked rules. That is not a compliance guarantee — see the disclaimer above.'
          : `${t.rules} rule${t.rules === 1 ? '' : 's'} failed across ${t.nodes} element${t.nodes === 1 ? '' : 's'}. Severity is axe's impact rating; fix critical and serious first.`}
      </p>
    </div>`;

  if (result.pages.length > 1) {
    html += `<div class="page-tabs">` +
      result.pages.map((p, i) => {
        const label = safeHostPath(p.url);
        const err = p.error ? ' (error)' : '';
        return `<button class="page-tab ${i === ui.activePage ? 'active' : ''}" data-page="${i}" title="${esc(p.url)}">${esc(label)}${err}</button>`;
      }).join('') + `</div>`;
  }

  html += `<div id="page-detail"></div>`;
  resultsBody.innerHTML = html;

  resultsBody.querySelectorAll('.page-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.activePage = Number(btn.dataset.page);
      resultsBody.querySelectorAll('.page-tab').forEach((b) => b.classList.toggle('active', b === btn));
      renderPageDetail(result.pages[ui.activePage]);
    });
  });

  renderPageDetail(result.pages[ui.activePage]);
  results.scrollIntoView({ behavior: smoothScroll, block: 'start' });
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
    el.innerHTML = `<div class="page-error"><strong>Could not scan ${esc(safeHostPath(page.url))}.</strong> ${esc(page.error)}</div>`;
    return;
  }

  const violations = page.violations || [];
  const counts = page.counts || { critical: 0, serious: 0, moderate: 0, minor: 0 };

  let html = `
    <div class="filters" role="group" aria-label="Filter issues">
      <button class="chip ${ui.severity === 'all' ? 'active' : ''}" data-sev="all">All (${violations.length})</button>
      ${SEVERITIES.map((s) => `<button class="chip ${ui.severity === s ? 'active' : ''}" data-sev="${s}">${s} (${counts[s] || 0})</button>`).join('')}
      <input type="search" id="issue-search" placeholder="Filter by rule or text…" value="${esc(ui.query)}" aria-label="Filter issues">
    </div>
    <div id="issue-list"></div>`;

  el.innerHTML = html;

  el.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      ui.severity = chip.dataset.sev;
      el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
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
  });

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><strong>No matching issues.</strong><br>Adjust the filters, or this page passed every checked rule.</div>`;
    return;
  }

  list.innerHTML = items.map((v, i) => {
    const nodes = (v.nodes || []).slice(0, 10).map((n) => `
      <div class="issue-field">
        <label>Element</label>
        <code>${esc(n.target || '(no selector)')}</code>
      </div>
      <div class="issue-field">
        <label>HTML snippet</label>
        <code class="snippet">${esc(n.html || '')}</code>
      </div>
      ${n.summary ? `<div class="issue-field"><label>Why it failed</label><code class="snippet">${esc(n.summary)}</code></div>` : ''}
    `).join('');
    const more = (v.nodeCount || 0) > 10 ? `<p class="summary-note">…and ${(v.nodeCount || 0) - 10} more element${(v.nodeCount || 0) - 10 === 1 ? '' : 's'} with this issue.</p>` : '';
    const tags = (v.tags || []).map((t) => `<span class="wcag-tag">${esc(t)}</span>`).join('');

    return `
    <div class="issue" data-idx="${i}">
      <button class="issue-head" aria-expanded="false">
        <span class="sev-badge ${esc(v.impact || 'minor')}">${esc(v.impact || 'minor')}</span>
        <span class="issue-title">${esc(v.help || v.id)}</span>
        <span class="issue-count">${v.nodeCount || (v.nodes || []).length}×</span>
        <svg class="issue-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="issue-body">
        <p class="issue-desc">${esc(v.description || '')}</p>
        <div class="issue-grid">
          <div class="issue-field">
            <label>Fix hint</label>
            <code>${esc(v.help || '')}</code>
            ${v.helpUrl ? `<a href="${esc(v.helpUrl)}" target="_blank" rel="noopener noreferrer">Rule reference ↗</a>` : ''}
          </div>
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
  // Light client-side sanity; server does the real validation.
  if (!/^https?:\/\/.+/i.test(raw)) {
    showError('URL must start with http:// or https://');
    urlInput.focus();
    return;
  }
  startScan(raw, crawlInput.checked);
});

newScanBtn.addEventListener('click', () => {
  results.hidden = true;
  urlInput.value = '';
  urlInput.focus();
  window.scrollTo({ top: 0, behavior: smoothScroll });
});
