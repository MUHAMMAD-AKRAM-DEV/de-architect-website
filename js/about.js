/* About page: the headline reveal and the cover drift.
   main.js already runs the .r scroll reveals and the [data-count] tickers, so
   this only handles what is specific to the hero. */
(() => {
  const hero = document.getElementById('abHero');
  if (!hero) return;
  requestAnimationFrame(() => hero.classList.add('is-in'));

  const cover = hero.querySelector('.ab-cover');
  if (!cover || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let tick = false;
  const drift = () => {
    tick = false;
    const y = Math.min(scrollY, innerHeight) * 0.3;
    cover.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(1.06)`;
  };
  addEventListener('scroll', () => { if (!tick){ tick = true; requestAnimationFrame(drift); } }, { passive: true });
  drift();
})();
