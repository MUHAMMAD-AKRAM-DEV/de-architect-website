/* Rewrite the editable .lines files from the translations already recorded.
   ---------------------------------------------------------------------------
   The .lines format is positional — line N is the translation of English
   string N — which makes it pleasant to write and fragile to add to. As soon
   as the site gains a string, every line below the new one is pointing at the
   wrong source.

   So .lines is treated as regenerable rather than precious: the .json files
   hold the translations keyed by their English text, and this rewrites the
   .lines files in the current order, leaving a blank line wherever a
   translation does not exist yet. Fill in the blanks, run i18n-zip, done.

       node tools/i18n-lines.mjs           # all languages
       node tools/i18n-lines.mjs de fr     # or just these
*/
import fs from 'node:fs';

global.window = {};
new Function('window', fs.readFileSync('js/lang/en.js', 'utf8'))(global.window);
const EN = global.window.DE_I18N.en;
const KEYS = Object.keys(EN);

const dir = 'js/lang/src';
const codes = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

for (const code of codes) {
  const jsonPath = `${dir}/${code}.json`;
  const pairs = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};

  let missing = 0;
  const lines = KEYS.map(k => {
    const v = pairs[EN[k]];
    if (v) return v;
    missing++;
    return '';
  });

  fs.writeFileSync(`${dir}/${code}.lines`, lines.join('\n') + '\n', 'utf8');
  console.log(`  ${code}  ${KEYS.length - missing}/${KEYS.length} kept` +
              (missing ? `, ${missing} blank line(s) to fill` : ', nothing missing'));
}
