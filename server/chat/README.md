# Putting a real model behind the assistant

The widget on the site works on its own: it matches keywords and answers the
common questions from the site's own copy. It is fast, free, and offline — and
it cannot answer a question nobody anticipated.

This folder is the other half. Deploy it and the assistant can answer anything
about the studio, in any of the six languages, in its own words.

**Nothing here goes on the website.** It runs on a server, because it holds an
API key. A key in a web page is a key anyone can read and spend.

---

## What it costs

Pennies, for a site this size. Each answer sends the briefing (~2,000 tokens)
plus the conversation, and returns two to four sentences.

The briefing is identical on every request, so it is marked for caching — after
the first call it is billed at a fraction of the normal input rate. In practice
a conversation costs well under a cent.

The model is `claude-opus-5`. To use a cheaper one, set `CHAT_MODEL` — for
example `claude-haiku-4-5`, which is a fifth of the price and perfectly capable
of answering questions about opening hours. That is your call to make, not one
made for you.

---

## Deploying it

You need somewhere to run a small function. All three below have a free tier
that will comfortably carry a studio website.

### Cloudflare Workers

```bash
cd server/chat
npm install
npx wrangler deploy worker.mjs --name de-architects-chat
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ALLOWED_ORIGINS      # https://your-site.com
```

### Vercel

Copy `handler.mjs`, `shape.mjs`, `knowledge.md` and `api.mjs` into `api/` in a
Vercel project, renaming `api.mjs` to `api/chat.mjs`. Then:

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add ALLOWED_ORIGINS
vercel deploy --prod
```

### Netlify

Same files under `netlify/functions/`, with `api.mjs` renamed `chat.mjs`. Set
the two variables under Site settings → Environment variables.

---

## Pointing the site at it

One line, before `js/chat.js` loads, on every page:

```html
<script>window.DE_CHAT_ENDPOINT = 'https://your-worker.workers.dev';</script>
```

Add it to `index.html` and run `node tools/sync-nav.mjs` if you want it carried
across, or paste it into all seven pages.

That is the only change the website needs. With the endpoint set the widget
sends the conversation there; without it, or if that server is unreachable, it
falls back to the local answers on its own. A visitor never sees a dead chat.

---

## Settings

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Your key, from console.anthropic.com |
| `ALLOWED_ORIGINS` | strongly advised | Comma-separated sites allowed to call this. **Leave it unset and any website can point their widget at your endpoint and spend your tokens.** |
| `CHAT_MODEL` | no | Defaults to `claude-opus-5` |

---

## Keeping its answers true

`knowledge.md` is generated from the site — the FAQ answers, the six services,
all twelve projects, the addresses and hours. It is not written by hand, so it
cannot quietly disagree with the site.

After changing any site copy:

```bash
node tools/chat-knowledge.mjs
```

It reports any fact whose wording no longer matches the site, so a reworded FAQ
surfaces instead of leaving the assistant quoting a policy you have changed.
Redeploy afterwards.

---

## What it will not do

The system prompt draws three hard lines, because an assistant on an
architecture practice's website is speaking for the practice:

- **It does not invent.** No price for a specific job, no date, no promise that
  a particular extension will get permission. Asked something it does not know,
  it says so and points at the studio.
- **It does not claim to be a person.** Asked directly, it says what it is and
  offers to put the visitor through.
- **It does not oversell.** It answers the question and stops.

---

## Checks

```bash
node server/chat/shape.test.mjs
```

Sixteen tests over what the endpoint does with whatever a browser sends it —
merging the assistant's multi-bubble answers into one turn, dropping injected
`system` roles, trimming a transcript that ends mid-answer, truncating a long
message, refusing a conversation too large to send. No API key needed; it runs
before any token is spent.

The live call itself is not covered — that needs a key and real requests. Send
it one when you deploy:

```bash
curl -X POST https://your-worker.workers.dev \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"what do you charge?"}],"lang":"en"}'
```
