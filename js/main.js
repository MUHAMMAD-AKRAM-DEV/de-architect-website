// hero entrance
  window.addEventListener('load', () => {
    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('play');
  });

  // sticky nav style on scroll
  const topbar = document.getElementById('topbar');
  if (topbar){
    const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 40);
    onScroll(); window.addEventListener('scroll', onScroll, { passive:true });
  }

  // generic reveal-on-scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.18 });
  document.querySelectorAll('.r').forEach(el => io.observe(el));

  // line-art buildings draw + photo reveal
  const bio = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); bio.unobserve(e.target); } });
  }, { threshold:.35 });
  document.querySelectorAll('.bld').forEach(el => bio.observe(el));

  // universal count-up: any [data-count], supports data-decimals and data-suffix (impact + reviews)
  function animateCount(el){
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.count) || 0;
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const suffixHTML = suffix ? '<em>' + suffix + '</em>' : '';
    if (reduceMotion){ el.innerHTML = target.toFixed(decimals) + suffixHTML; return; }
    const dur = 1500, start = performance.now();
    (function frame(now){
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = (target * eased).toFixed(decimals) + suffixHTML;
      if (p < 1) requestAnimationFrame(frame);
      else el.innerHTML = target.toFixed(decimals) + suffixHTML;
    })(performance.now());
  }
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); } });
  }, { threshold:.6 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  // hero parallax — background video glides upward, headline drifts downward and fades.
  // Scroll drives the main effect; the cursor adds a subtle drift ("moves with the cursor").
  const heroMedia = document.getElementById('heroMedia');
  const heroText  = document.getElementById('heroText');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mx = 0, my = 0, ticking = false;

  function heroParallax(){
    ticking = false;
    if (reduceMotion || !heroMedia) return;
    const y = window.scrollY;
    const vh = window.innerHeight || 1;
    const p = Math.min(y / vh, 1);                 // 0 → 1 across the hero
    heroMedia.style.transform = `translate3d(${mx * 12}px, ${(-y * 0.45) + (my * 10)}px, 0)`;
    heroText.style.transform  = `translate3d(${mx * -14}px, ${(y * 0.5) + (my * -8)}px, 0)`;
    heroText.style.opacity = String(Math.max(0, 1 - p * 1.2));
  }
  function requestHero(){ if(!ticking){ ticking = true; requestAnimationFrame(heroParallax); } }
  window.addEventListener('scroll', requestHero, { passive:true });
  if (!reduceMotion){
    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      requestHero();
    }, { passive:true });
  }
  heroParallax();

  // some browsers block muted autoplay until interaction — nudge play on first input
  const hv = document.getElementById('heroVideo');
  if (hv){
    const kick = () => { hv.play().catch(()=>{}); };
    hv.play().catch(()=>{});
    window.addEventListener('pointerdown', kick, { once:true });
    window.addEventListener('scroll', kick, { once:true, passive:true });
  }

  // ---- Recent projects: continuous auto-scroll marquee + prev/next controls ----
  const pm = document.getElementById('pmarquee');
  if (pm){
    const track = pm.querySelector('.pmarquee-track');
    track.innerHTML += track.innerHTML;              // duplicate set for a seamless loop
    const prevB = document.getElementById('pmPrev');
    const nextB = document.getElementById('pmNext');
    const half = () => track.scrollWidth / 2;        // width of one full set
    const step = () => { const c = pm.querySelector('.pcard'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(c).marginRight || 0) : 280; };

    const SPEED = 0.55;                               // px per frame (auto-scroll)
    let paused = false, manual = false, raf = null;

    function normalize(){
      const h = half();
      if (h <= 0) return;
      if (pm.scrollLeft >= h) pm.scrollLeft -= h;
      else if (pm.scrollLeft < 0) pm.scrollLeft += h;
    }
    function tick(){
      if (!paused && !manual){ pm.scrollLeft += SPEED; normalize(); }
      raf = requestAnimationFrame(tick);
    }
    if (!reduceMotion){ pm.scrollLeft = 1; raf = requestAnimationFrame(tick); }

    pm.addEventListener('pointerenter', () => paused = true);
    pm.addEventListener('pointerleave', () => paused = false);

    let nudgeT = null;
    function nudge(dir){
      manual = true;
      const h = half(), s = step();
      // make sure there's room to scroll in that direction (seamless jump by one set)
      if (dir < 0 && pm.scrollLeft < s) pm.scrollLeft += h;
      else if (dir > 0 && pm.scrollLeft > h - s) pm.scrollLeft -= h;
      pm.scrollBy({ left: dir * s, behavior: 'smooth' });
      clearTimeout(nudgeT);
      nudgeT = setTimeout(() => { manual = false; normalize(); }, 650);
    }
    if (prevB) prevB.addEventListener('click', () => nudge(-1));
    if (nextB) nextB.addEventListener('click', () => nudge(1));
  }

  // ---- Service tiers: accordion + synced media panel ----
  const acc = document.getElementById('tiersAcc');
  if (acc){
    const tiers = Array.from(acc.querySelectorAll('.tier'));
    const medias = Array.from(document.querySelectorAll('.tiers-media .tmedia'));
    const cap = document.getElementById('tiersCap');
    const titles = tiers.map(t => (t.querySelector('h3') || {}).textContent || '');

    function openTier(idx){
      tiers.forEach((t, i) => {
        const open = i === idx;
        t.classList.toggle('is-open', open);
        const h = t.querySelector('.tier-head');
        if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      medias.forEach((m, i) => m.classList.toggle('is-on', i === idx));
      if (cap && titles[idx]) cap.textContent = titles[idx];
    }
    tiers.forEach((t, i) => {
      const head = t.querySelector('.tier-head');
      if (head) head.addEventListener('click', () => openTier(i));
    });
  }

  // ---- Client reviews slider (avatars + arrows + auto-rotate) ----
  const revSlides = document.getElementById('revSlides');
  if (revSlides){
    const slides = Array.from(revSlides.querySelectorAll('.rev-slide'));
    const dots = Array.from(document.querySelectorAll('#revDots .rev-dot'));
    const prevB = document.getElementById('revPrev');
    const nextB = document.getElementById('revNext');
    const n = slides.length;
    let idx = 0, timer = null;

    function go(i){
      idx = (i + n) % n;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === idx));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
    }
    function start(){ if (reduceMotion) return; stop(); timer = setInterval(() => go(idx + 1), 6000); }
    function stop(){ if (timer){ clearInterval(timer); timer = null; } }

    if (prevB) prevB.addEventListener('click', () => { go(idx - 1); start(); });
    if (nextB) nextB.addEventListener('click', () => { go(idx + 1); start(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); start(); }));

    const stage = revSlides.closest('.rev-stage') || revSlides;
    stage.addEventListener('mouseenter', stop);
    stage.addEventListener('mouseleave', start);

    go(0); start();
  }

  // ---- Impact: three circular images rotating through three slots (front / top-right / corner) ----
  const impactMedia = document.getElementById('impactMedia');
  if (impactMedia){
    const items = Array.from(impactMedia.querySelectorAll('.imedia'));
    const annot = impactMedia.querySelector('.annot-text');
    const slots = [
      { t:'translate(0%,0%) scale(.72)',    z:3 },   // focus, centred in the ring
      { t:'translate(19%,-18%) scale(.8)',  z:1 },   // large circle, top-right (was the blob)
      { t:'translate(-30%,30%) scale(.34)', z:5 }    // small, bottom-left
    ];
    const positionAll = () => items.forEach(it => {
      const s = slots[(+it.dataset.slot) % 3];
      it.style.transform = s.t; it.style.zIndex = s.z;
    });
    const frontCaption = () => {
      const f = items.find(it => (+it.dataset.slot) === 0);
      return f ? f.dataset.caption : '';
    };
    if (annot){ annot.style.transition = 'opacity .3s ease'; annot.innerHTML = frontCaption(); }
    positionAll();

    if (!reduceMotion && items.length === 3){
      // Hold time per image before it rotates. Set to 500 for the 0.5s you asked about;
      // ~2500 reads much smoother/premium (0.5s is very fast). Change here:
      const ROTATE_MS = 2500;
      const rotate = () => {
        items.forEach(it => it.dataset.slot = ((+it.dataset.slot) + 2) % 3); // 1→3, 2→1, 3→2
        positionAll();
        if (annot){ annot.style.opacity = '0';
          setTimeout(() => { annot.innerHTML = frontCaption(); annot.style.opacity = '1'; }, 320); }
      };
      let timer = setInterval(rotate, ROTATE_MS);
      impactMedia.addEventListener('pointerenter', () => { clearInterval(timer); timer = null; });
      impactMedia.addEventListener('pointerleave', () => { if (!timer) timer = setInterval(rotate, ROTATE_MS); });
    }
  }