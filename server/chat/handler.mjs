/* ============================================================================
   DE Architects — the assistant's brain, server side
   ----------------------------------------------------------------------------
   The widget in the browser can only match keywords. This is the half that can
   actually answer an open question, and it has to live on a server because it
   holds an API key. Nothing here ever ships to a browser.

   It is deliberately framework-agnostic: `answer()` takes a parsed body and
   returns a plain object. The adapters next door (vercel.mjs, worker.mjs) do
   nothing but translate one host's request/response shape into this.

       ANTHROPIC_API_KEY   required
       ALLOWED_ORIGINS     comma-separated list of sites allowed to call this
       CHAT_MODEL          optional override, defaults to claude-opus-5

   The system prompt is server/chat/knowledge.md, generated from the site's own
   copy by tools/chat-knowledge.mjs. Re-run that after changing site content or
   the assistant will keep quoting the old fees.
   ========================================================================== */
import Anthropic from '@anthropic-ai/sdk';
import { shape, LANGUAGES } from './shape.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE = fs.readFileSync(path.join(here, 'knowledge.md'), 'utf8');

const MODEL = process.env.CHAT_MODEL || 'claude-opus-5';

function briefing(langName) {
  return `You are the assistant on the DE Architects website — an architecture
and interior design studio. You answer visitors' questions about the studio.

HOW TO ANSWER
- Two to four sentences. This is a small chat bubble, not a brochure.
- Warm and direct. Write the way the site is written: plain, specific, no
  marketing language, no exclamation marks, no emoji.
- Answer the question that was asked. Do not add a sales pitch to the end.
- Reply in ${langName}. If the visitor writes in a different language, follow
  them into that language instead.

WHAT YOU MAY SAY
- Everything in the briefing below is true and yours to use freely.
- If something is not in the briefing — a price for a specific job, a date, a
  promise about their particular site, whether their extension will be approved
  — say plainly that you do not know and that the studio can answer properly.
  Never invent a figure, a deadline, or a case study.
- If a question has nothing to do with the studio or building, say so kindly in
  one line and offer to help with the studio instead.

WHO YOU ARE
- You are the studio's assistant, not one of the architects. If you are asked
  whether you are a person, say what you are — plainly, without apologising —
  and offer to put them in touch with the team.
- You cannot book meetings, send emails, or access anyone's file. What you can
  do is point at the contact form, the phone number, or WhatsApp.

===== BRIEFING =====

${KNOWLEDGE}`;
}

let client;
const anthropic = () => (client ||= new Anthropic());

export async function answer(body) {
  // everything is checked before a single token is spent
  const { turns, lang, error } = shape(body);
  if (error) return error;

  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 1024,                 // a chat bubble; the prompt asks for 2-4 sentences
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',             // a policy decline is rescued in the same call
      output_config: { effort: 'low' }, // an FAQ answer does not need deep reasoning
      system: [{
        type: 'text',
        text: briefing(LANGUAGES[lang]),
        // the briefing is long and identical on every request, so it is cached
        // rather than re-read at full price each time
        cache_control: { type: 'ephemeral' }
      }],
      messages: turns
    });

    if (res.stop_reason === 'refusal') {
      return { status: 200, body: { reply: null, refused: true } };
    }

    const reply = res.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    return { status: 200, body: { reply } };
  } catch (err) {
    // Distinguish what the caller can do something about from what they cannot.
    // A 429 is worth retrying; a 401 means the deploy is misconfigured and no
    // amount of retrying will help.
    if (err instanceof Anthropic.RateLimitError) {
      return { status: 429, body: { error: 'Busy just now — try again in a moment.' } };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[chat] ANTHROPIC_API_KEY missing or wrong', err);
      return { status: 500, body: { error: 'The assistant is not configured.' } };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { status: 503, body: { error: 'Could not reach the assistant.' } };
    }
    console.error('[chat] unexpected failure', err);
    return { status: 500, body: { error: 'The assistant could not answer that.' } };
  }
}

/* --- who is allowed to call this ------------------------------------------
   Without an allowlist any site could point their widget at this endpoint and
   spend the studio's tokens. */
export function corsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : allowed[0] || '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    _allowed: ok
  };
}
