/* AccessScan theme toggle.
   - The inline <head> script has already set data-theme on <html> before
     first paint, so this file only keeps state in sync and handles the
     toggle.
   - Choice persists in localStorage under 'accessscan-theme' as
     'light' | 'dark'. Light is the default: with no stored choice the
     OS preference is never followed — the page stays light until the
     visitor toggles.
   - The toggle uses the View Transitions API for a circular reveal from
     the button when available; otherwise the swap is instant. Both are
     skipped entirely under prefers-reduced-motion. */
(function () {
  'use strict';

  var STORAGE_KEY = 'accessscan-theme';
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function effectiveTheme() {
    var s = stored();
    return (s === 'light' || s === 'dark') ? s : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e1420' : '#003399');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function persist(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* private mode */ }
  }

  // Keep the button state honest on load (inline script owns first paint).
  applyTheme(effectiveTheme());

  if (!btn) return;

  btn.addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    var commit = function () {
      persist(next);
      applyTheme(next);
    };

    if (reduceMotion.matches || typeof document.startViewTransition !== 'function') {
      commit();
      return;
    }

    // Circle originates at the button's centre and reaches the farthest
    // corner, so the reveal covers the viewport in one sweep.
    var rect = btn.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.ceil(Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )) + 40;
    root.style.setProperty('--theme-x', x + 'px');
    root.style.setProperty('--theme-y', y + 'px');
    root.style.setProperty('--theme-r', radius + 'px');

    document.startViewTransition(commit);
  });
})();
