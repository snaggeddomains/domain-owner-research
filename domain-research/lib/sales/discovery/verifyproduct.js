// Sales Research — verify "company X has a product literally named <seed>" claims.
//
// The product-angle LLM confabulates these (it claimed instacart.com / snowflake.com
// have a "Carrot" product). A bare `<word> site:<domain>` check is too weak for a
// COMMON noun — instacart.com is a grocery marketplace, so "carrot" (the vegetable)
// is all over it and the check false-passes. So we adjudicate each claim against REAL
// web evidence with a cheap LLM that must distinguish an actual PRODUCT NAME from the
// word merely appearing (a store selling the item, a blog, a metaphor).
//
// verifyProductNames(candidates) → array aligned to input, each { verified, reason }
// where verified is true (confirmed) | false (refuted → drop) | null (couldn't tell →
// keep but don't claim an EXACT match). Fully fail-open (no key → all null).

import Anthropic from '@anthropic-ai/sdk';
import { fetchJson } from '../../util.js';

const SERPER = 'https://google.serper.dev/search';

async function serper(q, env) {
  if (!env.SERPER_API_KEY) return [];
  try {
    const data = await fetchJson(SERPER, {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ q, num: 8 }),
    });
    const org = Array.isArray(data && data.organic) ? data.organic : [];
    const out = org.slice(0, 6).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }));
    const kg = data && data.knowledgeGraph;
    if (kg && (kg.title || kg.description)) out.unshift({ title: kg.title, link: kg.website || '', snippet: [kg.type, kg.description].filter(Boolean).join(' — ') });
    return out;
  } catch { return []; }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

function parseArray(text) {
  const s = String(text || '');
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

export async function verifyProductNames(candidates, env = process.env) {
  const n = candidates.length;
  const nulls = candidates.map(() => ({ verified: null, reason: '' }));
  if (!n || !env.ANTHROPIC_API_KEY || !env.SERPER_API_KEY) return nulls;

  // Evidence per candidate: a broad search of the company name + the word (NOT
  // site-scoped — we want third-party corroboration that it's a real product).
  const evid = await mapPool(candidates, 6, (c) => serper(`"${c.company}" "${c.word}"`, env));
  const blocks = candidates.map((c, i) => {
    const lines = (evid[i] || []).map((r) => `- ${r.title || ''} — ${r.snippet || ''} (${r.link || ''})`).join('\n') || '(no results)';
    return `[${i}] Company: ${c.company} · Domain: ${c.domain} · Claimed product name: "${c.word}"\nEVIDENCE:\n${lines}`;
  }).join('\n\n');

  const prompt = `We are checking claims that a company markets a PRODUCT / app / service / feature LITERALLY NAMED a given word. For EACH item, decide from the EVIDENCE whether that is TRUE.

Confirm (verified=true) ONLY if the evidence clearly shows the company markets a product/app/service NAMED EXACTLY that word — e.g. "<Company>'s <Word>", "introducing <Word>", a product/landing page titled <Word>.
Refute (verified=false) when the word appears for another reason: an e-commerce/marketplace site that SELLS the item (a grocery store selling carrots), a blog/news article, an unrelated meaning, a person's name, or a metaphor/"carrot-and-stick".
Use verified=null only when the evidence genuinely isn't enough to tell.
Be strict — a fabricated product claim with no corroboration is verified=false, not null.

Return ONLY a JSON array, one object per item IN ORDER:
[{"i":0,"verified":true,"reason":"short"}]

ITEMS:
${blocks}`;

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60000, maxRetries: 2 });
    const model = env.SALES_VERIFY_MODEL || 'claude-haiku-4-5-20251001';
    const resp = await client.messages.create({ model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const arr = parseArray(text);
    if (!Array.isArray(arr)) return nulls;
    const out = candidates.map(() => ({ verified: null, reason: '' }));
    for (const r of arr) {
      const i = Number(r && r.i);
      if (Number.isInteger(i) && i >= 0 && i < n) {
        out[i] = { verified: r.verified === true ? true : (r.verified === false ? false : null), reason: String(r.reason || '').slice(0, 140) };
      }
    }
    return out;
  } catch { return nulls; }
}
