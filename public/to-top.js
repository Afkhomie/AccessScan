// Back-to-top button: shows while scrolling (past 300px), fades out 2s
// after the user stops. Shared by all pages; markup is a .to-top button.
(function () {
  const btn = document.querySelector('.to-top');
  if (!btn) return;
  let hideTimer = null;
  const show = () => btn.classList.add('show');
  const hide = () => btn.classList.remove('show');
  window.addEventListener('scroll', () => {
    if (window.scrollY < 300) { hide(); return; }
    show();
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 2000);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    hide();
  });
})();
