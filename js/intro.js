/* ============================================================================
   DE Architects — welcome intro
   ----------------------------------------------------------------------------
   A one-off title card: the mark settles in, the lockup wipes across, a rule
   draws beneath it, then the card splits and lifts to reveal the page.

   Shown once per visit, not once per page. The flag lives in sessionStorage,
   which survives navigation and reloads within the tab but clears when the
   tab closes — so moving between pages never replays it, and a genuinely new
   visit always does.

   This file is loaded as the first thing in <body> so it can paint the cover
   before the page below it renders. It injects its own markup, which keeps it
   to a single script tag per page with no duplicated HTML.
   ========================================================================== */
(function () {
  var KEY = 'de:intro-seen';
  var root = document.documentElement;

  // Respect a reduced-motion preference, and never block a repeat page view.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen;
  try { seen = sessionStorage.getItem(KEY); } catch (e) { seen = '1'; }  // private mode: skip rather than replay
  if (seen || reduce) return;

  try { sessionStorage.setItem(KEY, '1'); } catch (e) {}

  var el = document.createElement('div');
  el.className = 'intro';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<span class="intro-panel t"></span>' +
    '<span class="intro-panel b"></span>' +
    '<div class="intro-core">' +
      '<span class="intro-glow"></span>' +
      '<img class="intro-logo" src="assets/img/logo-nav.png" alt="">' +
      '<span class="intro-rule"></span>' +
      '<span class="intro-tag">Architecture that reflects all of you</span>' +
    '</div>';

  root.classList.add('intro-on');

  function mount() {
    document.body.insertBefore(el, document.body.firstChild);
    // next frame, so the entry transitions actually run
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
    var hold = setTimeout(out, 2150);
    function skip() { clearTimeout(hold); out(); }
    el.addEventListener('click', skip);
    window.addEventListener('keydown', skip, { once: true });
  }

  var done = false;
  function out() {
    if (done) return;
    done = true;
    el.classList.add('is-out');
    root.classList.remove('intro-on');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1150);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  // never strand the visitor behind the cover if something stalls
  setTimeout(out, 6000);
})();
