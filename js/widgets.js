/* ============================================================================
   DE Architects — the floating buttons
   ----------------------------------------------------------------------------
   A WhatsApp button, and a back-to-top that appears once you reach the bottom
   of the page. Both are injected here rather than written into seven pages, so
   there is one place to change them.

   They stack in the corner opposite the vertical Projects tab, and move to the
   other corner in Arabic and Urdu along with everything else.

   >>> SET YOUR NUMBER <<<  WHATSAPP below is the studio's placeholder number.
   Until it is a real one in full international format — country code, no
   spaces, no plus — the button opens a WhatsApp page that cannot find anyone.
   ========================================================================== */
(() => {
  const WHATSAPP = '10000000000';          // e.g. '447700900123' — no + and no spaces
  const GREETING = 'Hello — I saw your website and would like to talk about a project.';

  const T = s => (window.DELang ? window.DELang.t(s) : s);

  /* --- the rail everything sits in ---------------------------------------- */
  const rail = document.createElement('div');
  rail.className = 'fab-rail';
  document.body.appendChild(rail);

  /* --- WhatsApp ----------------------------------------------------------- */
  const wa = document.createElement('a');
  wa.className = 'fab fab-wa';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.innerHTML =
    `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
       <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
       <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23a8.19 8.19 0 015.82 2.41 8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.23 8.23z"/>
     </svg>`;
  rail.appendChild(wa);

  const paintWa = () => {
    const text = encodeURIComponent(T(GREETING));
    wa.href = `https://wa.me/${WHATSAPP}?text=${text}`;
    wa.setAttribute('aria-label', T('Chat with us on WhatsApp'));
    wa.title = T('Chat with us on WhatsApp');
  };
  paintWa();

  /* --- back to top --------------------------------------------------------
     The brief was "when the page reaches the bottom", so it appears in the
     last stretch rather than the moment you start scrolling — there is no
     point offering a shortcut back up while the top is still in view. */
  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'fab fab-top';
  top.innerHTML =
    `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
          stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <path d="M12 19V5M5 12l7-7 7 7"/>
     </svg>`;
  rail.appendChild(top);

  const paintTop = () => {
    top.setAttribute('aria-label', T('Back to top'));
    top.title = T('Back to top');
  };
  paintTop();

  const NEAR = 260;                        // how close to the end counts as "the bottom"
  let ticking = false;

  const measure = () => {
    ticking = false;
    const doc = document.documentElement;
    const bottom = doc.scrollHeight - (scrollY + innerHeight);
    // a page too short to scroll has no bottom to reach
    const scrollable = doc.scrollHeight > innerHeight + NEAR;
    top.classList.toggle('is-on', scrollable && bottom <= NEAR);
  };

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } },
                   { passive: true });
  addEventListener('resize', measure, { passive: true });
  measure();

  top.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // the labels are translated, so they have to be repainted on a language change
  document.addEventListener('de:lang', () => { paintWa(); paintTop(); });

  // let the chat widget know how tall the rail is, so it can sit above it
  window.DEFabRail = rail;
})();
