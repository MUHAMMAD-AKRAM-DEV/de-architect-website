/* ============================================================================
   DE Architects — projects grid
   ----------------------------------------------------------------------------
   Renders the cards from js/projects-data.js and filters them by category.
   Filtering hides rather than re-renders, so the browser keeps the decoded
   images and switching categories costs nothing.
   ========================================================================== */
(() => {
  const grid = document.getElementById('pgrid');
  const bar = document.getElementById('pgFilters');
  const empty = document.getElementById('pgEmpty');
  const projects = window.DE_PROJECTS || [];
  if (!grid || !projects.length) return;

  const ARROW = '<svg width="17" height="11" viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M2 7h18M14 1l6 6-6 6"/></svg>';

  grid.innerHTML = projects.map((p, i) => `
    <article class="pgc${p.tour ? ' has-tour' : ''}" data-cat="${p.category}" style="--d:${(i % 3) * 90}ms">
      <a class="pgc-link" href="project.html?p=${encodeURIComponent(p.slug)}">
        <span class="pgc-shot">
          <img src="${p.cover}" alt="${p.title}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">
        </span>
        <span class="pgc-tags">
          <span class="pgc-cat">${p.category}</span>
          ${p.tour ? '<span class="pgc-tour"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>Virtual tour</span>' : ''}
        </span>
        <span class="pgc-body">
          <span class="pgc-top">
            <h3>${p.title}</h3>
            <span class="pgc-year">${p.year}</span>
          </span>
          <span class="pgc-place">${p.place}</span>
          <span class="pgc-blurb">${p.blurb}</span>
          <span class="pgc-cta">${p.tour ? 'Take the tour' : 'View project'} ${ARROW}</span>
        </span>
      </a>
    </article>`).join('');

  /* ---- filters ---- */
  const cats = ['All', ...Array.from(new Set(projects.map(p => p.category)))];
  bar.innerHTML = cats.map((c, i) => {
    const n = c === 'All' ? projects.length : projects.filter(p => p.category === c).length;
    return `<button class="pgf${i === 0 ? ' is-on' : ''}" type="button" data-cat="${c}">${c}<i>${n}</i></button>`;
  }).join('');

  const cards = Array.from(grid.children);
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.pgf');
    if (!btn) return;
    const cat = btn.dataset.cat;
    bar.querySelectorAll('.pgf').forEach(b => b.classList.toggle('is-on', b === btn));
    let shown = 0;
    cards.forEach((card, i) => {
      const match = cat === 'All' || card.dataset.cat === cat;
      card.hidden = !match;
      if (match){ card.style.setProperty('--d', (shown % 3) * 70 + 'ms'); shown++; }
    });
    empty.hidden = shown > 0;
    // replay the entrance on the cards that remain
    grid.classList.remove('is-in');
    void grid.offsetWidth;
    grid.classList.add('is-in');
  });

  requestAnimationFrame(() => grid.classList.add('is-in'));
})();
