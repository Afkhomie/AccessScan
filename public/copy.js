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
    navScanner: 'Scanner',
    navRuleReference: 'Rule reference',
    footer: {
      line: 'AccessScan: no accounts, no payments, no database, no cloud. MIT licensed.',
      linkRuleReference: 'WCAG rule reference',
      linkPrivacy: 'Privacy Policy',
      linkTerms: 'Terms of Use',
      linkScanner: 'Scanner',
    },
  },

  /* ---------- index.html ---------- */
  index: {
    meta: {
      kicker: 'WCAG 2.x · EAA · axe-core · local-first',
      h1: 'Check whether your website is accessible.',
      lede: 'Scan a public page for common WCAG 2.x failures relevant to the EU Accessibility Act. Runs locally, is free, and requires no account or tracking.',
    },
    navLimitations: 'Limitations',
    form: {
      urlLabel: 'Website URL',
      urlPlaceholder: 'example.com',
      crawlLabel: 'Also scan linked pages on the same site:',
      maxPagesLabel: 'Maximum pages to scan',
      maxPages1: 'just this page',
      maxPages3: 'up to 3 pages',
      maxPages5: 'up to 5 pages',
      maxPages10: 'up to 10 pages',
    },
    progress: {
      starting: 'Starting…',
      startingScan: 'Starting scan…',
      subInitial: 'This can take up to a minute on slow sites.',
      subSlow: 'Still working. This scan is taking longer than usual.',
    },
    recent: {
      heading: 'Recent scans',
      note: 'Retained in memory only. Deleted when the server restarts.',
      view: 'View',
      viewAria: 'View scan of {url} from {when}',
      fallbackLabel: 'scan',
      scanningLabel: 'scanning…',
      failedLabel: 'failed',
    },
    disclaimer: {
      html: '<strong>Important limitation:</strong> Automated scans of this kind detect approximately <strong>30–57%</strong> of WCAG issues (per Deque\u2019s research). A clean result does <em>not</em> mean the site is compliant, and reported issues do not by themselves establish a legal violation. They indicate problems that warrant attention. EAA enforcement applies in the EU as of June 2025. For assurance, obtain a manual audit.',
    },
    results: {
      heading: 'Report',
      downloadHtml: 'Download HTML',
      downloadJson: 'Download JSON',
      downloadPdf: 'Download PDF',
      newScan: 'Scan another URL',
    },
    how: {
      heading: 'How it works',
      items: [
        { title: 'Enter a URL', body: 'Any public http(s) page. Private and internal addresses are blocked.' },
        { title: 'The page is loaded in a headless browser', body: 'The rendered DOM is checked against WCAG 2.x rules using axe-core.' },
        { title: 'Review the report', body: 'Issues are grouped by severity and include the affected element, an HTML snippet, and remediation guidance. Up to 10 pages may be scanned, including same-site links.' },
      ],
    },
    faq: {
      heading: 'FAQs',
      items: [
        {
          q: 'Does a clean scan demonstrate WCAG or EAA compliance?',
          a: 'No. Automated tools of this kind detect approximately <strong>30–57%</strong> of WCAG issues (per Deque\u2019s research); many criteria require human judgement that no scanner can apply. A clean report means that no common automated failures were found, not that the site is compliant. For assurance, pair the scan with a manual audit.',
        },
        {
          q: 'Is AccessScan free? Is an account required?',
          a: 'Yes, it is free, and no account is required. AccessScan is MIT licensed and uses no signup, payment, or tracking. It runs on the machine that hosts it; if that is your own installation, the only outbound request is the one made to load the site being scanned.',
        },
        {
          q: 'Where is scan data stored?',
          a: 'Scan URLs and results are held in server memory only. The 20 most recent scans are retained in memory, and all data is deleted when the server restarts. Nothing is written to disk or transmitted elsewhere; the only outbound traffic is the headless browser loading the submitted page. Credentials included in a submitted URL are removed before storage.',
        },
        {
          q: 'Which rules does the scanner check?',
          a: '<a href="rules.html">axe-core</a> WCAG 2.x rules at A/AA level (2.0, 2.1 and 2.2 success criteria). Each scan reports violations grouped by severity (critical, serious, moderate, minor), with the affected element, an HTML snippet, and remediation guidance, plus items axe flagged as <em>requiring manual review</em> because a human must decide.',
        },
        {
          q: 'Can the scanner cover an entire site?',
          a: 'Yes. Crawl mode follows links on the same origin and scans up to 10 pages in total (1, 3, 5 or 10, as selected). Pages are scanned two at a time under an approximate three-minute limit, so very large sites may be only partially covered. Select the most important pages for the best coverage.',
        },
        {
          q: 'How does AccessScan differ from Lighthouse?',
          a: 'Lighthouse combines accessibility with performance and SEO in a single lab score. AccessScan provides focused accessibility detail: each axe rule is explained, per-element snippets are provided for developers, and reports can be exported as HTML, JSON or PDF. The two tools complement each other.',
        },
        {
          q: 'Is it lawful to scan any website?',
          a: 'Scan only websites you own or have explicit permission to test. AccessScan blocks private and internal network addresses as a safety measure, but technical safeguards do not constitute permission. Automated scanning can still generate page loads and trigger rate limits on another party\u2019s server; see the <a href="terms.html">acceptable use</a> section of the terms.',
        },
      ],
    },
  },

  /* ---------- Dynamic strings rendered by app.js ---------- */
  app: {
    phases: {
      queued: 'Queued',
      loading: 'Loading page in a real browser',
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
      serverError: 'An error occurred on the server side. The service may be starting up; please try again in a minute.',
      generic: 'Something went wrong. Please try again.',
      unreachable: 'Could not reach the local server. Is it still running?',
      expired: 'The scan result expired before it finished (the server retains only recent scans). Start a new scan to try again.',
      hiccup: 'The service reported an error while checking progress. Please try again in a moment.',
      statusError: 'An error occurred while checking scan status. Please try again in a moment.',
      lostConnection: 'Lost connection to the local server. Check that it is still running, then try again.',
      interrupted: 'Scan interrupted.',
      unknown: 'Unknown error.',
      failed: 'Scan failed.',
      notFinished: 'Scan not finished.',
      historyGone: 'That scan is no longer available (results are kept in memory only).',
      serverGone: 'Could not reach the local server.',
      enterUrl: 'Enter a URL first.',
      invalidUrl: 'Enter a valid URL, e.g. example.com',
      reportLoaded: 'Scan report loaded',
    },
    report: {
      scannedMeta: 'Scanned {pages} · {date}',
      crawledSuffix: ' · crawl mode included same-site links',
      cleanTitle: 'No violations found',
      cleanSub: 'under the rules evaluated',
      sevLabels: {
        critical: 'Critical',
        serious: 'Serious',
        moderate: 'Moderate',
        minor: 'Minor',
      },
      sevNotes: {
        critical: 'may prevent access for some users',
        serious: 'creates significant barriers',
        moderate: 'impedes some tasks',
        minor: 'minor improvements',
      },
      sevGridNote: 'Each count is per rule per page. The same rule failing on two pages is counted twice.',
      cleanNote: 'axe-core found no violations under the rules evaluated. This is not a compliance guarantee; see the disclaimer above.',
      violationsNote: '{rules} {ruleWord} failed across {nodes} {nodeWord}. Severity is axe\u2019s impact rating; address critical and serious findings first.',
      passesNote: ' axe passed {passes} {passWord} and flagged {incomplete} {incompleteWord} requiring manual review.',
      nextStep: 'Share the exported report with whoever maintains this site.',
      pageError: 'Could not scan {url}.',
      tabErrorSuffix: ' (error)',
      compareLine: 'vs scan {when}: <strong>+{added} new</strong>, <strong>−{fixed} fixed</strong>, {sev} {sevWord}',
      comparePrevious: 'a previous scan',
      compareDetails: 'Details',
      compareAdded: 'New issues',
      compareFixed: 'Fixed since then',
      compareSeverity: 'Severity changed',
      reviewTitle: 'Requires manual review ({n} {ruleWord})',
      reviewSub: 'axe could not determine pass or fail automatically. Verify these items manually.',
      reviewRef: 'reference ↗',
      filterAll: 'All ({n})',
      filterSearchPlaceholder: 'Filter by rule or text…',
      filterSearchLabel: 'Filter issues',
      emptyStateTitle: 'No matching issues.',
      emptyStateBody: 'Adjust the filters, or this page passed every checked rule.',
      fieldElement: 'Element',
      fieldNoSelector: '(no selector)',
      fieldSnippet: 'HTML snippet',
      fieldWhy: 'Why it failed',
      fieldFix: 'How to fix',
      fieldAxeSummary: 'axe summary',
      linkWhatThisMeans: 'What this means',
      linkOfficialDocs: 'official documentation ↗',
      linkFullFixGuide: 'Full fix guide',
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
    kicker: 'Rule reference · axe-core 4.14',
    h1: 'WCAG rule reference',
    lede: 'Plain-language explanations of the accessibility rules AccessScan checks, grouped by WCAG 2.x principle. Each entry links to the full axe-core reference.',
    disclaimerHtml: '<strong>Not exhaustive.</strong> This page covers the most commonly reported rules, not the full axe-core rule set. For the complete list and deeper guidance, consult the <a href="https://dequeuniversity.com/rules/axe/4.14" rel="noopener">Deque University axe rule index</a>. Rules tagged “best practice” are axe recommendations, not WCAG failures.',
    filterLabel: 'Filter rules',
    filterPlaceholder: 'Filter rules. Try “contrast”, “label”, “aria”…',
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
      { num: '1', name: 'Perceivable', blurb: 'Information and user interface components must be presentable in ways users can perceive; not by colour alone, not silently, not at unreadable sizes.' },
      { num: '2', name: 'Operable', blurb: 'User interface components and navigation must be operable; keyboard reachable, free of traps, and free of seizure risks.' },
      { num: '3', name: 'Understandable', blurb: 'Information and the operation of the user interface must be understandable; through labels, declared language, and consistent structure.' },
      { num: '4', name: 'Robust', blurb: 'Content must be robust enough for assistive technologies to interpret correctly; valid ARIA usage and unique identifiers.' },
      { num: 'B', name: 'Best practices', blurb: 'axe flags these as good practice rather than WCAG failures; addressing them generally benefits users.' },
    ],
  },

  /* ---------- privacy.html ---------- */
  privacy: {
    kicker: 'Privacy',
    h1: 'Privacy policy',
    lede: 'AccessScan is a local tool with nothing to track. This page states exactly what data exists and where it is sent, which in practice is nowhere.',
    sections: [
      {
        h: 'What data exists',
        bodyHtml: '<p>Only two things: <strong>the URLs you submit</strong> and <strong>the scan results</strong> for them. Both are held in the memory (RAM) of the server process on your own machine, where the tool itself runs. There is no database, no scan log file, and nothing is written to disk.</p><p>Your browser stores nothing either: no cookies, no local storage, no session state. Closing the tab or restarting the server removes everything.</p>',
      },
      {
        h: 'What leaves your machine',
        bodyHtml: '<p>Your browser communicates only with the AccessScan server on <code>127.0.0.1</code>, your own computer. From there, the single outbound action is the purpose of the tool itself: <strong>the server retrieves the website URL you supplied</strong> and performs an accessibility check on the rendered page, in the same manner as your browser. The target site receives a normal page request bearing a User-Agent string that identifies AccessScan.</p><p>There are no third-party requests: no analytics, no telemetry, no CDN-hosted scripts or fonts, no external fonts or trackers. Every script and stylesheet is served by the same local server. The only external links on this site are documentation references (such as the axe-core rule index) that load only if you choose to open them.</p>',
      },
      {
        h: 'What AccessScan does not do',
        list: [
          'Set cookies or track users in any form',
          'Require accounts, registration, or login',
          'Collect analytics or usage statistics',
          'Load third-party SDKs or external services',
          'Process payments; the tool is free',
          'Use a database or cloud storage',
        ],
      },
      {
        h: 'Data retention',
        bodyHtml: '<p>Scan records are retained in memory only, capped at the 20 most recent scans, and are deleted when the server process stops. To keep a copy of a report, export it (HTML, JSON, or PDF) before restarting. Exports are generated locally and downloaded to your browser like any ordinary file.</p>',
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
    lede: 'AccessScan is free software that runs on your own machine. By using it you accept the terms below, which state, in substance, that it is provided without warranty and must be used responsibly.',
    sections: [
      {
        h: 'The software',
        bodyHtml: '<p>AccessScan is a free, local-first accessibility scanner for WCAG 2.x and EAA checks. It is provided <strong>as is</strong>, without warranty of any kind, express or implied, including fitness for a particular purpose, accuracy, or availability. The project is MIT licensed; the full text is in the <a href="https://github.com/Afkhomie/AccessScan/blob/master/LICENSE" rel="noopener">LICENSE</a> file.</p>',
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
    lede: 'The requested address does not exist on this server. AccessScan consists of a single page: the scanner.',
    back: 'Return to the scanner',
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
