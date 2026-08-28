/* Build the assistant's briefing from the site itself.
   ---------------------------------------------------------------------------
   The server needs to know what the studio does, charges, and has built. All
   of that is already written on the site, so writing it a second time by hand
   would guarantee the two drift apart — the assistant would keep quoting a fee
   policy the FAQ no longer states.

   This reads js/lang/en.js (every string on the site) and js/projects-data.js
   (the work), and writes server/chat/knowledge.md. Re-run it whenever the copy
   changes:

       node tools/chat-knowledge.mjs

   A fact whose source string has gone missing is reported rather than silently
   dropped, so a reworded FAQ shows up here instead of quietly leaving a hole
   in what the assistant knows.
*/
import fs from 'node:fs';

global.window = {};
new Function('window', fs.readFileSync('js/lang/en.js', 'utf8'))(global.window);
new Function('window', fs.readFileSync('js/projects-data.js', 'utf8'))(global.window);

const EN = new Set(Object.values(global.window.DE_I18N.en));
const missing = [];

// pull a string straight from the site, and complain if it has been reworded
const say = text => {
  if (!EN.has(text)) missing.push(text);
  return text.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
             .replace(/&rsquo;/g, '’').replace(/&amp;/g, '&')
             .replace(/<[^>]+>/g, '');
};

const FACTS = [
  ['What it costs', 'Fees are a fixed sum per stage, not a percentage of a moving construction cost. We quote after the first meeting, once we know the size and the scope. Small interior projects usually start in the low thousands; a whole house is a percentage-of-build conversation we will have openly.'],
  ['How long it takes', 'Design runs six to twelve weeks for an interior, three to five months for a house. Permissions add eight to sixteen weeks and are outside anyone&rsquo;s control. Construction depends on your builder, but we will give you a realistic programme rather than an optimistic one.'],
  ['Is the first meeting free', 'Yes &mdash; one meeting, on site or at the studio, with no charge and nothing to sign. If you then want a written feasibility note before committing to a full project, that is a small fixed fee we deduct from the design fee later.'],
  ['Do you need to know your budget', 'No, but a rough range helps enormously. It is the difference between us sketching something you can afford and something you cannot, and nobody enjoys the second conversation.'],
  ['Small projects', 'Yes. One reimagined room is a real project if the thinking is worth doing, and some of our best work has been the smallest. If the job genuinely does not need an architect we will tell you that instead of taking the fee.'],
  ['Working with your builder', 'Happily. We can also run a tender and get you three comparable prices, which is usually worth more than the fee it costs. If you have nobody yet, we will suggest contractors we have worked with before — we take no commission from them.'],
  ['Planning permission', 'We prepare and submit the whole application and deal with the case officer through to the decision. We will also tell you honestly, at the first meeting, how likely it is to be granted.'],
  ['3D visuals on their own', 'That is a service on its own. Send us your drawings — from us or from anyone else — and we will model them and produce stills, an animation or a browser tour you can send to a client or a lender.'],
  ['What to bring to a first meeting', 'Photographs, any drawings or deeds you have, and a list of what annoys you about the place today. That last one is usually the most useful document in the room.'],
  ['Working outside the city', 'Regularly. Travel is charged at cost and agreed up front. For projects far enough away that weekly site visits are not sensible, we set up a schedule of key inspections instead and are honest about it from the start.'],
  ['Careers', 'Fourteen of us, and the average stay is over five years. We take one or two students each summer and give them real drawings to do, not coffee runs. If you want to work here, send us three pieces of work you are proud of and tell us why.'],
  ['How a project runs', 'Every project runs the same way. You always know which stage you are in, what is being decided, and what it costs before it starts.'],
  ['What happens after an enquiry', 'A real answer from one of us within two working days &mdash; not an auto-response. If we are the wrong studio for the job we will say so, and usually suggest someone better suited.'],
  ['The studio', 'Two floors above a foundry yard: a drafting hall, a model shop that makes a lot of dust, and a wall of material samples nobody is allowed to tidy. This is the room every project passes through.'],
  ['History', 'The studio began in 2009 with one house and a conviction that has not changed since: a building should be shaped by the life inside it, not the other way round. That first client wanted somewhere to cook, read and have people over — so we designed around a kitchen and let the rest follow.'],
  ['Size today', 'Today the practice is fourteen people across two studios, working on everything from a single reimagined room to a whole building brought back into use. No project is too small if the thinking is worth doing.']
];

