/* Say where a translation file stopped lining up with the English.
   ---------------------------------------------------------------------------
   A missing line shifts everything below it, and the result reads as plausible
   nonsense rather than failing. Comparing the tags and {{n}} tokens on each
   line against its English source finds the exact line where the drift starts.

       node tools/i18n-gap.mjs es
*/
import fs from 'node:fs';

global.window = {};
new Function('window', fs.readFileSync('js/lang/en.js', 'utf8'))(global.window);
const EN = global.window.DE_I18N.en;
const K = Object.keys(EN);

const code = process.argv[2];
const lines = fs.readFileSync(`js/lang/src/${code}.lines`, 'utf8')
  .replace(/\r/g, '').split('\n');
while (lines.length && lines[lines.length - 1] === '') lines.pop();

console.log(`${lines.length} lines vs ${K.length} strings`);
const sig = s => (s.match(/<\/?[a-z][a-z0-9]*|\{\{\d\}\}/gi) || []).map(x => x.toLowerCase()).join(',');

for (let i = 0; i < K.length; i++) {
  if (sig(EN[K[i]] || '') !== sig(lines[i] || '')) {
    console.log(`\nfirst divergence at line ${i + 1}`);
    for (let j = Math.max(0, i - 2); j < i + 3; j++) {
      console.log(`  EN ${j + 1}| ${(EN[K[j]] || '').slice(0, 78)}`);
    }
    console.log('  ---');
    for (let j = Math.max(0, i - 2); j < i + 3; j++) {
      console.log(`  ${code} ${j + 1}| ${(lines[j] || '').slice(0, 78)}`);
    }
    process.exit(0);
  }
}
console.log('markup lines up all the way down');
