// OPTIONAL: keep the nav/footer in one place (partials/) and inject them.
// Requires the site to be served over http(s) (fetch cannot read file://).
// Usage: add <div data-include="partials/header.html"></div> where you want it,
// include this script, and remove the inlined nav/footer from the page.
document.querySelectorAll('[data-include]').forEach(async el => {
  try {
    const res = await fetch(el.getAttribute('data-include'));
    el.outerHTML = await res.text();
  } catch (e) { console.warn('include failed:', e); }
});