const SERVICES = [
  ['Residential Architecture', 'Complete home design — custom houses, villas and additions drawn around your site, your light and your life.'],
  ['Interior Design', 'Layouts, materials, joinery and furnishing that turn a house into a home you never want to leave.'],
  ['Commercial & Workspaces', 'Functional, memorable environments for the places people work, shop and gather.'],
  ['Renovation & Restoration', 'The cheapest and greenest square metre is the one you do not build. We would rather rework what exists than add to it.'],
  ['Landscape & Exteriors', 'The garden, the approach, the terrace and the parking are part of the building, not an afterthought once the scaffolding comes down. Drawn at the same time as the house, they make the whole thing feel settled.'],
  ['3D Visualisation', 'Standing in a room a year before it exists changes the decisions people make. We build every project in 3D anyway, so turning that into images or a walkthrough you can move around in costs very little extra.']
];

const projects = (global.window.DE_PROJECTS || []).map(p => {
  const facts = (p.facts || []).map(([k, v]) => `${k}: ${v}`).join('; ');
  return `- **${p.title}** (${p.category}, ${p.place}, ${p.year}) — ${p.blurb} ${facts}.` +
         (p.tour ? ` Has a 3D virtual tour (${p.tour.kind}) you can walk through in the browser.` : '');
});

const md = `# DE Architects — what the assistant knows

Generated by tools/chat-knowledge.mjs from the site's own copy. Do not edit by
hand; edit the site and re-run the tool.

## Who we are

DE Architects is an architecture and interior design studio. We work on houses,
interiors, workspaces and buildings that deserve another life — and we start
every one of them the same way, by watching how a place is actually used.
Fourteen people across two studios. Founded 2009.

## The six services

${SERVICES.map(([n, d]) => `- **${n}** — ${say(d)}`).join('\n')}

## Facts we can state

${FACTS.map(([q, a]) => `### ${q}\n${say(a)}`).join('\n\n')}

## How to reach the studio

- Phone: +1 (000) 000-0000
- Email: studio@dearchitect.com
- Careers: careers@dearchitect.com
- Design Office: 24 Foundry Lane, Design District (head office — drafting hall, model shop, materials library)
- Site Studio: 9 Meridian Court, Riverside (closer to most live construction work)
- Hours: Monday–Thursday 09:00–18:00, Friday 09:00–16:00, Saturday by appointment, Sunday closed
- The contact page has a short enquiry form. There is also a WhatsApp button on every page.

## The work

${projects.join('\n')}

## Pages on this site

- \`index.html\` — home, with a scroll-driven 3D fly-through of the studio
- \`projects.html\` — all twelve projects; \`project.html?p=<slug>\` for one
- \`services.html\` — the six services in detail, fees, and an FAQ
- \`studio.html\` — the physical studio, the model shop, a day here
- \`about.html\` — the practice, the people, values, awards
- \`contact.html\` — enquiry form, both addresses, hours
`;

fs.mkdirSync('server/chat', { recursive: true });
fs.writeFileSync('server/chat/knowledge.md', md, 'utf8');

console.log(`  server/chat/knowledge.md written — ${projects.length} projects, ` +
            `${SERVICES.length} services, ${FACTS.length} facts`);
if (missing.length) {
  console.log(`\n  ${missing.length} fact(s) no longer match the site's copy word for word.`);
  console.log('  They are still included, but the site has been reworded since — worth a look:');
  missing.forEach(m => console.log(`    ${JSON.stringify(m.slice(0, 72))}…`));
}
