/* ============================================================================
   DE Architects — projects index
   ----------------------------------------------------------------------------
   An editorial mosaic rather than a card grid: tiles take uneven spans and
   aspect ratios on a twelve-column field, uncover with a clip wipe as they
   enter, and drift on scroll. A cursor bubble follows the pointer over a tile
   and says what clicking will do.

   Everything animated here is clip-path, transform or opacity — all three are
   composited, so the scroll stays smooth with a dozen images moving.
   ========================================================================== */
(() => {
  const mosaic = document.getElementById('pmosaic');
  const rail = document.getElementById('pgFilters');
  const empty = document.getElementById('pgEmpty');
  const hero = document.querySelector('.pg-hero');
  const projects = window.DE_PROJECTS || [];
  if (!mosaic || !projects.length) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* The rhythm of the grid. Six tiles per repeat: a wide opener, two halves,
     a tall pair, then a full-width feature — so the eye never settles into a
     row-by-row scan the way it does with equal cards. */
  const LAYOUT = [
    { span: 7, ar: '4/3' },
    { span: 5, ar: '3/4' },
    { span: 5, ar: '3/4' },
    { span: 7, ar: '4/3' },
    { span: 6, ar: '1/1' },
    { span: 6, ar: '1/1' }
  ];

  /* Every card carries its category colour on the top rule, the meta dot and
     the hover state — a second, non-textual way to tell projects apart. */
  const ACCENT = {
    Residential: 'var(--crimson)',
    Interior: 'var(--magenta)',
    Commercial: 'var(--navy)',
    Renovation: 'var(--gold)'
  };

  const ARROW = '<svg width="16" height="11" viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M2 7h18M14 1l6 6-6 6"/></svg>';

  const TOUR_ICO = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>';

  // the project copy lives in projects-data.js, not the markup, so it has to
  // ask for its own translation
  const T = t => (window.DELang ? window.DELang.t(t) : t);

  mosaic.innerHTML = projects.map((p, i) => {
    const L = LAYOUT[i % LAYOUT.length];
    const accent = ACCENT[p.category] || 'var(--crimson)';
    return `
    <article class="ptile" data-cat="${p.category}" style="--span:${L.span};--ar:${L.ar};--accent:${accent}">
      <a class="ptile-card" href="project.html?p=${encodeURIComponent(p.slug)}" data-cta="${p.tour ? 'Take the tour' : 'View project'}">
        <span class="ptile-bg">
          <img src="${p.cover}" alt="${p.title}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
        </span>
        <span class="ptile-veil"></span>
        <span class="ptile-num">${String(i + 1).padStart(2, '0')}</span>
        ${p.tour ? `<span class="ptile-tour">${TOUR_ICO}Virtual tour</span>` : ''}
        <span class="ptile-panel">
          <span class="ptile-cat">${T(p.category)}</span>
          <h2 class="ptile-name">${T(p.title)}</h2>
          <span class="ptile-place">${T(p.place)}</span>
          <span class="ptile-blurb">${T(p.blurb)}</span>
          <span class="ptile-foot">
            <span class="ptile-cta">${p.tour ? 'Take the tour' : 'View project'} ${ARROW}</span>
            <span class="ptile-year">${p.year}</span>
          </span>
        </span>
      </a>
    </article>`;
  }).join('');

  /* ---- filters ---- */
  // The tiles are built from projects-data.js, so the language swap does not
  // reach them. Update the four bits of copy in place — rebuilding the grid
  // would throw away the reveal state and the current filter.
  document.addEventListener('de:lang', () => {
    mosaic.querySelectorAll('.ptile').forEach((tile, i) => {
      const p = projects[i];
      if (!p) return;
      const set = (sel, v) => { const el = tile.querySelector(sel); if (el) el.textContent = v; };
      set('.ptile-cat', T(p.category));
      set('.ptile-name', T(p.title));
      set('.ptile-place', T(p.place));
      set('.ptile-blurb', T(p.blurb));
      const img = tile.querySelector('.ptile-bg img');
      if (img) img.alt = T(p.title);
    });
  });

  const cats = ['All', ...Array.from(new Set(projects.map(p => p.category)))];
  rail.innerHTML = cats.map((c, i) => {
    const n = c === 'All' ? projects.length : projects.filter(p => p.category === c).length;
    return `<button class="pgf${i === 0 ? ' is-on' : ''}" type="button" data-cat="${c}">${c}<i>${n}</i></button>`;
  }).join('');

  const tiles = Array.from(mosaic.children);

  /* ---- reveal on entry ----
     The wipe is armed here rather than in the stylesheet, so a browser without
     IntersectionObserver just shows the tiles. Anything already on screen at
     load is revealed outright: waiting for the observer to report what is
     plainly visible costs a frame and can miss entirely if the page is
     restored mid-scroll. */
  if ('IntersectionObserver' in window && !reduce) {
    mosaic.classList.add('reveal-on');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    tiles.forEach(t => {
      const r = t.getBoundingClientRect();
      if (r.top < innerHeight * 0.94 && r.bottom > 0) t.classList.add('is-in');
      else io.observe(t);
    });

    /* Safety net that does not cost the effect. Blanket-revealing after a
       timeout would uncover every tile below the fold before you ever scroll
       to it. Instead: if after 2.5s nothing has been revealed even though a
       tile is plainly on screen, the observer is not working — only then
       reveal everything. */
    setTimeout(() => {
      if (tiles.some(t => t.classList.contains('is-in'))) return;
      const anyOnScreen = tiles.some(t => {
        const r = t.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      });
      if (anyOnScreen) tiles.forEach(t => t.classList.add('is-in'));
    }, 2500);
  } else {
    tiles.forEach(t => t.classList.add('is-in'));
  }

  rail.addEventListener('click', e => {
    const btn = e.target.closest('.pgf');
    if (!btn) return;
    const cat = btn.dataset.cat;
    rail.querySelectorAll('.pgf').forEach(b => b.classList.toggle('is-on', b === btn));

    let shown = 0;
    tiles.forEach(t => {
      const match = cat === 'All' || t.dataset.cat === cat;
      t.hidden = !match;
      if (match) shown++;
    });
    empty.hidden = shown > 0;

    /* Re-lay the visible tiles so a filtered view still reads as a composed
       mosaic — without this, hiding tiles leaves the surviving spans in
       whatever order they happened to be and the grid goes ragged. */
    let k = 0;
    tiles.forEach(t => {
      if (t.hidden) return;
      const L = LAYOUT[k % LAYOUT.length];
      t.style.setProperty('--span', L.span);
      t.style.setProperty('--ar', L.ar);
      if (mosaic.classList.contains('reveal-on')) t.classList.remove('is-in');
      k++;
    });
    requestAnimationFrame(() => requestAnimationFrame(() =>
      tiles.forEach(t => { if (!t.hidden) t.classList.add('is-in'); })));
  });

  /* ---- parallax drift ----
     The image inside each tile is 118% tall and offset, so it can slide
     without ever exposing an edge. One rAF for the whole page, and only for
     tiles currently on screen. */
  if (!reduce) {
    const imgs = tiles.map(t => t.querySelector('.ptile-bg img'));
    let ticking = false;
    const draw = () => {
      ticking = false;
      const vh = innerHeight;
      tiles.forEach((t, i) => {
        if (t.hidden) return;
        const r = t.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) return;
        const centre = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1
        imgs[i].style.transform = `translate3d(0, ${(centre * 7).toFixed(2)}%, 0)`;
      });
    };
    const req = () => { if (!ticking){ ticking = true; requestAnimationFrame(draw); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    draw();
  }

  /* ---- cursor bubble ---- */
  if (fine && !reduce) {
    const bub = document.createElement('div');
    bub.className = 'pcursor';
    document.body.appendChild(bub);
    let x = 0, y = 0, cx = 0, cy = 0, on = false, raf = null;

    const loop = () => {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      bub.style.translate = `${cx}px ${cy}px`;
      if (on || Math.abs(x - cx) > 0.4) raf = requestAnimationFrame(loop);
      else raf = null;
    };
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    mosaic.addEventListener('pointerover', e => {
      const a = e.target.closest('a[data-cta]');
      if (!a) return;
      bub.textContent = a.dataset.cta;
      bub.classList.add('is-on');
      on = true;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    mosaic.addEventListener('pointerout', e => {
      if (e.relatedTarget && e.target.closest('a') === e.relatedTarget.closest?.('a')) return;
      bub.classList.remove('is-on');
      on = false;
    });
  }

  requestAnimationFrame(() => hero && hero.classList.add('is-in'));
})();
