/* Copy the footer from index.html onto every other page.
   ---------------------------------------------------------------------------
   The inner pages were built from an older copy and had drifted: the previous
   logo, no social row, no credit button. Rather than hand-edit five files and
   let them drift again, index.html is the source and this rewrites the rest.

   The index footer links with in-page anchors (#contact, #work). Those are
   meaningless on another page, so they are rewritten to the real pages on the
   way across — otherwise every footer link on about.html would jump nowhere.

   Run after changing the footer:  node tools/sync-footer.mjs
*/
import fs from 'node:fs';

const PAGES = ['about.html', 'services.html', 'projects.html', 'contact.html', 'project.html'];

// in-page anchor on index -> where it should point from anywhere else
const REMAP = {
  '#contact': 'contact.html',
  '#work': 'projects.html',
  '#services': 'services.html',
  '#studio': 'about.html',
  '#top': 'index.html'
};

function grabFooter(html) {
  const i = html.indexOf('<footer class="footer"');
  if (i < 0) return null;
  const j = html.indexOf('</footer>', i);
  if (j < 0) return null;
  return { start: i, end: j + '</footer>'.length, html: html.slice(i, j + '</footer>'.length) };
}

const index = fs.readFileSync('index.html', 'utf8');
const src = grabFooter(index);
if (!src) { console.error('no footer found in index.html'); process.exit(1); }

// the id lives on the index footer so #contact resolves there; elsewhere it
// would be a duplicate target that no link uses
const ported = src.html
  .replace(/href="(#[a-z]+)"/g, (m, hash) => REMAP[hash] ? `href="${REMAP[hash]}"` : m)
  .replace('<footer class="footer" id="contact">', '<footer class="footer">');

let changed = 0;
for (const page of PAGES) {
  const html = fs.readFileSync(page, 'utf8');
  const dst = grabFooter(html);
  if (!dst) { console.log(`  ${page}  no footer, skipped`); continue; }
  if (dst.html === ported) { console.log(`  ${page}  already current`); continue; }
  fs.writeFileSync(page, html.slice(0, dst.start) + ported + html.slice(dst.end), 'utf8');
  console.log(`  ${page}  updated (${dst.html.length} -> ${ported.length} bytes)`);
  changed++;
}
console.log(changed ? `\n${changed} page(s) synced from index.html` : '\nall pages already in sync');
