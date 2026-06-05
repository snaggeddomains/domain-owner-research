// Sales Research — relevance gate (don't let a big-but-irrelevant company rank high).
//
// abilityToPay() is purely financial, so a charter school ("The Ask Academy",
// $18.8M rev) or a souvenir shop that happens to own ask.net scores "strong". They
// are NOT buyers for the domain we're selling. This one cheap batched LLM call
// judges, for each enriched company, whether the seed domain is actually relevant
// to their brand/business — and the caller demotes the irrelevant ones to "Others"
// and caps their tier. Fault-tolerant: any failure → everyone stays relevant.
//
// Flags are stashed on the firmographics JSON (no DB migration): atp_relevant=false
// + atp_relevant_reason.

import Anthropic from '@anthropic-ai/sdk';

function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Mutates `rows` in place: sets firmographics.atp_relevant / atp_relevant_reason on
// enriched rows the LLM judges off-target. Returns the same rows for convenience.
export async function gateRelevance(seedDomain, rows, env = process.env) {
  if (!env.ANTHROPIC_API_KEY || !Array.isArray(rows) || !rows.length) return rows;
  // Only judge enriched, active companies (the ones that could wrongly rank high).
  const targets = rows.filter((r) => r.firmographics && r.status === 'active' && r.company);
  if (!targets.length) return rows;

  const list = targets.map((r, i) => {
    const f = r.firmographics || {};
    const bits = [f.industry, f.revenue ? `rev ${f.revenue}` : '', f.employees ? `${f.employees} staff` : '']
      .filter(Boolean).join(', ');
    return `${i}. ${r.company} (${r.domain})${bits ? ` — ${bits}` : ''}`;
  }).join('\n');

  const prompt = `We are selling the premium domain "${seedDomain}". For EACH company below, decide whether "${seedDomain}" is a RELEVANT acquisition for them — i.e. the domain fits their brand, product, or market and they'd plausibly want it. Mark as NOT relevant the companies whose match is only coincidental (the word appears in their name or they happen to own a similar domain, but their actual business — e.g. a school, a souvenir shop, a local services firm — has nothing to do with the domain's meaning).

Companies:
${list}

Return JSON only — an array, one entry per number:
{"verdicts":[{"i":0,"relevant":true,"reason":"3-5 words"}]}
Be strict: irrelevant-but-large still counts as NOT relevant.`;

  let parsed = null;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const model = env.SALES_RELEVANCE_MODEL || env.SALES_ANGLE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
    const resp = await client.messages.create({ model, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    parsed = parseJsonLoose(text);
  } catch { return rows; }   // fail open — never block the pipeline on relevance

  const verdicts = parsed && Array.isArray(parsed.verdicts) ? parsed.verdicts : [];
  for (const v of verdicts) {
    const t = targets[Number(v.i)];
    if (!t || v.relevant !== false) continue;          // only act on explicit "not relevant"
    t.firmographics.atp_relevant = false;
    t.firmographics.atp_relevant_reason = String(v.reason || 'not a fit').slice(0, 60);
    // Cap the tier + score so it can't sit in Recommended; the UI sections it to Others.
    if (t.qualification) {
      t.qualification.tier = 'unknown';
      t.qualification.reasons = [`unrelated to ${seedDomain} — ${t.firmographics.atp_relevant_reason}`,
        ...(t.qualification.reasons || [])];
    }
    t.tier = 'unknown';
    t.score = -1;                                       // sentinel: irrelevant → bottom + Others
  }
  return rows;
}
