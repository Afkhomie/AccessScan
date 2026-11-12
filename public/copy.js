/* AccessScan — single source of truth for user-facing strings.
 *
 * Loaded before app.js and rules-data.js on every page. Elements marked
 * data-copy="path.to.key" receive textContent; elements marked
 * data-copy-html="path.to.key" receive innerHTML (for strings that
 * legitimately contain markup such as links or emphasis).
 * Keys resolve against window.COPY by dot path.
 */
'use strict';

window.COPY = {

  /* ---------- Shared chrome (header, footer, skip links) ---------- */
  chrome: {
    skipToContent: 'Skip to main content',
    skipToRules: 'Skip to rule list',
    brandLabel: 'AccessScan home',
    navLabel: 'Main',
    navScanner: 'Scan',
    navRuleReference: 'Rules',
    toTop: 'Back to top',
    footer: {
      line: 'Free, no account, no tracking. MIT licensed.',
      linkRuleReference: 'Rule reference',
      linkPrivacy: 'Privacy Policy',
      linkTerms: 'Terms of Use',
      linkScanner: 'Scanner',
    },
  },

  /* ---------- index.html ---------- */
  index: {
    meta: {
      kicker: 'WCAG 2.x · EAA · axe-core',
      h1: 'Is your website accessible?',
      lede: 'Free scan for common WCAG 2.x accessibility failures on any public page. No account needed.',
    },
    navFaq: 'FAQ',
    form: {
      urlLabel: 'Website URL',
      urlPlaceholder: 'example.com',
      crawlLabel: 'Also scan linked pages on this site:',
      maxPagesLabel: 'Maximum pages',
      maxPages1: 'this page only',
      maxPages3: 'up to 3 pages',
      maxPages5: 'up to 5 pages',
      maxPages10: 'up to 10 pages',
    },
    progress: {
      starting: 'Starting…',
      startingScan: 'Starting scan…',
      subInitial: 'Slow sites can take up to a minute.',
      subSlow: 'Still working, taking longer than usual.',
    },
    recent: {
      heading: 'Recent scans',
      note: 'Stored in this browser only, never sent anywhere.',
      view: 'View',
      viewAria: 'View scan of {url} from {when}',
      fallbackLabel: 'scan',
      scanningLabel: 'scanning…',
      failedLabel: 'failed',
      expiredLabel: 'expired',
    },
    disclaimer: {
      html: '<strong>Automated scans catch roughly 30–57% of WCAG issues</strong> (per Deque’s research). A clean result is not a compliance guarantee. EAA enforcement applies in the EU as of June 2025; for assurance, get a manual audit.',
    },
    results: {
      heading: 'Report',
      downloadHtml: 'Export HTML',
      downloadJson: 'Export JSON',
      downloadPdf: 'Export PDF',
      newScan: 'New scan',
    },
    how: {
      heading: 'How it works',
      items: [
        { title: 'Paste a URL', body: 'Any public page. Private and internal addresses are blocked.' },
        { title: 'We load the page', body: 'Its rendered content is checked against WCAG 2.x rules with axe-core.' },
        { title: 'Review the report', body: 'Issues are grouped by severity, with the element, a code snippet, and how to fix it. Crawl mode can scan up to 10 pages.' },
      ],
    },
    faq: {
      heading: 'FAQs',
      items: [
        {
          q: 'Does a clean scan prove my site is accessible?',
          a: 'No. Automated scans catch roughly 30–57% of WCAG issues, so a clean report is not a compliance guarantee. Pair it with a manual audit for real assurance.',
        },
        {
          q: 'Is it free? Do I need an account?',
          a: 'Yes, free, no account, no tracking. The scan runs on hosted servers; the only outbound request is loading the site you scan.',
        },
        {
          q: 'Where is my data stored?',
          a: 'Scan URLs and results live in server memory only, capped at the 20 most recent scans, and are wiped when the server restarts. Your browser keeps your recent scan IDs and URLs in localStorage on your device only; they are never sent anywhere.',
        },
        {
          q: 'What does it check?',
          a: 'Common WCAG 2.x failures at A/AA level, checked with axe-core. See the <a href="rules.html">rule reference</a> for the full list; some items need manual review.',
        },
        {
          q: 'Can it scan a whole site?',
          a: 'Yes. Crawl mode follows same-site links, up to 10 pages. Very large sites may only be partly covered.',
        },
        {
          q: 'How is this different from Lighthouse?',
          a: 'Lighthouse blends accessibility with speed and SEO scores. AccessScan focuses on accessibility detail and exports a fix-ready report.',
        },
        {
          q: 'Is it okay to scan any site?',
          a: 'Only scan sites you own or have permission to test. Automated scans still hit the target server, so respect its terms. See <a href="terms.html">acceptable use</a>.',
        },
      ],
    },
  },

  /* ---------- Dynamic strings rendered by app.js ---------- */
  app: {
    phases: {
      queued: 'Queued',
      loading: 'Loading page',
      findingLinks: 'Finding same-site links',
      done: 'Done',
      error: 'Scan failed',
      scanningPage: 'Scanning linked page ({n})',
      working: 'Working',
      startingScan: 'Starting scan',
    },
    busy: {
      scanning: 'Scanning…',
      scan: 'Scan',
    },
    errors: {
      alreadyRunning: 'A scan is already running. {detail}',
      alreadyRunningFallback: 'Please wait for it to finish, then try again.',
      serverError: 'The server hit an error. It may still be starting; try again in a minute.',
      generic: 'Something went wrong. Please try again.',
      unreachable: 'Could not reach the server. Try again in a moment.',
      expired: 'That result expired (only recent scans are kept). Start a new scan.',
      hiccup: 'Something went wrong checking progress. Try again in a moment.',
      statusError: 'Could not check scan status. Try again in a moment.',
      lostConnection: 'Lost connection to the server. Make sure it is still running, then try again.',
      interrupted: 'Scan interrupted.',
      unknown: 'Unknown error.',
      failed: 'Scan failed.',
      notFinished: 'Scan not finished.',
      historyGone: 'That scan is gone. Results are kept in memory only.',
      serverGone: 'Could not reach the server.',
      enterUrl: 'Enter a URL first.',
      invalidUrl: 'Enter a valid URL, e.g. example.com',
      reportLoaded: 'Scan report loaded',
    },
    report: {
      scannedMeta: 'Scanned {pages} · {date}',
      crawledSuffix: ' · includes same-site pages',
      cleanTitle: 'No issues found',
      cleanSub: 'in the rules checked',
      sevLabels: {
        critical: 'Critical',
        serious: 'Serious',
        moderate: 'Moderate',
        minor: 'Minor',
      },
      sevNotes: {
        critical: 'can block access for some users',
        serious: 'major barriers for users',
        moderate: 'gets in the way',
        minor: 'small improvements',
      },
      sevGridNote: 'Counts are per rule per page, so the same issue on two pages counts twice.',
      cleanNote: 'No issues found in the rules checked. This is not a compliance guarantee; see the note above.',
      violationsNote: '{rules} {ruleWord} failed across {nodes} {nodeWord}. Fix critical and serious issues first.',
      passesNote: ' {passes} {passWord} passed, {incomplete} {incompleteWord} need manual review.',
      nextStep: 'Send the report to whoever maintains this site.',
      pageError: 'Could not scan {url}.',
      tabErrorSuffix: ' (error)',
      partialTitle: 'Partial results: {n} of {m} {pageWord} scanned',
      partialSub: 'Some pages could not be scanned. See the page notes on each page tab for details.',
      partialTotalsNote: 'Totals cover only the pages that scanned successfully.',
      compareLine: 'vs scan {when}: <strong>+{added} new</strong>, <strong>−{fixed} fixed</strong>, {sev} {sevWord}',
      comparePrevious: 'a previous scan',
      compareDetails: 'Details',
      compareAdded: 'New issues',
      compareFixed: 'Fixed since then',
      compareSeverity: 'Severity changed',
      reviewTitle: 'Requires manual review ({n} {ruleWord})',
      reviewSub: 'The scanner could not decide pass or fail automatically. Check these by hand.',
      reviewRef: 'reference ↗',
      filterAll: 'All ({n})',
      filterSearchPlaceholder: 'Filter by rule or text…',
      filterSearchLabel: 'Filter issues',
      emptyStateTitle: 'No matching issues.',
      emptyStateBody: 'Try different filters, or this page passed every rule checked.',
      fieldElement: 'Element',
      fieldNoSelector: '(no selector)',
      fieldSnippet: 'HTML snippet',
      fieldWhy: 'Why it failed',
      fieldFix: 'How to fix',
      fieldAxeSummary: 'Scanner summary',
      linkWhatThisMeans: 'What this means',
      linkOfficialDocs: 'official documentation ↗',
      linkFullFixGuide: 'Fix guide',
      moreElements: '…and {n} more {elementWord} with this issue.',
      issueCountSuffix: '×',
      scanComplete: 'Scan complete. {n} {ruleWord} found',
      scanFailedAnnounce: 'Scan failed: {msg}',
      interruptedAnnounce: 'Scan interrupted: {msg}',
      ruleWordOne: 'rule',
      ruleWordMany: 'rules',
      nodeWordOne: 'element',
      nodeWordMany: 'elements',
      pageWordOne: 'page',
      pageWordMany: 'pages',
      passWordOne: 'check',
      passWordMany: 'checks',
      incompleteWordOne: 'rule',
      incompleteWordMany: 'rules',
      sevWordOne: 'severity change',
      sevWordMany: 'severity changes',
      elementWordOne: 'element',
      elementWordMany: 'elements',
      issueWordOne: 'issue rule',
      issueWordMany: 'issue rules',
    },
  },

  /* ---------- rules.html + rules-data.js renderer ---------- */
  rulesPage: {
    kicker: 'Rule reference',
    h1: 'Accessibility rule reference',
    lede: 'What the scanner checks, in plain language. Each rule links to the full reference.',
    disclaimerHtml: '<strong>Not the full list.</strong> This covers the most common rules. For everything, see the <a href="https://dequeuniversity.com/rules/axe/4.14" rel="noopener">axe rule index</a>. Rules tagged “best practice” are recommendations, not failures.',
    filterLabel: 'Filter rules',
    filterPlaceholder: 'Filter rules, e.g. “contrast” or “label”…',
    filterCount: '{shown} of {total} rules shown',
    emptyFilterHtml: 'No rules match that filter. Try a different term, or <a href="https://dequeuniversity.com/rules/axe/4.14" rel="noopener">browse the full axe rule index</a>.',
    /* Renderer strings used by rules-data.js */
    howToFix: 'How to fix',
    tagBestPractice: 'best practice',
    tagWcag: 'WCAG {wcag}',
    permalinkAria: 'Permalink to {id}',
    fullReference: 'Full reference (dequeuniversity.com)',
    backToScanner: '← Back to scanner',
    principles: [
      { num: '1', name: 'Perceivable', blurb: 'Information must be perceivable; not by colour alone, not silently, not at unreadable sizes.' },
      { num: '2', name: 'Operable', blurb: 'Interfaces must be operable; keyboard reachable, no traps, no seizure risks.' },
      { num: '3', name: 'Understandable', blurb: 'Interfaces must be understandable; clear labels, declared language, consistent structure.' },
      { num: '4', name: 'Robust', blurb: 'Content must work with assistive tech; valid markup and unique IDs.' },
      { num: 'B', name: 'Best practices', blurb: 'axe flags these as good practice, not WCAG failures; fixing them still helps users.' },
    ],
  },

  /* ---------- privacy.html ---------- */
  privacy: {
    kicker: 'Privacy',
    h1: 'Privacy policy',
    lede: 'AccessScan is a free, hosted service with nothing to track: no accounts, no cookies, no analytics. This page states exactly what data exists and where it goes.',
    sections: [
      {
        h: 'What data exists',
        bodyHtml: '<p>Only two things: <strong>the URLs you submit</strong> and <strong>the scan results</strong> for them. On our side, both are held in the memory (RAM) of the hosted server process. There is no database, no scan log file, and nothing is written to disk. Scan records are capped at the 20 most recent and are deleted when the server process restarts.</p><p>On your side, the browser keeps a list of your recent scans (scan IDs and URLs) in localStorage so the "Recent scans" list survives page reloads. This data stays on your device only and is never transmitted to us or anyone else. No cookies are set and no other browser storage is used.</p>',
      },
      {
        h: 'What is sent where',
        bodyHtml: '<p>AccessScan is hosted: the frontend is served from Vercel and the scanning backend runs on Render. Your browser communicates only with AccessScan; the single outbound action performed on your behalf is the purpose of the tool itself: <strong>the server retrieves the website URL you supplied</strong> and performs an accessibility check on the rendered page, in the same manner as your browser. The target site receives a normal page request bearing a User-Agent string that identifies AccessScan.</p><p>There are no third-party requests: no analytics, no telemetry, no tracking pixels, no external fonts or trackers. Every script and stylesheet is served by the same hosted deployment. The only external links on this site are documentation references (such as the axe-core rule index) that load only if you choose to open them.</p>',
      },
      {
        h: 'What AccessScan does not do',
        list: [
          'Set cookies or track users in any form',
          'Require accounts, registration, or login',
          'Collect analytics or usage statistics',
          'Load third-party SDKs or external services',
          'Process payments; the service is free',
          'Persist scan data beyond in-memory storage',
        ],
      },
      {
        h: 'Data retention',
        bodyHtml: '<p>Scan records are retained in server memory only, capped at the 20 most recent scans, and are deleted when the server process stops or restarts. Your browser\u2019s localStorage keeps up to 20 recent scan IDs and URLs until you clear site data or the list ages out. To keep a copy of a report, export it (HTML, JSON, or PDF) before the server restarts. Exports are generated on demand and downloaded to your browser like any ordinary file.</p>',
      },
      {
        h: 'Contact',
        bodyHtml: '<p>For questions or concerns, open an issue at <a href="https://github.com/Afkhomie/AccessScan/issues" rel="noopener">github.com/Afkhomie/AccessScan/issues</a>. AccessScan is operated by Afkhomie via GitHub.</p>',
      },
    ],
  },

  /* ---------- terms.html ---------- */
  terms: {
    kicker: 'Terms of use',
    h1: 'Terms of use',
    lede: 'AccessScan is free, hosted software. By using it you accept the terms below, which state, in substance, that it is provided without warranty and must be used responsibly.',
    sections: [
      {
        h: 'The software',
        bodyHtml: '<p>AccessScan is a free, hosted accessibility scanner for WCAG 2.x and EAA checks. It is provided <strong>as is</strong>, without warranty of any kind, express or implied, including fitness for a particular purpose, accuracy, or availability. The project is MIT licensed; the full text is in the <a href="https://github.com/Afkhomie/AccessScan/blob/master/LICENSE" rel="noopener">LICENSE</a> file.</p>',
      },
      {
        h: 'What a scan is and is not',
        bodyHtml: '<p>Automated scans detect only a fraction of real accessibility issues. Published research places the figure at approximately <strong>30–57%</strong> of WCAG problems (per Deque). A clean report does <em>not</em> mean that a site complies with WCAG or the European Accessibility Act, and flagged issues are a starting point for remediation, not a legal determination. Where compliance matters, verify results with a manual audit. EAA enforcement applies in the EU as of June 2025. This tool is an aid, not a substitute for professional expertise.</p>',
      },
      {
        h: 'Acceptable use',
        bodyHtml: '<p>AccessScan includes safeguards, such as blocking private and internal network addresses, but safeguards are not permission. You agree to the following:</p>',
        list: [
          'Scan only websites you own or have explicit permission to test',
          'Refrain from using the tool to attack, probe, overload, or otherwise misuse any system',
          'Not attempt to bypass the built-in SSRF and network protections, or to use the scanner as a proxy to reach hosts you could not reach directly',
          'Not represent scan results as a professional accessibility audit',
        ],
        afterListHtml: '<p>Use that violates these terms may contravene the laws of your jurisdiction and/or the terms of service of the target site.</p>',
      },
      {
        h: 'Liability',
        bodyHtml: '<p>To the maximum extent permitted by law, the operator (Afkhomie, via GitHub) accepts no liability for any damages, whether direct, indirect, incidental, or consequential, arising from the use of AccessScan. This includes reliance on scan results, accessibility or legal outcomes, and interactions with scanned websites. You use the tool at your own risk.</p>',
      },
      {
        h: 'Changes and contact',
        bodyHtml: '<p>These terms may be updated as the project evolves; the version on this page is current. Questions: <a href="https://github.com/Afkhomie/AccessScan/issues" rel="noopener">open a GitHub issue</a>.</p>',
      },
    ],
  },

  /* ---------- 404.html ---------- */
  notFound: {
    kicker: 'Error 404',
    h1: 'Page not found',
    lede: 'That page does not exist. The scanner is the main page.',
    back: 'Back to scanner',
  },
};

/* ---------- data-copy fill ---------- */
(function () {
  function resolve(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), window.COPY);
  }
  function fill() {
    document.querySelectorAll('[data-copy]').forEach((el) => {
      const v = resolve(el.getAttribute('data-copy'));
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-copy-html]').forEach((el) => {
      const v = resolve(el.getAttribute('data-copy-html'));
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll('[data-copy-placeholder]').forEach((el) => {
      const v = resolve(el.getAttribute('data-copy-placeholder'));
      if (v != null) el.placeholder = v;
    });
    document.querySelectorAll('[data-copy-aria-label]').forEach((el) => {
      const v = resolve(el.getAttribute('data-copy-aria-label'));
      if (v != null) el.setAttribute('aria-label', v);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else {
    fill();
  }
})();
