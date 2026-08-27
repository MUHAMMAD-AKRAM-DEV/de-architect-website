/* Copy the navigation chrome from index.html onto every other page.
   ---------------------------------------------------------------------------
   Same idea as sync-footer.mjs: index.html is the one place the navigation is
   written, and every other page is generated from it. Adding a link, or
   changing the language switcher, means editing index and re-running this
   rather than opening seven files.

   Two blocks travel together — the top bar, which carries the language
   switcher, and the slide-out menu. Both end on a closing tag at column 0, so
   anchoring on that finds the right one without counting tags.

   Run after changing either:  node tools/sync-nav.mjs
*/
import fs from 'node:fs';

const PAGES = ['about.html', 'studio.html', 'services.html', 'projects.html',
               'contact.html', 'project.html'];

const BLOCKS = [
  { name: 'topbar', open: '<header class="topbar"', close: '\n</header>' },
  { name: 'menu',   open: '<div class="offcanvas offcanvas-end menu-oc"', close: '\n</div>' }
];

// index links to its own sections; from anywhere else those must be real pages
const REMAP = { '#contact': 'contact.html', '#top': 'index.html' };

function grab(html, block) {
  const i = html.indexOf(block.open);
  if (i < 0) return null;
  const j = html.indexOf(block.close, i);
  if (j < 0) return null;
  return { start: i, end: j + block.close.length, html: html.slice(i, j + block.close.length) };
}

const index = fs.readFileSync('index.html', 'utf8');

let changed = 0;
for (const page of PAGES) {
  if (!fs.existsSync(page)) { console.log(`  ${page}  missing, skipped`); continue; }
  let html = fs.readFileSync(page, 'utf8');
  const before = html;

  for (const block of BLOCKS) {
    const src = grab(index, block);
    if (!src) { console.error(`no ${block.name} found in index.html`); process.exit(1); }
    const ported = src.html.replace(/href="(#[a-z]+)"/g,
      (m, hash) => REMAP[hash] ? `href="${REMAP[hash]}"` : m);
    const dst = grab(html, block);
    if (!dst || dst.html === ported) continue;
    html = html.slice(0, dst.start) + ported + html.slice(dst.end);
  }

  if (html === before) { console.log(`  ${page}  already current`); continue; }
  fs.writeFileSync(page, html, 'utf8');
  console.log(`  ${page}  updated`);
  changed++;
}
console.log(changed ? `\n${changed} page(s) synced from index.html` : '\nall pages already in sync');
