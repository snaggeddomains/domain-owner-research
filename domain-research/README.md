# Domain Research

AI-assisted domain **ownership** research. Enter a domain and a Claude- or
OpenAI-powered agent fans out to multiple data sources — WHOIS/RDAP,
DNS/nameservers, the Wayback Machine, and any premium APIs you configure
(WhoisXML, DomainIQ, Big Domain Data) — then cross-references the results into a
single report with confidence levels and inline citations.

## How it works

```
Browser (public/)  ──POST /api/research──►  Vercel function (api/research.js)
                                                  │
                                                  ▼
                                        Agent loop (lib/agent.js)
                                  Claude OR OpenAI tool-calling (switchable):
                                     the model decides which lookups to run,
                                     reads the JSON, and writes the report
                                                  │
                          ┌───────────────┬───────┴───────┬────────────────┐
                          ▼               ▼               ▼                ▼
                    rdap_whois       dns_lookup     wayback_history   premium APIs
                     (free)            (free)          (free)        (key-gated)
```

- **Keys never reach the browser.** All third-party calls and the LLM call
  happen server-side in the Vercel function.
- **Sources are pluggable.** Each source in `lib/sources/` is exposed to the
  model as a "tool". A source only appears to the model when its required env
  vars are present, so the free sources work immediately and premium ones light
  up as you add keys.
- **The brain is switchable.** `LLM_PROVIDER=claude` (default) or `openai`.
  The agent loop lives in `lib/agent.js`; each provider is a thin adapter in
  `lib/llm/` that converts the shared tool specs to that provider's format.
  The Claude adapter uses adaptive thinking and caches the tools + system
  prompt prefix; the data sources are identical across providers.

## Setup

```bash
npm install
cp .env.example .env        # set LLM_PROVIDER + that provider's API key
npx vercel dev              # local dev at http://localhost:3000
```

Minimum to get a working result from the free sources:

- `LLM_PROVIDER=claude` + `ANTHROPIC_API_KEY` (default), **or**
- `LLM_PROVIDER=openai` + `OPENAI_API_KEY`.

Add premium data-source keys whenever you're ready.

### Choosing a Claude model

`ANTHROPIC_MODEL` defaults to `claude-opus-4-7` (highest quality). Because the
agent loop can run several steps and Vercel functions cap at 60s, consider
`claude-sonnet-4-6` for faster/cheaper runs, and tune `ANTHROPIC_EFFORT`
(`low`→`max`) or set `ANTHROPIC_THINKING=disabled` to trade some quality for
latency.

## Wiring up DomainIQ / Big Domain Data

You said you'd supply the URL structures — that's exactly what these env vars
are for, so no code changes are needed:

```
DOMAINIQ_URL_TEMPLATE=https://www.domainiq.com/api?key={key}&service=whois&domain={domain}&format=json
DOMAINIQ_API_KEY=your-key
```

`{domain}` and `{key}` are substituted at request time (the domain is
URL-encoded and validated first). Big Domain Data uses the same pattern via
`BIGDOMAINDATA_URL_TEMPLATE` / `BIGDOMAINDATA_API_KEY`.

If a real API returns a shape the model struggles with, the cleanest fix is to
add a small `summarize`/parse step in that source module — tell the assistant
and it can do it.

## Deploy (Vercel)

1. Push this folder to its own GitHub repo.
2. Import it in Vercel (zero-config: `public/` is served statically, `api/`
   becomes the function).
3. Add the env vars from `.env.example` in the Vercel project settings.

## Adding a new data source

Create `lib/sources/yoursource.js`:

```js
export default {
  name: 'yoursource_lookup',
  description: 'What it returns and when the model should use it.',
  parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] },
  requiresKey: ['YOURSOURCE_API_KEY'], // omit if free
  async run({ domain }, { env }) { /* fetch + return JSON */ },
};
```

Then register it in `lib/sources/index.js`. That's it — it's now a tool the AI
can choose to call.

## Rate limiting (Vercel KV)

`/api/research` is rate-limited per IP using **Vercel KV** (`lib/ratelimit.js`).
Create a KV store in the Vercel dashboard and link it to the project — Vercel
injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically. Tune the limit
with `RATE_LIMIT_MAX` (default 20) and `RATE_LIMIT_WINDOW_SEC` (default 3600).

If KV isn't configured (e.g. local `vercel dev`), the limiter **fails open** so
the free sources still work locally — so make sure KV is linked before you
share the URL, or your LLM + premium-API spend is open to the world.

## Notes & next steps

- **Streaming:** responses are returned in one shot. Server-sent events would
  let the UI show the report as it's written.
- **Caching:** identical lookups could be cached for a TTL to cut cost/latency.
