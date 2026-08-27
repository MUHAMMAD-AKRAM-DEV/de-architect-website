/* Inner-page hero: the headline reveal and the cover drift.
   ---------------------------------------------------------------------------
   About, Studio, Services and Contact all open the same way — a cover image
   that drifts a little slower than the page while the headline rises out of
   its clip. Four copies of fifteen lines is worse than one file that knows
   about four class names, so this handles all of them.

   main.js already runs the .r scroll reveals and the [data-count] tickers;
   this only covers what is specific to the hero.
*/
(() => {
  const hero = document.querySelector('.ab-hero, .sv-hero, .st-hero, .ct-hero');
  if (!hero) return;

  // The reveal is keyed off .is-in, added one frame after paint so the
  // transition has a start state to animate from. rAF is suspended in a
  // background tab though, and the headline is the whole point of the hero —
  // so a timer backs it up rather than risking an H1 that never appears.
  const show = () => hero.classList.add('is-in');
  requestAnimationFrame(show);
  setTimeout(show, 600);

  const cover = hero.querySelector('.ab-cover, .sv-cover, .st-cover, .ct-cover');
  if (!cover || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // stop drifting once the hero has left — past one viewport the image is gone
  // and there is nothing to move
  let tick = false;
  const drift = () => {
    tick = false;
    const y = Math.min(scrollY, innerHeight) * 0.3;
    cover.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(1.06)`;
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(drift); } },
                   { passive: true });
  drift();
})();
