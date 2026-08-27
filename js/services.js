/* Services page: the jump nav in the hero tracks whichever service you are on.
   page-hero.js handles the hero itself; main.js handles the .r reveals. */
(() => {
  const jump = document.querySelector('.sv-jump');
  const items = [...document.querySelectorAll('.sv-item')];
  if (!jump || !items.length) return;

  const links = new Map();
  jump.querySelectorAll('a').forEach(a => links.set(a.getAttribute('href').slice(1), a));

  const mark = id => {
    links.forEach((a, key) => a.classList.toggle('is-on', key === id));
  };

  if (!('IntersectionObserver' in window)) return;

  // a band across the middle of the viewport: whichever service is crossing it
  // owns the highlight, so the chip changes at a sensible moment rather than
  // the instant a section's top edge appears
  const io = new IntersectionObserver(entries => {
    const hit = entries.filter(e => e.isIntersecting)
                       .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) mark(hit.target.id);
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  items.forEach(i => io.observe(i));
})();
