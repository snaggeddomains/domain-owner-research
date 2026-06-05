// Sales Research — Branded-operator discovery (the highest-intent upgrade buyers).
//
// Finds REAL, currently-operating companies / products / apps whose BRAND is built
// around the seed's core word — e.g. ask.com → VideoAsk, Ask-AI, EasyAsk, SalesAsk,
// AskNicely. They already use the word, so the clean .com is a natural
// consolidation: these are the small/mid operators most likely to actually BUY.
//
// Why a dedicated pass: the upgrade affix dictionary (tryask/useask/getask…) and
// the LLM category passes both MISS these — the word is embedded with an arbitrary
// modifier (video-, sales-, easy-, -nicely) that no fixed dictionary enumerates.
// An LLM knows the real brands; we ground them with a token check + a liveness
// probe so hallucinated/dead domains drop out. FREE (one LLM call + HEAD probes).
//
// Standalone:  ANTHROPIC_API_KEY=… node lib/sales/discovery/operators.js ask.com

import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';
import { seedParts } from './upgrade.js';

function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const cleanDomain = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

// Precision gate: does `word` appear as a DISTINCT element of the brand name —
// a real token or a CamelCase part — rather than an accidental substring? Splitting
// on CamelCase + delimiters turns "VideoAsk"/"EasyAsk"/"Ask-AI"/"Sales Ask" into
// clean tokens, so an exact token match keeps them but rejects "Flask"/"Basket".
export function hasWordElement(name, word) {
  const w = String(word || '').toLowerCase();
  if (!w) return false;
  const tokens = String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase → camel Case
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.includes(w);
}

// Liveness probe — drop hallucinated / dead domains so only real operators surface.
async function isLive(domain, timeout = 5000) {
  const probe = async (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
      return res.status < 400 || res.status === 401 || res.status === 403 || res.status === 429;
    } catch { return false; }
    finally { clearTimeout(t); }
  };
  return (await probe(`https://${domain}/`)) || (await probe(`http://${domain}/`));
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// LLM enumeration of real brands built around the seed word. High-recall prompt,
// precision enforced after the fact by hasWordElement + the liveness probe.
async function llmOperators(domain, sld, env, limit) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.SALES_OPERATOR_MODEL || env.SALES_ANGLE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  const prompt = `We are selling the premium domain "${domain}" (its core word is "${sld}").

Find as MANY real, currently-operating companies, products, or apps as you can whose BRAND NAME is built around the word "${sld}" — the word "${sld}" must appear as a distinct element of the name. They already use the word, so they're the natural buyers of the clean "${domain}".

Cover ALL THREE shapes and be EXHAUSTIVE on the SUFFIX shape (it's the easiest to overlook — think hard about real brands that END in "${sld}", e.g. a descriptive word immediately followed by "${sld}"):
  • SUFFIX:      <modifier>${sld}   — names that END in "${sld}"
  • PREFIX:      ${sld}<modifier>   — names that START with "${sld}"
  • STANDALONE / hyphenated / two-word forms (e.g. "${sld}-AI", "${sld} Labs").

Include companies of EVERY size — well-known and large brands too, NOT just startups. A large or well-funded brand that already uses the word is still a real prospect; do not skip it. (Small & mid-size operators are great too — list both.)

For EACH: the exact brand name and its primary website domain. REAL, verifiable companies only — do NOT invent names or guess domains; if unsure a company is real, omit it. No parked domains, no domainers.

Return JSON only:
{"companies":[{"name":"Brand Name","domain":"brand.com"}]}
List up to ${limit}. The word "${sld}" must genuinely be part of each brand name.`;
  const resp = await client.messages.create({ model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] });
  const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJsonLoose(text);
  const arr = (parsed && Array.isArray(parsed.companies)) ? parsed.companies : [];
  return arr.map((c) => ({ name: String(c.name || '').trim(), domain: cleanDomain(c.domain) }))
    .filter((c) => c.name && c.domain);
}

// Discover branded operators → live, deduped UPGRADE candidates
// [{ domain, company, subtype:'name_match', category:'upgrade', status:null }].
// subtype 'name_match' makes RESOLVE always keep them (they carry a real company),
// and they auto-qualify through the normal active-candidate enrichment.
export async function discoverOperators(seedDomain, env = process.env, { limit = 40, concurrency = 16 } = {}) {
  const { domain: self, sld } = seedParts(seedDomain);
  if (!sld || !env.ANTHROPIC_API_KEY) return [];

  let raw = [];
  try { raw = await llmOperators(self, sld, env, limit); } catch { return []; }

  // Dedupe by domain; drop the seed itself; require the word to be a real brand
  // element (token match on the name, or — if no name — a substring of the SLD).
  const seen = new Set([self]);
  const filtered = [];
  for (const c of raw) {
    if (!c.domain || seen.has(c.domain)) continue;
    const domSld = seedParts(c.domain).sld;
    if (!(hasWordElement(c.name, sld) || domSld.includes(sld))) continue;  // precision gate
    seen.add(c.domain);
    filtered.push(c);
  }
  if (!filtered.length) return [];

  // Liveness — keep only operators whose site actually loads.
  const live = await mapPool(filtered, concurrency, async (c) => ({ c, ok: await isLive(c.domain) }));
  return live.filter((x) => x.ok).map(({ c }) => ({
    domain: c.domain,
    company: c.name,
    subtype: 'name_match',
    category: 'upgrade',
    status: null,
  }));
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'ask.com';
  console.error(`\nBranded-operator discovery for ${seed} …\n`);
  const rows = await discoverOperators(seed, process.env);
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  console.log(pad('COMPANY', 30), 'DOMAIN');
  console.log('-'.repeat(60));
  for (const r of rows) console.log(pad(r.company, 30), r.domain);
  console.log('-'.repeat(60));
  console.log(`${rows.length} live branded operators\n`);
}
