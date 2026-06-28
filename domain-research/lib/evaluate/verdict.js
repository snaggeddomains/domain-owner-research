// Verdict synthesis — the LLM NARRATIVE layer. The numbers (fair value, bands,
// recommended bid) are 100% DETERMINISTIC (score.js computeValuation: comps +
// quality + rules) and the LLM does NOT move them — it reads the full signal set
// and writes the readable verdict (headline, rationale, reasons for/against, buyer
// read) that EXPLAINS the deterministic number and flags risks. Keeping the number
// rule-based makes it auditable + reproducible: when a figure's off you tune a
// rule, not a prompt. No key → deterministic fallback narrative.

import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';

const SYSTEM = `You are the head of acquisitions at Snagged.com, a domain brokerage, evaluating whether to BUY a domain for INVESTMENT/RESALE. You are shown a DETERMINISTIC valuation model's output (fair resale value + price bands, already final) plus the full evidence set (name quality, comparable sales, the current live use, marketplace listing, AI appraisals, domain-investor-forum chatter, web search on the term, any prior emails about it, and the potential-buyer pool).

Your lens is a reseller's: you make money buying BELOW realizable resale value, and an exit only happens if a real, fundable buyer wants the name. Be decisive and honest — most domains are bad buys at most prices.

The valuation NUMBER is fixed (rule-based) — you do NOT change it. Your job is to EXPLAIN it and surface what a buyer must know. Apply this reasoning when you write:
- OLD exact-domain sales (especially >2y, and on a fast-moving TLD like .ai where the market re-rated in the last ~24 months) are STALE — a cheap historical sale of a name that's now a live brand is NOT today's clearing price. Don't treat it as the value.
- ACTIVE commercial use of a clean premium name is DEMAND evidence (the term is wanted) — it lowers acquirability/liquidity, but it does not make the name cheap; say both.
- A TIGHT SLD↔TLD fit (a science/tech/data concept on .ai — particle/cloud/quantum) is a real premium; a loose pairing (dog.ai) is worth less. Reflect it.
- A genuine TRADEMARK / brand conflict (a funded company owns the exact term) is the biggest real risk — it narrows the buyer pool to that one party. Call it out plainly in reasons_against and the buyer read.
- Investment posture: a buy only makes sense at a big margin (target ~10–20x resale ÷ price; 8x ok; 5x is borderline-no). The bands already encode this.

Return STRICT JSON only (no prose, no code fence):
{"confidence": "low"|"medium"|"high", "headline": "<one punchy line>", "rationale": "<2-4 sentences: the core read>", "reasons_for": ["<concrete pro>", "..."], "reasons_against": ["<concrete risk>", "..."], "buyer_summary": "<1-2 sentences: who realistically buys this and how contested the term is>", "name_quality_read": "<1 sentence on the SLD/TLD as a brandable asset>"}`;

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  return '$' + Math.round(v).toLocaleString();
}

function compactList(arr, fmt, n = 6) {
  return (Array.isArray(arr) ? arr : []).slice(0, n).map(fmt).filter(Boolean).join('\n') || '(none)';
}

