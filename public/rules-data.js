/* AccessScan — WCAG rule reference data + renderer.
 *
 * Rule ids, axe help text and helpUrls come from axe-core 4.14 rule metadata
 * (the version bundled in node_modules). WCAG criteria are derived from the
 * rule's wcag2* tags. Rules tagged best-practice are grouped separately;
 * axe flags them as good practice, not WCAG failures.
 *
 * Each entry renders as <article id="rule-id"> so app.js can deep-link with
 * rules.html#<rule-id>. The "#" anchor links back to the report/scanner.
 *
 * All user-facing strings come from window.COPY (copy.js), which must be
 * loaded before this file.
 */
'use strict';

const RULES = [
  // ---------- Perceivable ----------
  {
    id: 'color-contrast',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    wcag: '1.4.3', level: 'AA',
    means: 'Text does not meet the minimum contrast ratio against its background (4.5:1 for normal text, 3:1 for large text), making it difficult to read.',
    fix: [
      'Darken the text or lighten the background until the ratio passes.',
      'Check background images and gradients behind the text, not only the flat colour.',
      'Do not rely on colour alone to convey meaning; pair it with an icon or label.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=axeAPI',
  },
  {
    id: 'image-alt',
    help: 'Images must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An <img> element has no alt text (or an empty value where one is required), so screen readers cannot describe it.',
    fix: [
      'Add alt="..." describing the purpose of the image, not merely its appearance.',
      'For purely decorative images, use alt="" so that screen readers skip them.',
      'For images that function as links or buttons, the alt text becomes the accessible name of that control.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI',
  },
  {
    id: 'input-image-alt',
    help: 'Image buttons must have alternative text',
    wcag: '1.1.1 / 4.1.2', level: 'A',
    means: 'An <input type="image"> button has no alt text, so its purpose is invisible to assistive technology.',
    fix: [
      'Add alt="..." describing the action, for example alt="Search".',
      'Alternatively, use a regular <button> element containing text.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/input-image-alt?application=axeAPI',
  },
  {
    id: 'svg-img-alt',
    help: '<svg> elements with an img or image role must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An SVG used as an image has no accessible name; screen readers may announce it as "graphic" or skip it entirely.',
    fix: [
      'Add role="img" together with aria-label, or a <title> element inside the SVG.',
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
      'If the element is decorative, use role="presentation" or aria-hidden instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/role-img-alt?application=axeAPI',
  },
  {
    id: 'object-alt',
    help: '<object> elements must have alternative text',
    wcag: '1.1.1', level: 'A',
    means: 'An <object> embed (a PDF or similar content) provides no fallback text if the content cannot load.',
    fix: [
      'Provide fallback content inside the <object> tags.',
      'Prefer modern embed methods, or link to the file directly.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/object-alt?application=axeAPI',
  },
  {
    id: 'video-caption',
    help: '<video> elements must have captions',
    wcag: '1.2.2', level: 'A',
    means: 'A <video> element has no captions track, so deaf and hard-of-hearing users cannot follow the audio content.',
    fix: [
      'Add a <track kind="captions"> element referencing a .vtt file.',
      'For background video, mute it or provide a transcript nearby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/video-caption?application=axeAPI',
  },
  {
    id: 'audio-caption',
    help: '<audio> elements must have a captions track',
    wcag: '1.2.1', level: 'A',
    means: 'An <audio> element has no captions, so its spoken content is unavailable to deaf users.',
    fix: [
      'Add a captions track, or provide a link to a transcript.',
      'If the audio is ambient or background, determine whether captions are required at all.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/audio-caption?application=axeAPI',
  },
  {
    id: 'no-autoplay-audio',
    help: '<video> or <audio> elements must not play automatically',
    wcag: '1.4.2', level: 'A',
    means: 'Media plays automatically for more than three seconds without a mechanism to pause or control it, which is disruptive for screen reader and low-vision users.',
    fix: [
      'Remove autoplay, or provide controls and pause playback after three seconds.',
      'Never autoplay media with sound.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/no-autoplay-audio?application=axeAPI',
  },
  {
    id: 'link-in-text-block',
    help: 'Links must be distinguishable without relying on color',
    wcag: '1.4.1', level: 'A',
    means: 'Links within paragraphs are distinguished only by colour; users who cannot perceive that difference cannot identify them as links.',
    fix: [
      'Add an underline (default link styling already provides one).',
      'Or use a non-colour cue such as bold text or an icon.',
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
      'A plain content="width=device-width, initial-scale=1" is sufficient.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-viewport?application=axeAPI',
  },
  {
    id: 'valid-lang',
    help: 'lang attribute must have a valid value',
    wcag: '3.1.2', level: 'AA',
    means: 'A lang attribute (on html or on a part of the page) uses a value that BCP47 or the specification does not recognise.',
    fix: [
      'Use a valid language tag such as "en", "en-US", or "fr".',
      'Check for typos; an incorrect value silently breaks pronunciation and translation tools.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/valid-lang?application=axeAPI',
  },
  {
    id: 'avoid-inline-spacing',
    help: 'Inline text spacing must be adjustable with custom stylesheets',
    wcag: '1.4.12', level: 'AA',
    means: 'Text containers clip content when users apply their own letter, word, or line spacing overrides; this particularly affects users with dyslexia and low vision.',
    fix: [
      'Remove fixed heights on text containers so content can grow.',
      'Avoid !important on line-height and letter-spacing rules.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/avoid-inline-spacing?application=axeAPI',
  },
  {
    id: 'table-fake-caption',
    help: 'Data or header cells must not be used to give caption to a data table',
    wcag: '1.3.1', level: 'A',
    means: 'A table caption is simulated with a cell rather than a real <caption> element, so assistive technology does not announce the table\u2019s purpose.',
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
    means: 'A header cell (<th>) is not associated with any data cells; screen reader users hear a heading with no content beneath it.',
    fix: [
      'Ensure each <th> governs at least one data cell through correct row and column structure.',
      'If the cell is decorative, use <td> or aria-hidden instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/th-has-data-cells?application=axeAPI',
  },
  {
    id: 'autocomplete-valid',
    help: 'autocomplete attribute must be used correctly',
    wcag: '1.3.5', level: 'AA',
    means: 'A form field uses an autocomplete token that does not match the field\u2019s purpose (for example, autocomplete="email" on a phone number field).',
    fix: [
      'Use the correct token from the HTML specification (name, email, tel, street-address, and so on).',
      'Set autocomplete="off" explicitly if the field should genuinely not autofill.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/autocomplete-valid?application=axeAPI',
  },
  {
    id: 'image-redundant-alt',
    help: 'Alternative text of images should not be repeated as text',
    wcag: 'best-practice',
    means: 'An image\u2019s alt text is also rendered as visible text adjacent to the image, so screen readers announce it twice.',
    fix: [
      'Keep the alt text concise and remove the duplicated visible text, or do the reverse.',
      'If the visible text conveys additional information, shorten the alt text instead.',
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
      'Remove <area> elements that are not in use.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/area-alt?application=axeAPI',
  },
  {
    id: 'aria-meter-name',
    help: 'ARIA meter nodes must have an accessible name',
    wcag: '1.1.1', level: 'A',
    means: 'A meter widget (role="meter") has no accessible name, so screen readers announce a value without indicating what is being measured.',
    fix: [
      'Add aria-label or aria-labelledby describing what the meter measures.',
      'Or use the native <meter> or <progress> element where its semantics apply.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-meter-name?application=axeAPI',
  },
  {
    id: 'aria-progressbar-name',
    help: 'ARIA progressbar nodes must have an accessible name',
    wcag: '1.1.1', level: 'A',
    means: 'A progressbar widget has no accessible name, so screen readers announce a percentage without context.',
    fix: [
      'Add aria-label or aria-labelledby (for example, "Upload progress").',
      'Or use the native <progress> element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-progressbar-name?application=axeAPI',
  },
  {
    id: 'css-orientation-lock',
    help: 'CSS must not lock display orientation',
    wcag: '1.3.4', level: 'AA',
    means: 'CSS forces the page into portrait or landscape only, so users whose device is oriented differently cannot use it.',
    fix: [
      'Remove orientation-locking CSS and allow the layout to reflow in both orientations.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/css-orientation-lock?application=axeAPI',
  },
  {
    id: 'p-as-heading',
    help: 'Styled <p> elements must not be used as headings',
    wcag: '1.3.1', level: 'A',
    means: 'A <p> element styled to look like a heading (large and bold) is not a real heading, so screen reader heading navigation skips it.',
    fix: [
      'Replace it with an <h1>\u2013<h6> element and move the styling into CSS.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/p-as-heading?application=axeAPI',
  },
  {
    id: 'td-has-header',
    help: 'Non-empty <td> elements in larger <table> must have an associated table header',
    wcag: '1.3.1', level: 'A',
    means: 'A data cell in a multi-row or multi-column table has no associated header, so screen readers cannot announce what the value represents.',
    fix: [
      'Use <th scope="col"> or <th scope="row"> for headers, or headers="..." referencing the appropriate <th>.',
      'For simple data tables, correct <th> markup is usually sufficient.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/td-has-header?application=axeAPI',
  },
  {
    id: 'td-headers-attr',
    help: 'Table cell headers attributes must refer to other <th> elements in the same table',
    wcag: '1.3.1', level: 'A',
    means: 'A headers="..." attribute points to an id that does not exist, is not a <th>, or belongs to a different table.',
    fix: [
      'Ensure every id in headers= matches a real <th id="..."> in the same table.',
      'Keep ids unique across the page.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/td-headers-attr?application=axeAPI',
  },

  // ---------- Operable ----------
  {
    id: 'bypass',
    help: 'Page must have means to bypass repeated blocks',
    wcag: '2.4.1', level: 'A',
    means: 'Keyboard users must tab through the entire navigation and header on every page before reaching the content; no skip link or landmark shortcut is provided.',
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
    means: 'The page has no <title> element (or an empty one), so browser tabs, bookmarks, and screen reader page lists display nothing useful.',
    fix: [
      'Add a unique, descriptive <title> to every page.',
      'Lead with the page topic and keep it under approximately 60 characters.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/document-title?application=axeAPI',
  },
  {
    id: 'link-name',
    help: 'Links must have discernible text',
    wcag: '2.4.4 / 4.1.2', level: 'A',
    means: 'A link has no accessible name: icon-only links, empty anchors, or links whose only content is an unlabelled image.',
    fix: [
      'Add visible text, aria-label, or aria-labelledby.',
      'For icon links, give the SVG or icon an accessible name.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/link-name?application=axeAPI',
  },
  {
    id: 'button-name',
    help: 'Buttons must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'A <button> (or role="button") element has no accessible name; screen readers announce only "button".',
    fix: [
      'Add text content, aria-label, or aria-labelledby.',
      'Icon-only buttons require an aria-label describing the action.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/button-name?application=axeAPI',
  },
  {
    id: 'input-button-name',
    help: 'Input buttons must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'An <input type="button|submit|reset"> has no value or text, so its purpose is unknown.',
    fix: [
      'Set the value attribute (for example, value="Search").',
      'Or use a <button> element containing text.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/input-button-name?application=axeAPI',
  },
  {
    id: 'summary-name',
    help: 'Summary elements must have discernible text',
    wcag: '4.1.2', level: 'A',
    means: 'A <summary> element (the clickable part of <details>) has no text, so users cannot determine what it expands.',
    fix: [
      'Place descriptive text inside <summary>.',
      'If it is icon-only, add an aria-label.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/summary-name?application=axeAPI',
  },
  {
    id: 'aria-command-name',
    help: 'ARIA commands must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An element with an ARIA role such as link, button, or menuitem has no accessible name.',
    fix: [
      'Add aria-label, aria-labelledby, or text content.',
      'Prefer native elements (<a>, <button>) over ARIA roles where possible.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-command-name?application=axeAPI',
  },
  {
    id: 'aria-dialog-name',
    help: 'ARIA dialog and alertdialog nodes should have an accessible name',
    wcag: 'best-practice',
    means: 'A role="dialog" or role="alertdialog" element has no accessible name, so users cannot determine the purpose of the dialog.',
    fix: [
      'Add aria-label or aria-labelledby pointing to the dialog\u2019s heading.',
      'Prefer the native <dialog> element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-dialog-name?application=axeAPI',
  },
  {
    id: 'aria-treeitem-name',
    help: 'ARIA treeitem nodes should have an accessible name',
    wcag: 'best-practice',
    means: 'A role="treeitem" element has no accessible name.',
    fix: [
      'Add aria-label, aria-labelledby, or text content to the treeitem.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-treeitem-name?application=axeAPI',
  },
  {
    id: 'marquee',
    help: '<marquee> elements are deprecated and must not be used',
    wcag: '2.2.2', level: 'A',
    means: 'Scrolling <marquee> text cannot be paused and presents a distraction and seizure risk; modern browsers also handle it inconsistently.',
    fix: [
      'Remove it; use static text or a proper animation with a pause control.',
      'CSS animation alone is insufficient; WCAG 2.2.2 still requires a stop mechanism.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/marquee?application=axeAPI',
  },
  {
    id: 'blink',
    help: '<blink> elements are deprecated and must not be used',
    wcag: '2.2.2', level: 'A',
    means: 'Blinking <blink> text is a seizure hazard and is not supported by modern browsers in any case.',
    fix: [
      'Remove it entirely; never reimplement flashing text with CSS or JavaScript.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/blink?application=axeAPI',
  },
  {
    id: 'meta-refresh',
    help: 'Delayed refresh under 20 hours must not be used',
    wcag: '2.2.1', level: 'A',
    means: 'A <meta http-equiv="refresh"> tag reloads the page automatically, abruptly removing users (including screen reader users mid-sentence) from the content.',
    fix: [
      'Remove the meta refresh; use a real link or JavaScript with user control.',
      'Session timeouts require a warning and an option to extend the session instead.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-refresh?application=axeAPI',
  },
  {
    id: 'meta-refresh-no-exceptions',
    help: 'Delayed refresh must not be used',
    wcag: '2.2.4 / 3.2.5', level: 'AAA',
    means: 'The stricter AAA-level variant: no timed refresh is permitted at all, even with user control.',
    fix: [
      'Remove timed refreshes entirely.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-refresh-no-exceptions?application=axeAPI',
  },
  {
    id: 'scrollable-region-focusable',
    help: 'Scrollable region must have keyboard access',
    wcag: '2.1.1 / 2.1.3', level: 'A',
    means: 'A scrollable <div> (overflow:auto or scroll) cannot be reached or scrolled using a keyboard alone.',
    fix: [
      'Add tabindex="0" to the scrollable region.',
      'Or preferably, use a natively scrollable element with real content.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/scrollable-region-focusable?application=axeAPI',
  },
  {
    id: 'target-size',
    help: 'All touch targets must be 24px large, or leave sufficient space',
    wcag: '2.5.8', level: 'AA',
    means: 'Buttons and links are too small or too close together to be tapped reliably; the WCAG 2.2 minimum target size is 24\u00d724 CSS pixels, subject to spacing exceptions.',
    fix: [
      'Increase padding or size to at least 24px in each dimension.',
      'Or ensure sufficient spacing between adjacent targets.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/target-size?application=axeAPI',
  },
  {
    id: 'identical-links-same-purpose',
    help: 'Links with the same name must have a similar purpose',
    wcag: '2.4.9', level: 'AAA',
    means: 'Two links share the same text (for example, "read more") but lead to different destinations; screen reader link lists become meaningless.',
    fix: [
      'Make link text unique and descriptive (for example, "Read more about pricing").',
      'Or add context via aria-describedby if the visible text must remain short.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/identical-links-same-purpose?application=axeAPI',
  },
  {
    id: 'tabindex',
    help: 'Elements should not have tabindex greater than zero',
    wcag: 'best-practice',
    means: 'tabindex="1+" overrides the natural tab order, forcing keyboard users into an unexpected sequence.',
    fix: [
      'Use tabindex="0" to add an element to the tab order, or tabindex="-1" for programmatic focus only.',
      'Correct the DOM order instead of overriding it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/tabindex?application=axeAPI',
  },
  {
    id: 'focus-order-semantics',
    help: 'Elements in the focus order should have an appropriate role',
    wcag: 'best-practice',
    means: 'A focusable element has no semantic role (for example, a plain <div tabindex="0"> that behaves like a button but is not announced as one).',
    fix: [
      'Use the appropriate native element (<button>, <a href>) or add a role.',
      'For custom widgets, implement the complete ARIA pattern.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/focus-order-semantics?application=axeAPI',
  },
  {
    id: 'skip-link',
    help: 'The skip-link target should exist and be focusable',
    wcag: 'best-practice',
    means: 'A "skip to content" link points to an element that does not exist or cannot receive focus.',
    fix: [
      'Ensure the skip link\u2019s href targets a real element, usually <main id="main">.',
      'The target requires tabindex="-1" so it can receive programmatic focus.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/skip-link?application=axeAPI',
  },
  {
    id: 'frame-focusable-content',
    help: 'Frames with focusable content must not have tabindex=-1',
    wcag: '2.1.1', level: 'A',
    means: 'An <iframe> contains focusable content but has tabindex="-1", which can trap or break keyboard focus within the frame.',
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
    means: 'The visible text of a control is not part of its accessible name (for example, aria-label overrides the button text), so voice-control users who speak the visible label cannot activate it.',
    fix: [
      'Make the accessible name begin with the visible text, or match it exactly.',
      'Do not allow aria-label to contradict the text shown on screen.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=axeAPI',
  },
  {
    id: 'server-side-image-map',
    help: 'Server-side image maps must not be used',
    wcag: '2.1.1', level: 'A',
    means: 'An old-style server-side image map (<img ismap>) produces click coordinates rather than focusable links; keyboard and screen reader users cannot operate it.',
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
    means: 'The <html> tag has no lang attribute, so screen readers cannot determine the language and correct pronunciation.',
    fix: [
      'Add lang="en" (or the correct BCP47 tag) to <html>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-has-lang?application=axeAPI',
  },
  {
    id: 'html-lang-valid',
    help: '<html> element must have a valid value for the lang attribute',
    wcag: '3.1.1', level: 'A',
    means: 'The lang attribute is present but its value is not a recognised language tag.',
    fix: [
      'Use a valid tag: "en", "en-US", "pt-BR", and so on.',
      'Check for typos such as lang="eng" or lang="english".',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-lang-valid?application=axeAPI',
  },
  {
    id: 'html-xml-lang-mismatch',
    help: 'HTML elements with lang and xml:lang must have the same base language',
    wcag: '3.1.1', level: 'A',
    means: 'The lang and xml:lang attributes disagree on the same element, which is common in XHTML-era markup.',
    fix: [
      'Set both attributes to the same language, or remove xml:lang (rarely needed in HTML5).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/html-xml-lang-mismatch?application=axeAPI',
  },
  {
    id: 'label',
    help: 'Form elements must have labels',
    wcag: '4.1.2 / 3.3.2', level: 'A',
    means: 'An input, select, or textarea has no associated <label>, aria-label, or aria-labelledby; screen readers announce "edit text" without indicating the field\u2019s purpose.',
    fix: [
      'Wrap the input in a <label>, or use for="id" matching the input\u2019s id.',
      'Or add aria-label="..." or aria-labelledby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label?application=axeAPI',
  },
  {
    id: 'label-title-only',
    help: 'Form elements should have a visible label',
    wcag: 'best-practice',
    means: 'A form field is labelled only via the title attribute or placeholder; visible labels are significantly more usable, particularly on mobile and for low-vision users.',
    fix: [
      'Add a real visible <label>; do not rely on placeholder text alone.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label-title-only?application=axeAPI',
  },
  {
    id: 'select-name',
    help: 'Select element must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A <select> dropdown has no label, so users cannot determine what they are choosing.',
    fix: [
      'Associate a <label>, or add aria-label / aria-labelledby.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/select-name?application=axeAPI',
  },
  {
    id: 'form-field-multiple-labels',
    help: 'Form field must not have multiple label elements',
    wcag: '3.3.2', level: 'A',
    means: 'A field has more than one <label> associated with it, which can produce confusing or duplicated announcements.',
    fix: [
      'Keep one label per field; merge additional text into aria-describedby if required.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/form-field-multiple-labels?application=axeAPI',
  },
  {
    id: 'list',
    help: '<ul> and <ol> must only directly contain <li>, <script> or <template> elements',
    wcag: '1.3.1', level: 'A',
    means: 'A list contains non-<li> children (divs, spans, or other elements), breaking the list structure that screen readers rely on.',
    fix: [
      'Make every direct child an <li>; if wrappers are needed, place them inside the <li>.',
      'If the content is not genuinely a list, do not use <ul> or <ol>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/list?application=axeAPI',
  },
  {
    id: 'listitem',
    help: '<li> elements must be contained in a <ul> or <ol>',
    wcag: '1.3.1', level: 'A',
    means: 'An <li> element sits outside any list, so it is announced as a stray list item.',
    fix: [
      'Wrap it in <ul> or <ol>, or change it to a <div> or <p>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/listitem?application=axeAPI',
  },
  {
    id: 'definition-list',
    help: '<dl> elements must only directly contain properly-ordered <dt> and <dd> groups',
    wcag: '1.3.1', level: 'A',
    means: 'A definition list has broken structure: <dd> without <dt>, incorrect ordering, or stray elements.',
    fix: [
      'Each <dt> should be followed by its <dd> element(s); only <div> wrappers are permitted between groups.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/definition-list?application=axeAPI',
  },
  {
    id: 'dlitem',
    help: '<dt> and <dd> elements must be contained by a <dl>',
    wcag: '1.3.1', level: 'A',
    means: 'A <dt> or <dd> element is used outside a <dl> definition list.',
    fix: [
      'Wrap them in a <dl>, or use regular headings and paragraphs.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/dlitem?application=axeAPI',
  },
  {
    id: 'page-has-heading-one',
    help: 'Page should contain a level-one heading',
    wcag: 'best-practice',
    means: 'The page has no <h1>, so there is no clear top-level topic for screen reader users navigating by headings.',
    fix: [
      'Add exactly one <h1> describing the page\u2019s main topic.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/page-has-heading-one?application=axeAPI',
  },
  {
    id: 'heading-order',
    help: 'Heading levels should only increase by one',
    wcag: 'best-practice',
    means: 'Headings skip levels (for example, h1 to h3), which confuses the document outline that screen readers construct.',
    fix: [
      'Do not skip levels: use h1, then h2, then h3 in order.',
      'Apply styling with CSS rather than choosing a heading level for appearance.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/heading-order?application=axeAPI',
  },
  {
    id: 'empty-heading',
    help: 'Headings should not be empty',
    wcag: 'best-practice',
    means: 'A heading element has no text; screen reader users hear "heading level 2" with nothing following it.',
    fix: [
      'Give it real text, or remove the heading element.',
      'If populated by JavaScript, ensure it is filled before axe runs.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/empty-heading?application=axeAPI',
  },
  {
    id: 'empty-table-header',
    help: 'Table header text should not be empty',
    wcag: 'best-practice',
    means: 'A <th> element has no text, so screen reader users hear a column or row header with no label.',
    fix: [
      'Add text or an aria-label to the header cell, or use aria-hidden if it is decorative.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/empty-table-header?application=axeAPI',
  },

  // ---------- Robust ----------
  {
    id: 'aria-valid-attr',
    help: 'ARIA attributes must conform to valid names',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-* attribute is misspelled or does not exist (for example, aria-lable), so browsers ignore it.',
    fix: [
      'Correct the typo; valid names are defined by the ARIA specification (aria-label, aria-hidden, aria-describedby, and so on).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-valid-attr?application=axeAPI',
  },
  {
    id: 'aria-roles',
    help: 'ARIA roles used must conform to valid values',
    wcag: '4.1.2', level: 'A',
    means: 'A role="..." value is misspelled or is not a real ARIA role, so assistive technology cannot interpret the element.',
    fix: [
      'Use a valid role from the ARIA specification, or remove the role and rely on native HTML.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-roles?application=axeAPI',
  },
  {
    id: 'aria-required-attr',
    help: 'Required ARIA attributes must be provided',
    wcag: '4.1.2', level: 'A',
    means: 'An ARIA role requires companion attributes that are missing (for example, role="checkbox" without aria-checked).',
    fix: [
      'Add the attributes required for that role; consult the ARIA specification or MDN.',
      'Or use the native HTML element, which handles this automatically.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-attr?application=axeAPI',
  },
  {
    id: 'aria-required-children',
    help: 'Certain ARIA roles must contain particular children',
    wcag: '1.3.1', level: 'A',
    means: 'A parent role such as menu, listbox, or tablist is missing the child roles it requires (menuitem, option, tab), so the widget structure is broken.',
    fix: [
      'Add the required child roles, or use native <ul> or <table> markup that implies the structure.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-children?application=axeAPI',
  },
  {
    id: 'aria-required-parent',
    help: 'Certain ARIA roles must be contained by particular parents',
    wcag: '1.3.1', level: 'A',
    means: 'An element has a role that requires a specific parent (for example, role="menuitem" outside role="menu"), breaking the announced structure.',
    fix: [
      'Wrap it in the required parent role, or use native list or table markup.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-required-parent?application=axeAPI',
  },
  {
    id: 'aria-hidden-body',
    help: 'aria-hidden="true" must not be present on the document body',
    wcag: '1.3.1 / 4.1.2', level: 'A',
    means: 'aria-hidden="true" on <body> hides the entire page from screen readers; this is usually a leftover from a modal or dialog script.',
    fix: [
      'Remove it, or scope aria-hidden to the specific overlay element only.',
      'Ensure it is removed when the modal closes.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-hidden-body?application=axeAPI',
  },
  {
    id: 'aria-hidden-focus',
    help: 'ARIA hidden element must not be focusable or contain focusable elements',
    wcag: '4.1.2', level: 'A',
    means: 'Content hidden with aria-hidden still contains keyboard-focusable elements, so keyboard users tab into invisible content.',
    fix: [
      'Remove tabindex from hidden elements, or do not apply aria-hidden to containers with focusable children.',
      'For modals, move focus into the dialog and trap it correctly.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-hidden-focus?application=axeAPI',
  },
  {
    id: 'aria-prohibited-attr',
    help: 'Elements must only use permitted ARIA attributes',
    wcag: '4.1.2', level: 'A',
    means: 'An element uses an ARIA attribute that its role forbids (for example, aria-label on a generic <div> with no role).',
    fix: [
      'Remove the prohibited attribute, or assign the element a role that permits it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-prohibited-attr?application=axeAPI',
  },
  {
    id: 'aria-text',
    help: '"role=text" should have no focusable descendants',
    wcag: 'best-practice',
    means: 'A role="text" element (a non-standard technique for flattening the accessibility tree) contains focusable elements that become unreachable.',
    fix: [
      'Remove role="text", or move the focusable elements outside it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-text?application=axeAPI',
  },
  {
    id: 'duplicate-id-aria',
    help: 'IDs used in ARIA and labels must be unique',
    wcag: '4.1.2', level: 'A',
    means: 'The same id appears twice and is referenced by aria-labelledby, aria-describedby, or a label for attribute; browsers select one, possibly the wrong one.',
    fix: [
      'Make every id unique and rename duplicates.',
      'Verify that aria references point to the intended element.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/duplicate-id-aria?application=axeAPI',
  },
  {
    id: 'presentation-role-conflict',
    help: 'Elements marked as presentational should be consistently ignored',
    wcag: 'best-practice',
    means: 'An element has role="presentation" or role="none" but also carries global ARIA attributes or is focusable; the conflicting signals confuse assistive technology.',
    fix: [
      'Remove the conflicting attributes, or remove the presentational role.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/presentation-role-conflict?application=axeAPI',
  },
  {
    id: 'nested-interactive',
    help: 'Interactive controls must not be nested',
    wcag: '4.1.2', level: 'A',
    means: 'A link, button, or other control sits inside another interactive element (for example, an <a> inside a <button>, or a card link wrapping buttons); screen readers cannot parse this correctly.',
    fix: [
      'Restructure so interactive elements are siblings rather than nested.',
      'For clickable cards, make the title the link and keep buttons separate.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/nested-interactive?application=axeAPI',
  },
  {
    id: 'landmark-one-main',
    help: 'Document should have one main landmark',
    wcag: 'best-practice',
    means: 'The page has no <main> (or role="main") landmark, or more than one; screen reader users cannot jump directly to the content.',
    fix: [
      'Wrap the primary content in a single <main> element.',
      'If multiple mains exist (for example, in frames), give them distinct labels.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-one-main?application=axeAPI',
  },
  {
    id: 'landmark-unique',
    help: 'Landmarks should have a unique role or role/label/title combination',
    wcag: 'best-practice',
    means: 'Two landmarks share the same role and have no distinguishing label, so they are indistinguishable during landmark navigation.',
    fix: [
      'Add aria-label or aria-labelledby to differentiate them (for example, two <nav> elements labelled "Main" and "Footer").',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-unique?application=axeAPI',
  },
  {
    id: 'landmark-no-duplicate-banner',
    help: 'Document should not have more than one banner landmark',
    wcag: 'best-practice',
    means: 'More than one banner landmark (a top-level <header>) exists on the page.',
    fix: [
      'Keep a single page header; nested <header> elements inside <article> or <section> are acceptable.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/landmark-no-duplicate-banner?application=axeAPI',
  },
  {
    id: 'landmark-no-duplicate-contentinfo',
    help: 'Document should not have more than one contentinfo landmark',
    wcag: 'best-practice',
    means: 'More than one footer landmark (a top-level <footer>) exists on the page.',
    fix: [
      'Keep a single page footer; section-level <footer> elements are acceptable.',
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
    means: 'Even without disabled zoom, the layout breaks before users can reach 500% text zoom.',
    fix: [
      'Test at 500% zoom and at 320px width; correct horizontal scrolling and clipping.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/meta-viewport-large?application=axeAPI',
  },
  {
    id: 'frame-title',
    help: 'Frames must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An <iframe> or <frame> has no title, so screen reader users hear "frame" without knowing what it contains.',
    fix: [
      'Add title="..." describing the frame\u2019s content.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/frame-title?application=axeAPI',
  },
  {
    id: 'frame-title-unique',
    help: 'Frames must have a unique title attribute',
    wcag: '4.1.2', level: 'A',
    means: 'Two or more frames share the same title, so screen reader users cannot distinguish them in the frame list.',
    fix: [
      'Give each frame a unique, descriptive title.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/frame-title-unique?application=axeAPI',
  },
  {
    id: 'aria-allowed-attr',
    help: 'Elements must only use supported ARIA attributes',
    wcag: '4.1.2', level: 'A',
    means: 'An element uses an aria-* attribute that its role does not support (for example, aria-label on a plain <div> with no role); browsers and assistive technology may ignore it.',
    fix: [
      'Remove the unsupported attribute, or add a role that permits it.',
      'Consult the ARIA specification for which attributes each role allows.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-allowed-attr?application=axeAPI',
  },
  {
    id: 'aria-braille-equivalent',
    help: 'aria-braille attributes must have a non-braille equivalent',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-braillelabel or aria-brailleroledescription has no plain-text equivalent (aria-label or aria-roledescription), so refreshable braille displays cannot adapt it.',
    fix: [
      'Provide the matching aria-label or aria-roledescription alongside the braille attribute.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-braille-equivalent?application=axeAPI',
  },
  {
    id: 'aria-conditional-attr',
    help: 'ARIA attributes must be used as specified for the element\u2019s role',
    wcag: '4.1.2', level: 'A',
    means: 'An ARIA attribute is used in a way its conditions forbid; for example, a value valid only on certain roles, or a required companion attribute that is missing.',
    fix: [
      'Check the attribute\u2019s conditions in the ARIA specification; add required companions or remove the attribute.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-conditional-attr?application=axeAPI',
  },
  {
    id: 'aria-deprecated-role',
    help: 'Deprecated ARIA roles must not be used',
    wcag: '4.1.2', level: 'A',
    means: 'A role="..." value uses a deprecated ARIA role (for example, directory) that assistive technology may stop supporting.',
    fix: [
      'Replace it with the modern equivalent or native HTML (for example, <ul>/<li> instead of role="directory").',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-deprecated-role?application=axeAPI',
  },
  {
    id: 'aria-input-field-name',
    help: 'ARIA input fields must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An input-like ARIA widget (textbox, searchbox, spinbutton, and so on) has no accessible name, so screen readers announce an unlabelled field.',
    fix: [
      'Add aria-label, aria-labelledby, or associate a visible <label>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-input-field-name?application=axeAPI',
  },
  {
    id: 'aria-roledescription',
    help: 'aria-roledescription must be on elements with a semantic role',
    wcag: '4.1.2', level: 'A',
    means: 'aria-roledescription is set on an element with no semantic role (or a prohibited one), so assistive technology may announce a made-up role that users cannot map.',
    fix: [
      'Use it only on elements with a real role, or remove it.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-roledescription?application=axeAPI',
  },
  {
    id: 'aria-tab-name',
    help: 'ARIA tab nodes must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'An element with role="tab" has no accessible name, so the tab strip announces unlabelled tabs.',
    fix: [
      'Add visible text or aria-label / aria-labelledby to each tab.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-tab-name?application=axeAPI',
  },
  {
    id: 'aria-toggle-field-name',
    help: 'ARIA toggle fields must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A toggle widget (checkbox, switch, menuitemcheckbox, and so on) has no accessible name, so screen readers announce an unnamed control.',
    fix: [
      'Add aria-label, aria-labelledby, or a visible <label>.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-toggle-field-name?application=axeAPI',
  },
  {
    id: 'aria-tooltip-name',
    help: 'ARIA tooltip nodes must have an accessible name',
    wcag: '4.1.2', level: 'A',
    means: 'A role="tooltip" element has no accessible name or content for assistive technology to announce.',
    fix: [
      'Give the tooltip text content or an aria-label describing the hint.',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-tooltip-name?application=axeAPI',
  },
  {
    id: 'aria-valid-attr-value',
    help: 'ARIA attributes must conform to valid values',
    wcag: '4.1.2', level: 'A',
    means: 'An aria-* attribute has an invalid value (for example, aria-expanded="yes" instead of true or false), so assistive technology ignores it.',
    fix: [
      'Use the permitted values defined by the ARIA specification (true/false, tokens, ids, and so on).',
    ],
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/aria-valid-attr-value?application=axeAPI',
  },
];

// Principle order and copy live in copy.js (COPY.rulesPage.principles).
const RP = window.COPY.rulesPage;
const PRINCIPLE_KEYS = ['p', 'o', 'u', 'r', 'b'];
const PRINCIPLES = PRINCIPLE_KEYS.map((key, i) => ({ key, ...RP.principles[i] }));

const WCAG_PRINCIPLE_KEY = { '1': 'p', '2': 'o', '3': 'u', '4': 'r' };

function principleOf(rule) {
  if (!rule.wcag || rule.wcag === 'best-practice') return 'b';
  return WCAG_PRINCIPLE_KEY[rule.wcag[0]] || 'b'; // first digit of the WCAG criterion number
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function entryHtml(r) {
  const wcagBadge = r.wcag === 'best-practice'
    ? `<span class="wcag-tag">${RP.tagBestPractice}</span>`
    : `<span class="wcag-tag">${RP.tagWcag.replace('{wcag}', esc(r.wcag))}</span><span class="wcag-tag">${esc(r.level || '')}</span>`;
  const fix = r.fix.map((f) => `<li>${esc(f)}</li>`).join('');
  return `
    <article class="rule" id="${esc(r.id)}" data-search="${esc((r.id + ' ' + r.help + ' ' + r.means + ' ' + r.wcag).toLowerCase())}">
      <header class="rule-head">
        <h3 class="rule-id"><code>${esc(r.id)}</code></h3>
        <a class="rule-permalink" href="#${esc(r.id)}" aria-label="${esc(RP.permalinkAria.replace('{id}', r.id))}">#</a>
      </header>
      <p class="rule-help">${esc(r.help)}</p>
      <p class="rule-means">${esc(r.means)}</p>
      <div class="rule-fix">
        <h4>${RP.howToFix}</h4>
        <ul>${fix}</ul>
      </div>
      <footer class="rule-meta">
        ${wcagBadge}
        <a href="${esc(r.helpUrl)}" rel="noopener">${RP.fullReference} ↗</a>
        <a href="/">${RP.backToScanner}</a>
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
    if (count) count.textContent = q ? RP.filterCount.replace('{shown}', shown).replace('{total}', articles().length) : '';
  };
  input.addEventListener('input', apply);
  // jump-to-anchor support: if the target was hidden by a filter, reveal it
  window.addEventListener('hashchange', () => {
    let targetId;
    try { targetId = decodeURIComponent(location.hash.slice(1)); }
    catch { return; } // malformed percent-encoding — nothing to reveal
    const target = document.getElementById(targetId);
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
