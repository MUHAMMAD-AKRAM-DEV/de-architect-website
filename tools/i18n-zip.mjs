/* Pair a plain list of translations with the English strings, in order.
   ---------------------------------------------------------------------------
   js/lang/src/<code>.lines holds one translation per line, in the same order
   as the English keys. Blank lines mean "not translated yet" and are skipped,
   so a partial file is fine. This writes the English -> translation json that
   i18n-build.mjs then turns into the file the site loads.

   Newlines inside a string would break the format, so \n is not supported —
   none of the copy needs it.

       node tools/i18n-zip.mjs de
*/
import fs from 'node:fs';

global.window = {};
new Function('window', fs.readFileSync('js/lang/en.js', 'utf8'))(global.window);
const EN = global.window.DE_I18N.en;
const KEYS = Object.keys(EN);

const code = process.argv[2];
if (!code) { console.error('which language?'); process.exit(1); }

const file = `js/lang/src/${code}.lines`;
const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
while (lines.length && lines[lines.length - 1] === '') lines.pop();

if (lines.length !== KEYS.length) {
  console.error(`${file} has ${lines.length} lines but there are ${KEYS.length} strings.`);
  console.error('The two must line up exactly — otherwise every translation after the');
  console.error('first gap lands on the wrong string.');
  process.exit(1);
}

// A matching line count does not prove the lines are paired correctly — one
// missing translation shifts everything after it by one, and the result reads
// as plausible nonsense rather than failing. The tags and {{n}} tokens in a
// translation have to match its English source, so comparing those catches a
// shift immediately, at the line where it starts.
const sig = s => (s.match(/<\/?[a-z][a-z0-9]*|\{\{\d\}\}/gi) || [])
  .map(x => x.toLowerCase()).join(',');

const drift = [];
lines.forEach((line, i) => {
  const v = line.trim();
  if (!v) return;
  if (sig(EN[KEYS[i]]) !== sig(v)) drift.push({ i, en: EN[KEYS[i]], tr: v });
});

if (drift.length) {
  const first = drift[0];
  console.error(`${file}: ${drift.length} line(s) do not match the markup of their source.`);
  console.error('This usually means a line is missing and everything below it has shifted.');
  console.error(`First at line ${first.i + 1}:`);
  console.error(`  english: ${first.en.slice(0, 100)}`);
  console.error(`  yours:   ${first.tr.slice(0, 100)}`);
  process.exit(1);
}

const out = {};
let filled = 0;
lines.forEach((line, i) => {
  const v = line.trim();
  if (!v) return;
  out[EN[KEYS[i]]] = v;
  filled++;
});

fs.writeFileSync(`js/lang/src/${code}.json`, JSON.stringify(out, null, 1), 'utf8');
console.log(`  ${code}: ${filled}/${KEYS.length} lines filled -> js/lang/src/${code}.json`);