function contextBlock({ signals, buyers, valuation, price }) {
  const s = signals;
  const q = s.quality;
  const cu = s.current_use || {};
  const parked = cu.parking && cu.parking.likely_parked;
  const nb = s.comps.namebio;
  const nbc = s.comps.namebio_comps;
  const trk = s.comps.tracker;
  const dh = s.comps.deal_history;

  return `DOMAIN: ${s.domain}   (SLD "${s.sld}" · .${s.tld})
NAME QUALITY: grade ${q.grade} (${q.score}/100) — ${q.dictionary_class}, ${q.length} chars, ${q.word_count} word(s); extension .${q.tld.tld} tier=${q.tld.tier} liquidity=${q.tld.liquidity}. ${(q.synergy && q.synergy.notes && q.synergy.notes.join(' ')) || ''}
REGISTERED: ${s.registration && s.registration.created ? `${s.registration.created} (~${s.registration.age_years}y old)` : 'unknown'}${s.registration && s.registration.registrar ? ` via ${s.registration.registrar}` : ''}

DETERMINISTIC MODEL (fair RESALE value, already discounted from asking):
  fair value: ${money(valuation.fair_value.low)} – ${money(valuation.fair_value.high)} (mid ${money(valuation.fair_value.mid)}), confidence ${valuation.confidence}
  recommended max bid (still a "decent buy"): ${money(valuation.recommended_max_bid)}
  value anchors:
${compactList(valuation.anchors, (a) => `   - ${a.source}: mid ${money(a.mid)} (w${a.weight}) — ${a.note}`, 8)}
${price ? `  ENTERED PRICE: ${money(price)} → model band: ${valuation.price_band ? valuation.price_band.label : '—'}` : '  (no purchase price entered — evaluate the name + give a fair-value read)'}

CURRENT USE: ${cu.reachable ? `${parked ? 'PARKED/for-sale page' : 'live site'} — "${(cu.title || '').slice(0, 80)}"${cu.parking && cu.parking.platforms && cu.parking.platforms.length ? ` (parking: ${cu.parking.platforms.join(', ')})` : ''}` : 'not reachable / no site'}
FOR SALE NOW: ${s.for_sale.listed ? `LISTED${s.for_sale.price ? ` at ${money(s.for_sale.price)}` : ''}${s.for_sale.platform ? ` on ${s.for_sale.platform}` : ''}` : 'not listed on tracked marketplaces'}
APPRAISALS: Appraise.net ${s.appraisals.appraise ? money(s.appraisals.appraise.mid) : '—'} · Atom ${s.appraisals.atom ? `${money(s.appraisals.atom.value)} (score ${s.appraisals.atom.score}/10${s.appraisals.atom.tm_conflicts ? `, ${s.appraisals.atom.tm_conflicts} TM conflict(s)` : ''})` : '—'}
TRADEMARK (exact term): ${s.trademark ? (s.trademark.exact_live ? `LIVE mark(s) on "${s.sld}"${s.trademark.tech_class ? ' incl. software/AI class' : ''} (${s.trademark.exact_live_count} exact) — model applied a buyer-pool discount` : `no live exact mark (${s.trademark.total} near matches)`) : 'not checked'}

COMPARABLE SALES:
  NameBio (exact domain): ${nb && nb.sales && nb.sales.length ? nb.sales.slice(0, 5).map((x) => `${money(x.price)} (${x.date || '?'}${x.venue ? `, ${x.venue}` : ''})`).join('; ') : 'no recorded public sales'}
  Snagged transactions (Master Txns List — real prices similar names sold at): ${trk && trk.deals && trk.deals.length ? `${trk.deals.length} comps — ${trk.deals.slice(0, 6).map((x) => `${x.domain} ${money(x.price)} (${x.relation === 'same_sld' ? 'same word' : 'same .' + s.tld})`).join('; ')}` : 'none found'}
  NameBio comparable sales (similar names sold): ${nbc && nbc.comps && nbc.comps.length ? `${nbc.comps.length} comps — ${nbc.comps.slice(0, 6).map((x) => `${x.domain} ${money(x.price)}`).join('; ')}` : 'none found'}
  Snagged deal history: ${dh && dh.offers && dh.offers.length ? `${dh.offers.length} real figure(s) — ${dh.offers.slice(0, 4).map((o) => `${money(o.amountNum)} (${o.kind}${o.channel ? `, ${o.channel}` : ''})`).join('; ')}${dh.sale ? ` · sale stage: ${dh.sale.label || dh.sale.stage}` : ''}` : (dh ? `we've represented it (inbound ${dh.inbound})` : 'none')}

NAMEPROS (investor forum): ${compactList(s.namepros, (r) => `   - ${r.title}`, 4)}
WEB — term "${s.sld}": ${compactList(s.web.term_search, (r) => `   - ${r.title} — ${(r.snippet || '').slice(0, 90)}`, 5)}
WEB — exact "${s.domain}": ${compactList(s.web.domain_search, (r) => `   - ${r.title}`, 3)}
PRIOR EMAILS about this domain (Snagged inbox): ${s.email_sweep && s.email_sweep.length ? s.email_sweep.slice(0, 5).map((t) => `"${(t.subject || '').slice(0, 60)}"`).join('; ') : 'none'}

TERM ACROSS OTHER EXTENSIONS (resale scarcity signal): ${(buyers.tld_landscape || []).length
    ? (buyers.tld_landscape || []).map((t) => `.${t.tld}=${t.status}`).join(' · ')
    : 'not checked'}
  Read: a same-word .com that's an ACTIVE company means the word is locked up elsewhere → our extension is more valuable (scarcity). The same word FOR SALE cheaply across many extensions means it's a commodity → caps value. (active=${(buyers.scarcity || {}).active || 0}, for_sale=${(buyers.scarcity || {}).for_sale || 0}, unused=${(buyers.scarcity || {}).unused || 0})

POTENTIAL BUYERS / COMPETITION:
  Buyer angles: ${compactList(buyers.angles, (a) => `   - ${a.label} [${a.buyer_potential}]${a.verified ? ` — ✓ ${a.verified.name}: ${a.verified.tier}` : ''}`, 6)}
  Already using the term (live): ${(buyers.active_users || []).slice(0, 8).map((u) => u.domain).join(', ') || 'none found'}
  Fundable verified buyers: ${buyers.fundable_buyer_count || 0}`;
}

function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Deterministic narrative when the LLM is unavailable — readable, not templated-ugly.
function deterministicNarrative(valuation, price) {
  const band = valuation.price_band;
  const conf = valuation.confidence;
  return {
    confidence: conf,
    headline: price
      ? `${band ? band.label : 'Evaluate'} — fair resale value ~${money(valuation.fair_value.mid)}`
      : `Fair resale value ~${money(valuation.fair_value.mid)} (recommended max bid ${money(valuation.recommended_max_bid)})`,
    rationale: `Based on the comps and name quality, realistic resale value is ${money(valuation.fair_value.low)}–${money(valuation.fair_value.high)} (${conf} confidence). For an investment buy you'd want to land at or under ${money(valuation.recommended_max_bid)} to leave resale margin.`,
    reasons_for: [],
    reasons_against: [],
    buyer_summary: '',
    name_quality_read: '',
    fallback: true,
  };
}

