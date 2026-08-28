/* Turn whatever the widget posted into something the API will accept.
   ---------------------------------------------------------------------------
   Kept separate from handler.mjs, and free of any dependency, so it can be
   tested without an API key or the SDK installed. This is the part most likely
   to be wrong: the endpoint is public, the key behind it is billable, and the
   transcript arrives from a browser where anything could have happened to it.
*/
export const LANGUAGES = {
  en: 'English', de: 'German', fr: 'French',
  es: 'Spanish', ar: 'Arabic', ur: 'Urdu'
};

export const LIMITS = {
  messages: 20,     // one visitor conversation, not a transcript dump
  chars: 2000,      // a single message
  total: 12000      // the whole conversation
};

export function shape(body) {
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const lang = LANGUAGES[body?.lang] ? body.lang : 'en';

  const clean = raw
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, LIMITS.chars) }))
    .filter(m => m.content.length > 0)
    .slice(-LIMITS.messages);

  if (!clean.length) {
    return { error: { status: 400, body: { error: 'Nothing to answer.' } } };
  }
  if (clean.reduce((n, m) => n + m.content.length, 0) > LIMITS.total) {
    return { error: { status: 413, body: { error: 'That conversation is too long to send.' } } };
  }

  // The API needs the roles to alternate, and the widget's stored transcript
  // does not: the assistant answers in several bubbles, so two or three
  // assistant messages sit next to each other. Merge each run into one turn
  // rather than dropping the extras, which would throw away what was said.
  const turns = [];
  for (const m of clean) {
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += '\n' + m.content;
    else turns.push({ ...m });
  }

  // it has to end on the visitor, or there is no question to answer
  while (turns.length && turns[turns.length - 1].role !== 'user') turns.pop();
  // and start on them, or the API rejects it
  while (turns.length && turns[0].role !== 'user') turns.shift();

  if (!turns.length) {
    return { error: { status: 400, body: { error: 'The last message must be from the visitor.' } } };
  }
  return { turns, lang };
}
