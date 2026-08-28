/* What the assistant understands.
   ---------------------------------------------------------------------------
   Two suites, both runnable without a browser and without an API key. They
   read js/chat.js directly, so they test the shipped matcher rather than a
   copy of it.

     1. Typed questions reach the right intent, in all six languages — and a
        question about nothing in particular reaches none of them.
     2. Every quick reply reaches the intent it was written to trigger. Not a
        theoretical worry: seven of the thirty-six missed the first time,
        including in English, which meant the assistant could not answer its
        own suggested questions.

       node tools/chat-test.mjs
*/
import fs from 'node:fs';

// lift the matcher out of the widget without running the whole IIFE
const src = fs.readFileSync('js/chat.js', 'utf8');
const from = src.indexOf('const INTENTS = [');
const to = src.indexOf('/* --- is the visitor asking about one particular project?');
if (from < 0 || to < 0) {
  console.error('chat.js has moved its matcher — update the slice markers in this test.');
  process.exit(1);
}
const match = new Function(src.slice(from, to) + '\nreturn match;')();

global.window = {};
new Function('window', fs.readFileSync('js/chat-copy.js', 'utf8'))(global.window);
const COPY = global.window.DE_CHAT_COPY;
new Function('window', fs.readFileSync('js/lang/en.js', 'utf8'))(global.window);
for (const l of ['de', 'fr', 'es', 'ar', 'ur']) {
  new Function('window', fs.readFileSync(`js/lang/${l}.js`, 'utf8'))(global.window);
}
const EN = global.window.DE_I18N.en;
const REV = new Map(Object.keys(EN).map(k => [EN[k], k]));
const t = (s, lang) => {
  if (lang === 'en') return s;
  const k = REV.get(s);
  return (k && global.window.DE_I18N[lang][k]) || s;
};

/* --- 1. typed questions --------------------------------------------------- */
const TYPED = [
  ['how much does it cost?', 'fees'], ['was kostet das?', 'fees'],
  ['quels sont vos tarifs', 'fees'], ['¿cuánto cuesta?', 'fees'],
  ['كم التكلفة', 'fees'], ['قیمت کیا ہے', 'fees'],
  ['how long does it take', 'time'], ['wie lange dauert es', 'time'],
  ['combien de temps faut-il', 'time'], ['¿cuánto tiempo tarda?', 'time'],
  ['كم يستغرق', 'time'],
  ['what services do you offer', 'services'], ['welche leistungen', 'services'],
  ['where are you based', 'where'], ['wo sind sie', 'where'], ['أين أنتم', 'where'],
  ['are you a robot', 'bot'], ['bist du ein bot', 'bot'],
  ['I want to start a project', 'start'], ['ich möchte beginnen', 'start'],
  ['show me your projects', 'work'], ['can I see your work', 'work'],
  ['do you handle planning permission', 'permit'],
  ['I only need renders', 'visuals'],
  ['is the first meeting free', 'free'],
  ['what should I bring', 'bring'],
  ['do you have jobs', 'jobs'],
  ['what are your opening hours', 'hours'],
  ['danke', 'thanks'], ['gracias', 'thanks'], ['شکریہ', 'thanks'],
  ['hello', 'hello'], ['bonjour', 'hello'],
  // nothing to do with the studio: must fall through to the handover, not be
  // forced into the nearest intent
  ['what is the airspeed of a swallow', null]
];

let typedPass = 0;
for (const [q, want] of TYPED) {
  const got = match(q);
  if (got === want) typedPass++;
  else console.log(`  MISS  ${JSON.stringify(q)}  wanted ${want}, got ${got}`);
}
console.log(`  ${typedPass}/${TYPED.length} typed questions matched`);

/* --- 2. quick replies ----------------------------------------------------- */
const CHIPS = { qFees: 'fees', qTime: 'time', qWhat: 'services',
                qStart: 'start', qWork: 'work', qWhere: 'where' };

let chipBad = 0, chipTotal = 0;
for (const lang of ['en', 'de', 'fr', 'es', 'ar', 'ur']) {
  for (const [key, want] of Object.entries(CHIPS)) {
    const text = t(COPY[key], lang);
    const got = match(text);
    chipTotal++;
    if (got !== want) {
      chipBad++;
      console.log(`  MISS  ${lang}  ${JSON.stringify(text)}  wanted ${want}, got ${got}`);
    }
  }
}
console.log(`  ${chipTotal - chipBad}/${chipTotal} quick replies reach their intent`);

process.exit((TYPED.length - typedPass) + chipBad ? 1 : 0);
