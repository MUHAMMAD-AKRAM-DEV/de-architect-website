/* ============================================================================
   DE Architects — section 3: scroll-driven image sequence
   ----------------------------------------------------------------------------
   The fly-through is a reel of stills in assets/img/flight/. Scroll position
   maps to a floating index across them: the pair either side of that index
   cross-fades, and each shot drifts on its own slow Ken Burns move, so the
   sequence reads as one continuous camera rather than a slideshow.

   Nothing renders per frame — the browser only animates opacity and transform,
   both of which are composited on the GPU. That is the whole point: the WebGL
   version had to draw the world sixty times a second, this does not.

   To restyle the flight, edit the markup: add or remove a .fshot (with its
   matching .fcap) and the maths below follows automatically.
   ========================================================================== */
(() => {
  const section = document.getElementById('work');
  if (!section) return;

  const reel   = section.querySelector('.flight-reel');
  const shots  = Array.from(section.querySelectorAll('.fshot'));
  const caps   = Array.from(section.querySelectorAll('.fcap'));
  const head   = section.querySelector('.scene-text');
  const rail   = section.querySelector('.flight-progress i');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reel || shots.length < 2) return;
  section.classList.add('has-reel');

  /* The stills carry data-src, not src. A hidden container does not reliably
     stop a browser fetching <img src>, so with another engine active the reel
     would still pull ~1.6MB nobody looks at. Promote them only now, when this
     player is the one running. */
  shots.forEach(f => {
    const img = f.querySelector('img[data-src]');
    if (img){ img.src = img.dataset.src; img.removeAttribute('data-src'); }
  });

  const N = shots.length;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* Ken Burns moves, keyed off each shot's data-pan. from → to across the
     shot's life. Kept gentle: this should feel like a drone easing through a
     move, not a zoom effect. */
  const MOVES = {
    in:    { s:[1.04, 1.16], x:[0, 0],       y:[0, 0] },
    out:   { s:[1.18, 1.05], x:[0, 0],       y:[0, 0] },
    left:  { s:[1.12, 1.12], x:[2.2, -2.2],  y:[0, 0] },
    right: { s:[1.12, 1.12], x:[-2.2, 2.2],  y:[0, 0] },
    up:    { s:[1.14, 1.08], x:[0, 0],       y:[2.0, -2.0] },
    down:  { s:[1.08, 1.14], x:[0, 0],       y:[-2.0, 2.0] }
  };
  const moves = shots.map(s => MOVES[s.dataset.pan] || MOVES.in);

  /* ---------- keep the reel hidden until the opening shots can be drawn ---- */
  const firstTwo = shots.slice(0, 2).map(s => s.querySelector('img')).filter(Boolean);
  let ready = 0;
  const markReady = () => { if (++ready >= firstTwo.length) section.classList.add('is-ready'); };
  firstTwo.forEach(img => {
    if (img.complete && img.naturalWidth) markReady();
    else { img.addEventListener('load', markReady, { once:true });
           img.addEventListener('error', markReady, { once:true }); }
  });
  if (!firstTwo.length) section.classList.add('is-ready');
  // never leave the section blank if a file is missing
  setTimeout(() => section.classList.add('is-ready'), 3000);

  /* ---------- scroll → progress ---------- */
  let targetU = 0, curU = -1, raf = null, running = false, lastCap = -1;

  function readScroll(){
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    targetU = clamp(-r.top / (total || 1), 0, 1);
  }

  function paint(u){
    const f = u * (N - 1);          // floating position in the reel
    const i = Math.min(Math.floor(f), N - 2);
    const raw = f - i;              // 0 → 1 between shot i and shot i + 1
    // hold each shot at either end and dissolve through the middle, so the
    // reel reads as a cut sequence rather than two images permanently blended
    const q = clamp((raw - 0.22) / 0.56, 0, 1);
    const t = q * q * (3 - 2 * q);

    for (let k = 0; k < N; k++){
      // shots below the pair stay opaque but are covered; above the pair, hidden
      const o = k < i ? 1 : k === i ? 1 : k === i + 1 ? t : 0;
      const el = shots[k];
      if (el._o !== o){ el.style.opacity = o; el._o = o; }

      // each shot moves across its own two-step life, so the drift never stops
      const life = clamp((f - (k - 1)) / 2, 0, 1);
      const m = moves[k];
      const sc = m.s[0] + (m.s[1] - m.s[0]) * life;
      const tx = m.x[0] + (m.x[1] - m.x[0]) * life;
      const ty = m.y[0] + (m.y[1] - m.y[0]) * life;
      el.style.transform = `translate3d(${tx.toFixed(3)}%, ${ty.toFixed(3)}%, 0) scale(${sc.toFixed(4)})`;
    }

    // captions belong to the shot that is currently dominant
    const active = Math.round(f);
    if (active !== lastCap){
      caps.forEach((c, k) => c.classList.toggle('is-on', k === active));
      lastCap = active;
    }

    if (head) head.classList.toggle('is-on', f < 0.62);
    section.classList.toggle('hide-hint', u > 0.03);
    if (rail) rail.style.transform = `scaleX(${u.toFixed(4)})`;
  }

  function frame(){
    raf = requestAnimationFrame(frame);
    readScroll();
    // ease toward the scroll position so flicks do not snap between shots
    curU += (targetU - curU) * 0.11;
    if (Math.abs(targetU - curU) < 0.00015) curU = targetU;
    paint(curU);
  }

  function start(){ if (!running){ running = true; raf = requestAnimationFrame(frame); } }
  function stop(){ if (running){ running = false; cancelAnimationFrame(raf); } }

  readScroll();
  curU = targetU;
  paint(curU);

  if (reduce){
    // no easing, no rAF — just track the scroll position directly
    window.addEventListener('scroll', () => { readScroll(); paint(targetU); }, { passive:true });
  } else {
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()),
      { rootMargin:'150px' }).observe(section);
  }
  window.addEventListener('resize', () => { readScroll(); paint(curU); }, { passive:true });
})();
