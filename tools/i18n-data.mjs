/* Emit the translatable strings out of js/projects-data.js as JSON.
   ---------------------------------------------------------------------------
   The project copy is rendered by JavaScript long after the page is parsed, so
   it never carries a data-i18n attribute. i18n_extract.py shells out to this
   and folds the result into the same dictionary, which lets the render code
   ask for a translation by passing the English string.

   Only fields a visitor reads are listed. Slugs, filenames and image URLs are
   deliberately absent — translating those would break the links. */
import fs from 'node:fs';

global.window = {};
const src = fs.readFileSync('js/projects-data.js', 'utf8');
new Function('window', src)(global.window);

const out = [];
const push = v => { if (typeof v === 'string' && /[a-z]/i.test(v) && v.trim().length > 1) out.push(v.trim()); };

// the assistant's own wording — everything it says that is not a quote of the
// site's copy
new Function('window', fs.readFileSync('js/chat-copy.js', 'utf8'))(global.window);
Object.values(global.window.DE_CHAT_COPY || {}).forEach(push);

for (const p of global.window.DE_PROJECTS || []) {
  push(p.title); push(p.category); push(p.place); push(p.blurb);
  (p.body || []).forEach(push);
  (p.facts || []).forEach(([k, v]) => { push(k); push(v); });
  if (p.tour) push(p.tour.kind);
  if (p.video) push(p.video.caption);
}
process.stdout.write(JSON.stringify([...new Set(out)], null, 0));