export async function synthesizeVerdict({ signals, buyers, valuation, price = null, env = process.env }) {
  let llm = null;
  if (env.ANTHROPIC_API_KEY) {
    try {
      // Bounded so a slow LLM falls back to the deterministic narrative well
      // within the function's 60s budget (rather than hanging it to a 504).
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 16000, maxRetries: 1 });
      const model = env.EVALUATE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
      const resp = await client.messages.create({
        model,
        max_tokens: 1400,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: contextBlock({ signals, buyers, valuation, price }) + '\n\nEvaluate now. Strict JSON only.' }],
      });
      recordModelUsage('anthropic', model, resp.usage);
      const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const parsed = parseJsonLoose(text);
      if (parsed) llm = { ...parsed, model };
    } catch (e) {
      llm = null;
    }
  }

  const base = llm || deterministicNarrative(valuation, price);
  // The number is deterministic — the LLM writes prose only, it never moves it.
  const finalBand = price ? valuation.price_band : null;

  return {
    model: base.model || null,
    fallback: Boolean(base.fallback),
    adjust: 1,
    adjust_reason: '',
    confidence: ['low', 'medium', 'high'].includes(base.confidence) ? base.confidence : valuation.confidence,
    headline: String(base.headline || '').trim(),
    rationale: String(base.rationale || '').trim(),
    reasons_for: Array.isArray(base.reasons_for) ? base.reasons_for.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
    reasons_against: Array.isArray(base.reasons_against) ? base.reasons_against.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
    buyer_summary: String(base.buyer_summary || '').trim(),
    name_quality_read: String(base.name_quality_read || '').trim(),
    verdict_band: finalBand ? { key: finalBand.key, label: finalBand.label, color: finalBand.color } : null,
    // No LLM adjustment — the deterministic valuation is final.
    adjusted_valuation: null,
    final_fair_mid: valuation.fair_value.mid,
  };
}

export default { synthesizeVerdict };
