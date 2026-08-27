/* Copy the slide-out menu from index.html onto every other page.
   ---------------------------------------------------------------------------
   Same idea as sync-footer.mjs: index.html is the one place the navigation is
   written, and every other page is generated from it. Adding a link means
   editing index and re-running this, not opening seven files.

   The menu block runs from the offcanvas wrapper to its own closing </div>,
   which sits at column 0 — the inner .oc-links close is indented, so anchoring
   on a line-start </div> finds the right one without counting tags.

   Run after changing the menu:  node tools/sync-nav.mjs
*/
import fs from 'node:fs';

const PAGES = ['about.html', 'studio.html', 'services.html', 'projects.html',
               'contact.html', 'project.html'];

const OPEN = '<div class="offcanvas offcanvas-end menu-oc"';

function grabMenu(html) {
  const i = html.indexOf(OPEN);
  if (i < 0) return null;
  const j = html.indexOf('\n</div>', i);
  if (j < 0) return null;
  const end = j + '\n</div>'.length;
  return { start: i, end, html: html.slice(i, end) };
}

const src = grabMenu(fs.readFileSync('index.html', 'utf8'));
if (!src) { console.error('no menu found in index.html'); process.exit(1); }

let changed = 0;
for (const page of PAGES) {
  if (!fs.existsSync(page)) { console.log(`  ${page}  missing, skipped`); continue; }
  const html = fs.readFileSync(page, 'utf8');
  const dst = grabMenu(html);
  if (!dst) { console.log(`  ${page}  no menu, skipped`); continue; }
  if (dst.html === src.html) { console.log(`  ${page}  already current`); continue; }
  fs.writeFileSync(page, html.slice(0, dst.start) + src.html + html.slice(dst.end), 'utf8');
  console.log(`  ${page}  updated`);
  changed++;
}
console.log(changed ? `\n${changed} page(s) synced from index.html` : '\nall pages already in sync');
