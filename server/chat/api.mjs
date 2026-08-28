/* Node adapter — Vercel, Netlify, or any host that speaks (req, res).
   ---------------------------------------------------------------------------
   On Vercel this file goes at api/chat.mjs; on Netlify, netlify/functions/.
   It does nothing but translate the host's request shape into handler.mjs and
   the answer back out again. */
import { answer, corsHeaders } from './handler.mjs';

export default async function handler(req, res) {
  const cors = corsHeaders(req.headers.origin);
  for (const [k, v] of Object.entries(cors)) if (k[0] !== '_') res.setHeader(k, v);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (!cors._allowed) return res.status(403).json({ error: 'Origin not allowed.' });

  // some hosts parse the body, some hand over a stream
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => { d += c; if (d.length > 64_000) req.destroy(); });
        req.on('end', () => resolve(d));
        req.on('error', reject);
      }));
    } catch {
      return res.status(400).json({ error: 'Body must be JSON.' });
    }
  }

  const out = await answer(body);
  res.status(out.status).json(out.body);
}
