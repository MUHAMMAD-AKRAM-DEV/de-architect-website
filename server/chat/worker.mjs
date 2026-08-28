/* Cloudflare Worker adapter.
   ---------------------------------------------------------------------------
   Workers read configuration from the `env` argument rather than a global
   process.env, so it is bridged across before the handler runs.

       npx wrangler deploy
       npx wrangler secret put ANTHROPIC_API_KEY
*/
export default {
  async fetch(request, env) {
    globalThis.process ||= { env: {} };
    Object.assign(process.env, env);

    const { answer, corsHeaders } = await import('./handler.mjs');
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const headers = { 'Content-Type': 'application/json' };
    for (const [k, v] of Object.entries(cors)) if (k[0] !== '_') headers[k] = v;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only.' }), { status: 405, headers });
    }
    if (!cors._allowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed.' }), { status: 403, headers });
    }

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify({ error: 'Body must be JSON.' }), { status: 400, headers }); }

    const out = await answer(body);
    return new Response(JSON.stringify(out.body), { status: out.status, headers });
  }
};
