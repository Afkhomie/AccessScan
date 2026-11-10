/* AccessScan — WCAG rule reference data + renderer.
 *
 * Rule ids, axe help text and helpUrls come from axe-core 4.14 rule metadata
 * (the version bundled in node_modules). WCAG criteria are derived from the
 * rule's wcag2* tags. Rules tagged best-practice are grouped separately —
 * axe flags them as good practice, not WCAG failures.
 *
 * Each entry renders as <article id="rule-id"> so app.js can deep-link with
 * rules.html#<rule-id>. The "←" anchor links back to the report/scanner.
 */
'use strict';

const RULES = [
  // ---------- Perceivable ----------
  {
    id: 'color-contrast',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    wcag: '1.4.3', level: 'AA',
    means: 'Text is too hard to read against its background — the color difference doesn\u2019t meet the minimum contrast ratio (4.5:1 for normal text, 3:1 for large text).',
    fix: [
      'Darken the text or lighten the background until the ratio passes.',
      'Check background images/gradients behind the text, not just the flat color.',
      'Don\u2019t rely on color alone to convey meaning (pair with an icon or label).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=axeAPI',
  },
  {
    id: 'image-alt',
    help: 'Images must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An <img> has no alt text (or a missing/empty value where one is needed), so screen readers can\u2019t describe it.',
    fix: [
      'Add alt="..." describing the image\u2019s purpose — not just what it looks like.',
      'For purely decorative images, use alt="" so screen readers skip them.',
      'For images that are links/buttons, the alt text becomes the link name.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI',
  },
  {
    id: 'input-image-alt',
    help: 'Image buttons must have alternative text',
    wcag: '1.1.1 / 4.1.2', level: 'A',
    means: 'An <input type="image"> button has no alt text, so its purpose is invisible to assistive tech.',
    fix: [
      'Add alt="..." describing the action (e.g. alt="Search").',
      'Or use a regular <button> with text instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/input-image-alt?application=axeAPI',
  },
  {
    id: 'svg-img-alt',
    help: '<svg> elements with an img or image role must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An SVG used as an image has no accessible name — screen readers may announce it as "graphic" or skip it.',
    fix: [
      'Add role="img" plus aria-label or <title> inside the SVG.',
      'For decorative SVGs, add aria-hidden="true" and focusable="false".',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/svg-img-alt?application=axeAPI',
  },
  {
    id: 'role-img-alt',
    help: '[role="img"] and [role="image"] elements must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An element marked role="img" has no accessible name describing the image it represents.',
    fix: [
      'Add aria-label or aria-labelledby with a description.',
      'Or give it role="presentation"/aria-hidden if it\u2019s decorative.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/role-img-alt?application=axeAPI',
  },
  {
    id: 'object-alt',
    help: '<object> elements must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An <object> embed (PDF, Flash-era content, etc.) has no fallback text if it can\u2019t load.',
    fix: [
      'Provide fallback content inside the <object> tags.',
      'Prefer modern embeds or a link to the file instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/object-alt?application=axeAPI',
  },
  {
    id: 'video-caption',
    help: '<video> elements must have captions',
    wcag: '1.2.2', level: 'A',
    means: 'A <video> has no captions track, so deaf/hard-of-hearing users can\u2019t follow the audio.',
    fix: [
      'Add a <track kind="captions"> with a .vtt file.',
      'For background video, mute it or provide a transcript nearby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/video-caption?application=axeAPI',
  },
  {
    id: 'audio-caption',
    help: '<audio> elements must have a captions track',
    wcag: '1.2.1', level: 'A',
    means: 'An <audio> element has no captions, so its spoken content isn\u2019t available to deaf users.',
    fix: [
      'Add a captions track, or link to a transcript.',
      'If it\u2019s ambient/background, consider whether it needs captions at all.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/audio-caption?application=axeAPI',
  },
  {
    id: 'no-autoplay-audio',
    help: '<video> or <audio> elements must not play automatically',
    wcag: '1.4.2', level: 'A',
    means: 'Media plays automatically for more than 3 seconds without a way to pause or control it — disruptive for screen reader and low-vision users.',
    fix: [
      'Remove autoplay, or add controls and pause after 3 seconds.',
      'Never autoplay with sound.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/no-autoplay-audio?application=axeAPI',
  },
  {
    id: 'link-in-text-block',
    help: 'Links must be distinguishable without relying on color',
    wcag: '1.4.1', level: 'A',
    means: 'Links inside paragraphs are only set apart by color — users who can\u2019t perceive that color can\u2019t tell they\u2019re links.',
    fix: [
      'Add an underline (default link styling already does this).',
      'Or use a non-color cue like bold or an icon.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/link-in-text-block?application=axeAPI',
  },
  {
    id: 'meta-viewport',
    help: 'Zooming and scaling must not be disabled',
    wcag: '1.4.4', level: 'AA',
    means: 'The viewport meta tag sets user-scalable=no or maximum-scale=1, preventing users from zooming the page.',
    fix: [
      'Remove user-scalable=no and maximum-scale restrictions.',
      'A plain content="width=device-width, initial-scale=1" is fine.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-viewport?application=axeAPI',
  },
  {
    id: 'valid-lang',
    help: 'lang attribute must have a valid value',
    wcag: '3.1.2', level: 'AA',
    means: 'A lang attribute (on html or a part) uses a value BCP47/the spec doesn\u2019t recognize.',
    fix: [
      'Use a valid language tag like "en", "en-US", "fr".',
      'Check for typos — a wrong value silently breaks pronunciation and translation tools.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/valid-lang?application=axeAPI',
  },
  {
    id: 'avoid-inline-spacing',
    help: 'Inline text spacing must be adjustable with custom stylesheets',
    wcag: '1.4.12', level: 'AA',
    means: 'Text containers clip content when users apply their own letter/word/line spacing overrides — important for dyslexia and low-vision users.',
    fix: [
      'Remove fixed heights on text containers; let content grow.',
      'Avoid !important on line-height/letter-spacing rules.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/avoid-inline-spacing?application=axeAPI',
  },
  {
    id: 'table-fake-caption',
    help: 'Data or header cells must not be used to give caption to a data table',
    wcag: '1.3.1', level: 'A',
    means: 'A table\u2019s "caption" is faked with a cell instead of a real <caption> element, so assistive tech doesn\u2019t announce the table\u2019s purpose.',
    fix: [
      'Use <caption> as the first child of <table>.',
      'Or use aria-label / aria-labelledby on the table.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/table-fake-caption?application=axeAPI',
  },
  {
    id: 'th-has-data-cells',
    help: 'Table headers in a data table must refer to data cells',
    wcag: '1.3.1', level: 'A',
    means: 'A header cell (<th>) isn\u2019t associated with any data cells — screen reader users hear a heading with no content under it.',
    fix: [
      'Make sure each <th> governs at least one data cell (correct row/col structure).',
      'If the cell is decorative, use <td> or aria-hidden.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/th-has-data-cells?application=axeAPI',
  },
  {
    id: 'autocomplete-valid',
    help: 'autocomplete attribute must be used correctly',
    wcag: '1.3.5', level: 'AA',
    means: 'A form field uses an autocomplete token that doesn\u2019t match the field\u2019s purpose (e.g. autocomplete="email" on a phone field).',
    fix: [
      'Use the correct token from the HTML spec (name, email, tel, street-address, etc.).',
      'Set autocomplete="off" explicitly if the field genuinely shouldn\u2019t autofill.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/autocomplete-valid?application=axeAPI',
  },
  {
    id: 'image-redundant-alt',
    help: 'Alternative text of images should not be repeated as text',
    wcag: 'best-practice',
    means: 'An image\u2019s alt text is also written out next to the image, so screen readers hear it twice.',
    fix: [
      'Keep the alt text concise; remove the duplicated visible text, or vice versa.',
      'If the visible text adds info, shorten the alt instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-redundant-alt?application=axeAPI',
  },
  {
    id: 'area-alt',
    help: 'Active <area> elements must have alternative text',
    wcag: '2.4.4 / 4.1.2', level: 'A',
    means: 'An <area> inside an image map is a clickable link with no alt text, so its destination is invisible to screen readers.',
    fix: [
      'Add alt="..." describing where the area links to.',
      'Remove <area> elements that aren\u2019t used.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/area-alt?application=axeAPI',
  },
  {
    id: 'aria-meter-name',
    help: 'ARIA meter nodes must have an accessible name',
    wcag: '1.1.1', level: 'A',
    means: 'A meter widget (role="meter") has no accessible name, so screen readers announce a value with no idea what is being measured.',
    fix: [
      'Add aria-label or aria-labelledby describing what the meter measures.',
      'Or use <meter> / <progress> where native semantics fit.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-meter-name?application=axeAPI',
  },
  {
    id: 'aria-progressbar-name',
    help: 'ARIA progressbar nodes must have an accessible name',
    wcag: '1.1.1', level: 'A',
    means: 'A progressbar widget has no accessible name, so screen readers announce a percentage with no context.',
    fix: [
      'Add aria-label or aria-labelledby (e.g. "Upload progress").',
      'Or use the native <progress> element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-progressbar-name?application=axeAPI',
  },
  {
    id: 'css-orientation-lock',
    help: 'CSS must not lock display orientation',
    wcag: '1.3.4', level: 'AA',
    means: 'CSS forces the page into portrait or landscape only, so users who mounted their device differently can\u2019t use it.',
    fix: [
      'Remove orientation-locking CSS; let the layout reflow in both orientations.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/css-orientation-lock?application=axeAPI',
  },
  {
    id: 'p-as-heading',
    help: 'Styled <p> elements must not be used as headings',
    wcag: '1.3.1', level: 'A',
    means: 'A <p> styled to look like a heading (big, bold) isn\u2019t a real heading, so screen reader heading navigation skips it.',
    fix: [
      'Replace it with <h1>\u2013<h6> and move the styling to CSS.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/p-as-heading?application=axeAPI',
  },
  {
    id: 'td-has-header',
    help: 'Non-empty <td> elements in larger <table> must have an associated table header',
    wcag: '1.3.1', level: 'A',
    means: 'A data cell in a multi-row/column table has no header association, so screen readers can\u2019t announce what the value means.',
    fix: [
      'Use <th scope="col"/"row"> for headers, or headers="..." referencing the right <th>.',
      'For simple layout-free data tables, proper <th> markup is usually enough.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/td-has-header?application=axeAPI',
  },
  {
    id: 'td-headers-attr',
    help: 'Table cell headers attributes must refer to other <th> elements in the same table',
    wcag: '1.3.1', level: 'A',
    means: 'A headers="..." attribute points at an id that doesn\u2019t exist, isn\u2019t a <th>, or lives in a different table.',
    fix: [
      'Make sure every id in headers= matches a real <th id="..."> in the same table.',
      'Keep ids unique across the page.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/td-headers-attr?application=axeAPI',
  },

  // ---------- Operable ----------
  {
    id: 'bypass',
    help: 'Page must have means to bypass repeated blocks',
    wcag: '2.4.1', level: 'A',
    means: 'Keyboard users must tab through the entire nav/header on every page before reaching content — no skip link or landmark shortcut.',
    fix: [
      'Add a "Skip to main content" link as the first focusable element.',
      'Or ensure a <main> landmark exists and is reachable.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/bypass?application=axeAPI',
  },
  {
    id: 'document-title',
    help: 'Documents must have <title> element to aid in navigation',
    wcag: '2.4.2', level: 'A',
    means: 'The page has no <title> (or an empty one), so browser tabs, bookmarks, and screen reader page lists show nothing useful.',
    fix: [
      'Add a unique, descriptive <title> to every page.',
      'Lead with the page topic, keep it under ~60 characters.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/document-title?application=axeAPI',
  },
  {
    id: 'link-name',
    help: 'Links must have discernible text',
    wcag: '2.4.4 / 4.1.2', level: 'A',
    means: 'A link has no accessible name — icon-only links, empty anchors, or links whose only content is an unlabeled image.',
    fix: [
      'Add visible text, aria-label, or aria-labelledby.',
      'For icon links, give the SVG/icon an accessible name.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/link-name?application=axeAPI',
  },
  {
    id: 'button-name',
    help: 'Buttons must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'A <button> (or role="button") has no accessible name — screen readers announce just "button".',
    fix: [
      'Add text content, aria-label, or aria-labelledby.',
      'Icon-only buttons need aria-label describing the action.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/button-name?application=axeAPI',
  },
  {
    id: 'input-button-name',
    help: 'Input buttons must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'An <input type="button|submit|reset"> has no value/text, so its purpose is unknown.',
    fix: [
      'Set the value attribute (e.g. value="Search").',
      'Or use a <button> element with text.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/input-button-name?application=axeAPI',
  },
  {
    id: 'summary-name',
    help: 'Summary elements must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'A <summary> (the clickable part of <details>) has no text, so users don\u2019t know what it expands.',
    fix: [
      'Put descriptive text inside <summary>.',
      'If it\u2019s icon-only, add aria-label.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/summary-name?application=axeAPI',
  },
  {
    id: 'aria-command-name',
    help: 'ARIA commands must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An element with an ARIA role like link/button/menuitem has no accessible name.',
    fix: [
      'Add aria-label/aria-labelledby or text content.',
      'Prefer native elements (<a>, <button>) over ARIA roles when possible.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-command-name?application=axeAPI',
  },
  {
    id: 'aria-dialog-name',
    help: 'ARIA dialog and alertdialog nodes should have an accessible name',
    wcag: 'best-practice',
    means: 'A role="dialog"/"alertdialog" element has no accessible name, so users don\u2019t know what the dialog is for.',
    fix: [
      'Add aria-label or aria-labelledby pointing at the dialog\u2019s heading.',
      'Prefer the native <dialog> element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-dialog-name?application=axeAPI',
  },
  {
    id: 'aria-treeitem-name',
    help: 'ARIA treeitem nodes should have an accessible name',
    wcag: 'best-practice',
    means: 'A role="treeitem" has no accessible name.',
    fix: [
      'Add aria-label/aria-labelledby or text content to the treeitem.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-treeitem-name?application=axeAPI',
  },
  {
    id: 'marquee',
    help: '<marquee> elements are deprecated and must not be used',
    wcag: '2.2.2', level: 'A',
    means: 'Scrolling <marquee> text can\u2019t be paused and is a seizure/distraction risk — it\u2019s also ignored inconsistently by modern browsers.',
    fix: [
      'Remove it; use static text or a proper animation with a pause control.',
      'CSS animation alone isn\u2019t enough — WCAG 2.2.2 still requires a stop mechanism.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/marquee?application=axeAPI',
  },
  {
    id: 'blink',
    help: '<blink> elements are deprecated and must not be used',
    wcag: '2.2.2', level: 'A',
    means: 'Blinking <blink> text is a seizure hazard and isn\u2019t supported by modern browsers anyway.',
    fix: [
      'Remove it entirely — never reimplement flashing text with CSS/JS.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/blink?application=axeAPI',
  },
  {
    id: 'meta-refresh',
    help: 'Delayed refresh under 20 hours must not be used',
    wcag: '2.2.1', level: 'A',
    means: 'A <meta http-equiv="refresh"> reloads the page automatically, yanking users (especially screen reader users mid-sentence) away.',
    fix: [
      'Remove the meta refresh; use a real link or JS with user control.',
      'Session timeouts need a warning + extend option instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-refresh?application=axeAPI',
  },
  {
    id: 'meta-refresh-no-exceptions',
    help: 'Delayed refresh must not be used',
    wcag: '2.2.4 / 3.2.5', level: 'AAA',
    means: 'AAA-level stricter version: no timed refresh at all, even with user control.',
    fix: [
      'Remove timed refreshes entirely.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-refresh-no-exceptions?application=axeAPI',
  },
  {
    id: 'scrollable-region-focusable',
    help: 'Scrollable region must have keyboard access',
    wcag: '2.1.1 / 2.1.3', level: 'A',
    means: 'A scrollable <div> (overflow:auto/scroll) can\u2019t be reached or scrolled with a keyboard alone.',
    fix: [
      'Add tabindex="0" to the scrollable region.',
      'Or better: use a natively scrollable element with real content.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/scrollable-region-focusable?application=axeAPI',
  },
  {
    id: 'target-size',
    help: 'All touch targets must be 24px large, or leave sufficient space',
    wcag: '2.5.8', level: 'AA',
    means: 'Buttons/links are too small or too close together to tap reliably — WCAG 2.2 target size minimum is 24×24 CSS px (with spacing exceptions).',
    fix: [
      'Increase padding/size to at least 24px in each dimension.',
      'Or ensure sufficient spacing between adjacent targets.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/target-size?application=axeAPI',
  },
  {
    id: 'identical-links-same-purpose',
    help: 'Links with the same name must have a similar purpose',
    wcag: '2.4.9', level: 'AAA',
    means: 'Two links share the same text (e.g. "read more") but go to different places — screen reader link lists become meaningless.',
    fix: [
      'Make link text unique and descriptive ("Read more about pricing").',
      'Or add context via aria-describedby if the visible text must stay short.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/identical-links-same-purpose?application=axeAPI',
  },
  {
    id: 'tabindex',
    help: 'Elements should not have tabindex greater than zero',
    wcag: 'best-practice',
    means: 'tabindex="1+" hijacks the natural tab order — keyboard users get thrown into an unexpected sequence.',
    fix: [
      'Use tabindex="0" (add to tab order) or tabindex="-1" (programmatic focus only).',
      'Fix the DOM order instead of overriding it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/tabindex?application=axeAPI',
  },
  {
    id: 'focus-order-semantics',
    help: 'Elements in the focus order should have an appropriate role',
    wcag: 'best-practice',
    means: 'A focusable element has no semantic role (e.g. a plain <div tabindex="0"> that acts like a button but isn\u2019t announced as one).',
    fix: [
      'Use the right native element (<button>, <a href>) or add a role.',
      'If it\u2019s a custom widget, implement the full ARIA pattern.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/focus-order-semantics?application=axeAPI',
  },
  {
    id: 'skip-link',
    help: 'The skip-link target should exist and be focusable',
    wcag: 'best-practice',
    means: 'A "skip to content" link points at an element that doesn\u2019t exist or can\u2019t receive focus.',
    fix: [
      'Make sure the skip link\u2019s href targets a real element (usually <main id="main">).',
      'The target needs tabindex="-1" so it can take programmatic focus.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/skip-link?application=axeAPI',
  },
  {
    id: 'frame-focusable-content',
    help: 'Frames with focusable content must not have tabindex=-1',
    wcag: '2.1.1', level: 'A',
    means: 'An <iframe> contains focusable content but has tabindex="-1", which can trap or break keyboard focus inside the frame.',
    fix: [
      'Remove tabindex="-1" from frames that contain interactive content.',
      'Ensure keyboard focus can move into and out of the frame.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/frame-focusable-content?application=axeAPI',
  },
  {
    id: 'label-content-name-mismatch',
    help: 'Elements must have their visible text as part of their accessible name',
    wcag: '2.5.3', level: 'A',
    means: 'The visible text of a control isn\u2019t part of its accessible name (e.g. aria-label overrides the button text), so voice-control users saying the visible label won\u2019t activate it.',
    fix: [
      'Make the accessible name start with the visible text, or match it.',
      'Don\u2019t let aria-label contradict what\u2019s on screen.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=axeAPI',
  },
  {
    id: 'server-side-image-map',
    help: 'Server-side image maps must not be used',
    wcag: '2.1.1', level: 'A',
    means: 'An old-style server-side image map (<img ismap>) produces click coordinates, not focusable links — keyboard and screen reader users can\u2019t use it.',
    fix: [
      'Replace it with a client-side image map of real <a> links, or a plain list of links.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/server-side-image-map?application=axeAPI',
  },

  // ---------- Understandable ----------
  {
    id: 'html-has-lang',
    help: '<html> element must have a lang attribute',
    wcag: '3.1.1', level: 'A',
    means: 'The <html> tag has no lang attribute, so screen readers don\u2019t know what language/pronunciation to use.',
    fix: [
      'Add lang="en" (or the correct BCP47 tag) to <html>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-has-lang?application=axeAPI',
  },
  {
    id: 'html-lang-valid',
    help: '<html> element must have a valid value for the lang attribute',
    wcag: '3.1.1', level: 'A',
    means: 'The lang attribute exists but the value isn\u2019t a recognized language tag.',
    fix: [
      'Use a valid tag: "en", "en-US", "pt-BR", etc.',
      'Check for typos like lang="eng" or lang="english".',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-lang-valid?application=axeAPI',
  },
  {
    id: 'html-xml-lang-mismatch',
    help: 'HTML elements with lang and xml:lang must have the same base language',
    wcag: '3.1.1', level: 'A',
    means: 'lang and xml:lang attributes disagree on the same element (common in XHTML-era markup).',
    fix: [
      'Set both to the same language, or drop xml:lang (rarely needed in HTML5).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-xml-lang-mismatch?application=axeAPI',
  },
  {
    id: 'label',
    help: 'Form elements must have labels',
    wcag: '4.1.2 / 3.3.2', level: 'A',
    means: 'An input/select/textarea has no associated <label>, aria-label, or aria-labelledby — screen readers announce "edit text" with no idea what it\u2019s for.',
    fix: [
      'Wrap the input in <label> or use for="id" matching the input\u2019s id.',
      'Or add aria-label="..." / aria-labelledby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label?application=axeAPI',
  },
  {
    id: 'label-title-only',
    help: 'Form elements should have a visible label',
    wcag: 'best-practice',
    means: 'A form field is labeled only via the title attribute (or placeholder) — visible labels are far more usable, especially on mobile and for low-vision users.',
    fix: [
      'Add a real visible <label>; don\u2019t rely on placeholder text alone.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label-title-only?application=axeAPI',
  },
  {
    id: 'select-name',
    help: 'Select element must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A <select> dropdown has no label, so users don\u2019t know what they\u2019re choosing.',
    fix: [
      'Associate a <label> or add aria-label/aria-labelledby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/select-name?application=axeAPI',
  },
  {
    id: 'form-field-multiple-labels',
    help: 'Form field must not have multiple label elements',
    wcag: '3.3.2', level: 'A',
    means: 'A field has more than one <label> associated, which can produce confusing or duplicated announcements.',
    fix: [
      'Keep one label per field; merge extra text into aria-describedby if needed.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/form-field-multiple-labels?application=axeAPI',
  },
  {
    id: 'list',
    help: '<ul> and <ol> must only directly contain <li>, <script> or <template> elements',
    wcag: '1.3.1', level: 'A',
    means: 'A list contains non-<li> children (divs, spans, other elements), breaking the list structure screen readers rely on.',
    fix: [
      'Make every direct child an <li>. If you need wrappers, put them inside the <li>.',
      'If it\u2019s not really a list, don\u2019t use <ul>/<ol>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/list?application=axeAPI',
  },
  {
    id: 'listitem',
    help: '<li> elements must be contained in a <ul> or <ol>',
    wcag: '1.3.1', level: 'A',
    means: 'An <li> sits outside any list, so it\u2019s announced as a stray list item.',
    fix: [
      'Wrap it in <ul> or <ol>, or change it to a <div>/<p>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/listitem?application=axeAPI',
  },
  {
    id: 'definition-list',
    help: '<dl> elements must only directly contain properly-ordered <dt> and <dd> groups',
    wcag: '1.3.1', level: 'A',
    means: 'A definition list has broken structure — <dd> without <dt>, wrong order, or stray elements.',
    fix: [
      'Each <dt> should be followed by its <dd>(s); only <div> wrappers are allowed between groups.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/definition-list?application=axeAPI',
  },
  {
    id: 'dlitem',
    help: '<dt> and <dd> elements must be contained by a <dl>',
    wcag: '1.3.1', level: 'A',
    means: 'A <dt> or <dd> is used outside a <dl> definition list.',
    fix: [
      'Wrap them in <dl>, or use regular headings/paragraphs.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/dlitem?application=axeAPI',
  },
  {
    id: 'page-has-heading-one',
    help: 'Page should contain a level-one heading',
    wcag: 'best-practice',
    means: 'The page has no <h1>, so there\u2019s no clear top-level topic for screen reader users navigating by headings.',
    fix: [
      'Add exactly one <h1> describing the page\u2019s main topic.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/page-has-heading-one?application=axeAPI',
  },
  {
    id: 'heading-order',
    help: 'Heading levels should only increase by one',
    wcag: 'best-practice',
    means: 'Headings skip levels (e.g. h1 → h3), which confuses the document outline screen readers build.',
    fix: [
      'Don\u2019t skip levels: h1 → h2 → h3 in order.',
      'Style with CSS instead of choosing a heading level for looks.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/heading-order?application=axeAPI',
  },
  {
    id: 'empty-heading',
    help: 'Headings should not be empty',
    wcag: 'best-practice',
    means: 'A heading element has no text — screen reader users hear "heading level 2" with nothing after it.',
    fix: [
      'Give it real text, or remove the heading element.',
      'If populated by JS, ensure it\u2019s filled before axe runs.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/empty-heading?application=axeAPI',
  },
  {
    id: 'empty-table-header',
    help: 'Table header text should not be empty',
    wcag: 'best-practice',
    means: 'A <th> has no text, so screen reader users hear a column/row header with no label.',
    fix: [
      'Add text or aria-label to the header cell, or use aria-hidden if it\u2019s decorative.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/empty-table-header?application=axeAPI',
  },

  // ---------- Robust ----------
  {
    id: 'aria-valid-attr',
    help: 'ARIA attributes must conform to valid names',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-* attribute is misspelled or doesn\u2019t exist (e.g. aria-lable), so browsers ignore it.',
    fix: [
      'Fix the typo — valid names come from the ARIA spec (aria-label, aria-hidden, aria-describedby...).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-valid-attr?application=axeAPI',
  },
  {
    id: 'aria-roles',
    help: 'ARIA roles used must conform to valid values',
    wcag: '4.1.2', level: 'A',
    means: 'A role="..." value is misspelled or not a real ARIA role, so assistive tech can\u2019t interpret the element.',
    fix: [
      'Use a valid role from the ARIA spec, or remove the role and use native HTML.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-roles?application=axeAPI',
  },
  {
    id: 'aria-required-attr',
    help: 'Required ARIA attributes must be provided',
    wcag: '4.1.2', level: 'A',
    means: 'An ARIA role needs companion attributes that are missing (e.g. role="checkbox" without aria-checked).',
    fix: [
      'Add the required attributes for that role — check the ARIA spec or MDN.',
      'Or use the native HTML element which handles this for you.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-attr?application=axeAPI',
  },
  {
    id: 'aria-required-children',
    help: 'Certain ARIA roles must contain particular children',
    wcag: '1.3.1', level: 'A',
    means: 'A parent role like menu/listbox/tablist is missing the child roles it requires (menuitem, option, tab), so the widget structure is broken.',
    fix: [
      'Add the required child roles, or use native <ul>/<table> etc. that imply structure.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-children?application=axeAPI',
  },
  {
    id: 'aria-required-parent',
    help: 'Certain ARIA roles must be contained by particular parents',
    wcag: '1.3.1', level: 'A',
    means: 'An element has a role that requires a specific parent (e.g. role="menuitem" outside role="menu"), breaking the announced structure.',
    fix: [
      'Wrap it in the required parent role, or use native list/table markup.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-parent?application=axeAPI',
  },
  {
    id: 'aria-hidden-body',
    help: 'aria-hidden="true" must not be present on the document body',
    wcag: '1.3.1 / 4.1.2', level: 'A',
    means: 'aria-hidden="true" on <body> hides the entire page from screen readers — usually a leftover from a modal/dialog script.',
    fix: [
      'Remove it, or scope aria-hidden to the specific overlay element only.',
      'Ensure it\u2019s removed when the modal closes.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-hidden-body?application=axeAPI',
  },
  {
    id: 'aria-hidden-focus',
    help: 'ARIA hidden element must not be focusable or contain focusable elements',
    wcag: '4.1.2', level: 'A',
    means: 'Something hidden with aria-hidden still contains keyboard-focusable elements — keyboard users tab into invisible content.',
    fix: [
      'Remove tabindex from hidden elements, or don\u2019t aria-hide containers with focusable children.',
      'For modals, move focus into the dialog and trap it properly.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-hidden-focus?application=axeAPI',
  },
  {
    id: 'aria-prohibited-attr',
    help: 'Elements must only use permitted ARIA attributes',
    wcag: '4.1.2', level: 'A',
    means: 'An element uses an ARIA attribute its role forbids (e.g. aria-label on a generic <div> with no role).',
    fix: [
      'Remove the prohibited attribute, or give the element a role that allows it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-prohibited-attr?application=axeAPI',
  },
  {
    id: 'aria-text',
    help: '"role=text" should have no focusable descendants',
    wcag: 'best-practice',
    means: 'A role="text" element (non-standard, used to flatten accessibility trees) contains focusable elements that become unreachable.',
    fix: [
      'Remove role="text" or move focusable elements outside it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-text?application=axeAPI',
  },
  {
    id: 'duplicate-id-aria',
    help: 'IDs used in ARIA and labels must be unique',
    wcag: '4.1.2', level: 'A',
    means: 'The same id appears twice and is referenced by aria-labelledby/aria-describedby/label for — browsers pick one, possibly the wrong one.',
    fix: [
      'Make every id unique; rename duplicates.',
      'Check that aria references point at the intended element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/duplicate-id-aria?application=axeAPI',
  },
  {
    id: 'presentation-role-conflict',
    help: 'Elements marked as presentational should be consistently ignored',
    wcag: 'best-practice',
    means: 'An element has role="presentation"/"none" but also global ARIA or is focusable — conflicting signals confuse assistive tech.',
    fix: [
      'Remove the conflicting attributes, or drop the presentational role.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/presentation-role-conflict?application=axeAPI',
  },
  {
    id: 'nested-interactive',
    help: 'Interactive controls must not be nested',
    wcag: '4.1.2', level: 'A',
    means: 'A link/button/control sits inside another interactive element (e.g. <a> inside <button> or a card link wrapping buttons) — screen readers can\u2019t parse it.',
    fix: [
      'Restructure so interactive elements are siblings, not nested.',
      'For clickable cards, make the title the link and keep buttons separate.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/nested-interactive?application=axeAPI',
  },
  {
    id: 'landmark-one-main',
    help: 'Document should have one main landmark',
    wcag: 'best-practice',
    means: 'The page has no <main> (or role="main") landmark, or more than one — screen reader users can\u2019t jump straight to content.',
    fix: [
      'Wrap the primary content in a single <main> element.',
      'If multiple mains exist (e.g. in frames), give them distinct labels.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-one-main?application=axeAPI',
  },
  {
    id: 'landmark-unique',
    help: 'Landmarks should have a unique role or role/label/title combination',
    wcag: 'best-practice',
    means: 'Two landmarks share the same role and no distinguishing label, so they\u2019re indistinguishable in landmark navigation.',
    fix: [
      'Add aria-label/aria-labelledby to differentiate (e.g. two <nav> elements → "Main" and "Footer").',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-unique?application=axeAPI',
  },
  {
    id: 'landmark-no-duplicate-banner',
    help: 'Document should not have more than one banner landmark',
    wcag: 'best-practice',
    means: 'More than one banner landmark (<header> at top level) exists on the page.',
    fix: [
      'Keep one page header; nested <header> elements inside <article>/<section> are fine.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-no-duplicate-banner?application=axeAPI',
  },
  {
    id: 'landmark-no-duplicate-contentinfo',
    help: 'Document should not have more than one contentinfo landmark',
    wcag: 'best-practice',
    means: 'More than one footer landmark (<footer> at top level) exists.',
    fix: [
      'Keep one page footer; section-level <footer> elements are fine.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-no-duplicate-contentinfo?application=axeAPI',
  },
  {
    id: 'landmark-no-duplicate-main',
    help: 'Document should not have more than one main landmark',
    wcag: 'best-practice',
    means: 'More than one <main> landmark exists on the page.',
    fix: [
      'There should be exactly one main content area.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-no-duplicate-main?application=axeAPI',
  },
  {
    id: 'meta-viewport-large',
    help: 'Users should be able to zoom and scale the text up to 500%',
    wcag: 'best-practice',
    means: 'Even without disabling zoom, the layout breaks before users can reach 500% text zoom.',
    fix: [
      'Test at 500% zoom / 320px width; fix horizontal scrolling and clipping.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-viewport-large?application=axeAPI',
  },
  {
    id: 'frame-title',
    help: 'Frames must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An <iframe> or <frame> has no title, so screen reader users hear "frame" with no idea what\u2019s inside.',
    fix: [
      'Add title="..." describing the frame\u2019s content.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/frame-title?application=axeAPI',
  },
  {
    id: 'frame-title-unique',
    help: 'Frames must have a unique title attribute',
    wcag: '4.1.2', level: 'A',
    means: 'Two or more frames share the same title, so screen reader users can\u2019t tell them apart in the frame list.',
    fix: [
      'Give each frame a unique, descriptive title.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/frame-title-unique?application=axeAPI',
  },
  {
    id: 'aria-allowed-attr',
    help: 'Elements must only use supported ARIA attributes',
    wcag: '4.1.2', level: 'A',
    means: 'An element uses an aria-* attribute its role doesn\u2019t support (e.g. aria-label on a plain <div> with no role) — browsers and assistive tech may ignore it.',
    fix: [
      'Remove the unsupported attribute, or add a role that permits it.',
      'Check the ARIA spec for which attributes each role allows.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-allowed-attr?application=axeAPI',
  },
  {
    id: 'aria-braille-equivalent',
    help: 'aria-braille attributes must have a non-braille equivalent',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-braillelabel/aria-brailleroledescription has no plain-text fallback (aria-label/aria-roledescription), so refreshable braille displays can\u2019t adapt it.',
    fix: [
      'Provide the matching aria-label / aria-roledescription alongside the braille attribute.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-braille-equivalent?application=axeAPI',
  },
  {
    id: 'aria-conditional-attr',
    help: 'ARIA attributes must be used as specified for the element\u2019s role',
    wcag: '4.1.2', level: 'A',
    means: 'An ARIA attribute is used in a way its conditions forbid — e.g. a value only valid on certain roles, or a required companion attribute missing.',
    fix: [
      'Check the attribute\u2019s conditions in the ARIA spec; add required companions or remove it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-conditional-attr?application=axeAPI',
  },
  {
    id: 'aria-deprecated-role',
    help: 'Deprecated ARIA roles must not be used',
    wcag: '4.1.2', level: 'A',
    means: 'A role="..." uses a deprecated ARIA role (e.g. directory) that assistive tech may stop supporting.',
    fix: [
      'Swap for the modern equivalent or native HTML (e.g. <ul>/<li> instead of role="directory").',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-deprecated-role?application=axeAPI',
  },
  {
    id: 'aria-input-field-name',
    help: 'ARIA input fields must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An input-like ARIA widget (textbox, searchbox, spinbutton…) has no accessible name, so screen readers announce an unlabeled field.',
    fix: [
      'Add aria-label, aria-labelledby, or associate a visible <label>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-input-field-name?application=axeAPI',
  },
  {
    id: 'aria-roledescription',
    help: 'aria-roledescription must be on elements with a semantic role',
    wcag: '4.1.2', level: 'A',
    means: 'aria-roledescription is set on an element with no semantic role (or a prohibited one), so assistive tech may announce a made-up role users can\u2019t map.',
    fix: [
      'Only use it on elements with a real role, or remove it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-roledescription?application=axeAPI',
  },
  {
    id: 'aria-tab-name',
    help: 'ARIA tab nodes must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An element with role="tab" has no accessible name, so the tab strip announces unlabeled tabs.',
    fix: [
      'Add visible text or aria-label/aria-labelledby to each tab.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-tab-name?application=axeAPI',
  },
  {
    id: 'aria-toggle-field-name',
    help: 'ARIA toggle fields must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A toggle widget (checkbox, switch, menuitemcheckbox…) has no accessible name, so screen readers announce an unnamed control.',
    fix: [
      'Add aria-label, aria-labelledby, or a visible <label>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-toggle-field-name?application=axeAPI',
  },
  {
    id: 'aria-tooltip-name',
    help: 'ARIA tooltip nodes must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A role="tooltip" element has no accessible name/content for assistive tech to announce.',
    fix: [
      'Give the tooltip text content or an aria-label describing the hint.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-tooltip-name?application=axeAPI',
  },
  {
    id: 'aria-valid-attr-value',
    help: 'ARIA attributes must conform to valid values',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-* attribute has an invalid value (e.g. aria-expanded="yes" instead of true/false), so assistive tech ignores it.',
    fix: [
      'Use the allowed values from the ARIA spec (true/false, tokens, IDs…).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-valid-attr-value?application=axeAPI',
  },
];

const PRINCIPLES = [
  { key: 'p', num: '1', name: 'Perceivable', blurb: 'Information and UI must be presentable in ways users can perceive — not color-only, not silent, not tiny.' },
  { key: 'o', num: '2', name: 'Operable', blurb: 'UI components and navigation must be operable — keyboard reachable, no traps, no seizure risks.' },
  { key: 'u', num: '3', name: 'Understandable', blurb: 'Information and UI operation must be understandable — labels, language, consistent structure.' },
  { key: 'r', num: '4', name: 'Robust', blurb: 'Content must be robust enough for assistive technologies to interpret correctly — valid ARIA, unique IDs.' },
  { key: 'b', num: 'B', name: 'Best practices', blurb: 'axe flags these as good practice rather than WCAG failures — fixing them usually helps real users anyway.' },
];

const WCAG_PRINCIPLE_KEY = { '1': 'p', '2': 'o', '3': 'u', '4': 'r' };

function principleOf(rule) {
  if (!rule.wcag || rule.wcag === 'best-practice') return 'b';
  return WCAG_PRINCIPLE_KEY[rule.wcag[0]] || 'b'; // first digit of the WCAG criterion number
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function entryHtml(r) {
  const wcagBadge = r.wcag === 'best-practice'
    ? '<span class="wcag-tag">best practice</span>'
    : `<span class="wcag-tag">WCAG ${esc(r.wcag)}</span><span class="wcag-tag">${esc(r.level || '')}</span>`;
  const fix = r.fix.map((f) => `<li>${esc(f)}</li>`).join('');
  return `
    <article class="rule" id="${esc(r.id)}" data-search="${esc((r.id + ' ' + r.help + ' ' + r.means + ' ' + r.wcag).toLowerCase())}">
      <header class="rule-head">
        <h3 class="rule-id"><code>${esc(r.id)}</code></h3>
        <a class="rule-permalink" href="#${esc(r.id)}" aria-label="Permalink to ${esc(r.id)}">#</a>
      </header>
      <p class="rule-help">${esc(r.help)}</p>
      <p class="rule-means">${esc(r.means)}</p>
      <div class="rule-fix">
        <h4>How to fix</h4>
        <ul>${fix}</ul>
      </div>
      <footer class="rule-meta">
        ${wcagBadge}
        <a href="${esc(r.helpUrl)}" rel="noopener">Full reference (dequeuniversity.com) ↗</a>
        <a href="/">← Back to scanner</a>
      </footer>
    </article>`;
}

function renderRules() {
  const root = document.getElementById('rules-root');
  if (!root) return;
  root.innerHTML = PRINCIPLES.map((p) => {
    const items = RULES.filter((r) => principleOf(r) === p.key);
    if (!items.length) return '';
    return `
      <section class="principle" id="principle-${p.key}" aria-labelledby="principle-${p.key}-h">
        <h2 id="principle-${p.key}-h">${p.num}. ${esc(p.name)}</h2>
        <p class="principle-blurb">${esc(p.blurb)}</p>
        <div class="rule-list">${items.map(entryHtml).join('')}</div>
      </section>`;
  }).join('');
}

function initFilter() {
  const input = document.getElementById('rule-filter');
  const count = document.getElementById('filter-count');
  if (!input) return;
  const articles = () => Array.from(document.querySelectorAll('.rule'));
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    articles().forEach((a) => {
      const hit = !q || a.dataset.search.includes(q) || a.textContent.toLowerCase().includes(q);
      a.hidden = !hit;
      if (hit) shown++;
    });
    document.querySelectorAll('.principle').forEach((sec) => {
      const any = Array.from(sec.querySelectorAll('.rule')).some((a) => !a.hidden);
      sec.hidden = !any;
    });
    document.body.classList.toggle('filter-empty', shown === 0);
    if (count) count.textContent = q ? `${shown} of ${articles().length} rules shown` : '';
  };
  input.addEventListener('input', apply);
  // jump-to-anchor support: if the target was hidden by a filter, reveal it
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.classList && target.classList.contains('rule') && target.hidden) {
      input.value = '';
      apply();
      target.scrollIntoView();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderRules();
  initFilter();
});
