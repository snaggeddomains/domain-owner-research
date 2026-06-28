// Verdict synthesis — the "deterministic score + LLM" layer. The numbers come
// from the deterministic model (score.js computeValuation); the LLM reads the FULL
// signal set and (a) writes the narrative verdict, (b) is allowed ONE bounded
// nudge to fair value for things the formula can't see — a trademark conflict, a
// red-hot exact-match buyer, a dead/contested term, a name that's clearly more or
// less brandable than its structure implies. The nudge is clamped, then the price
// bands recompute from the adjusted mid, so the output stays auditable. No key →
// pure deterministic fallback.

import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';
import { BANDS, niceRound, bandForPrice } from './score.js';

const ADJUST_MIN = 0.6;
const ADJUST_MAX = 1.6;

const SYSTEM = `You are the head of acquisitions at Snagged.com, a domain brokerage, evaluating whether to BUY a domain for INVESTMENT/RESALE. You are shown a deterministic valuation model's output plus the full evidence set (name quality, comparable sales, the current live use, marketplace listing, AI appraisals, domain-investor-forum chatter, web search on the term, any prior emails about it, and the potential-buyer pool).

Your lens is a reseller's: you make money buying BELOW realizable resale value, and an exit only happens if a real, fundable buyer wants the name. Be decisive and honest — most domains are bad buys at most prices.

You may apply ONE bounded adjustment ("adjust", a multiplier in [${ADJUST_MIN}, ${ADJUST_MAX}]) to the model's fair RESALE value for things the formula can't see:
- Push DOWN (<1) for: trademark/brand conflict, an unsayable/awkward name, a dead or hyper-contested term, no plausible fundable buyer, a name whose comps are all junk.
- Push UP (>1) for: a hot exact-match product/company actively wanting it, a clean one-word in a moneyed vertical, strong corroborating real sales, demonstrated inbound demand (emails/offers).
- Keep it 1.0 when the model already fits. Do NOT use the adjustment to chase a single optimistic appraisal.

Return STRICT JSON only (no prose, no code fence):
{"adjust": <number ${ADJUST_MIN}-${ADJUST_MAX}>, "adjust_reason": "<one line, or '' if 1.0>", "confidence": "low"|"medium"|"high", "headline": "<one punchy line>", "rationale": "<2-4 sentences: the core read>", "reasons_for": ["<concrete pro>", "..."], "reasons_against": ["<concrete risk>", "..."], "buyer_summary": "<1-2 sentences: who realistically buys this and how contested the term is>", "name_quality_read": "<1 sentence on the SLD/TLD as a brandable asset>"}`;

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
  const intc = s.comps.internal;
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

COMPARABLE SALES:
  NameBio (exact domain): ${nb && nb.sales && nb.sales.length ? nb.sales.slice(0, 5).map((x) => `${money(x.price)} (${x.date || '?'}${x.venue ? `, ${x.venue}` : ''})`).join('; ') : 'no recorded public sales'}
  Snagged transactions (Master Txns List — real prices similar names sold at): ${trk && trk.deals && trk.deals.length ? `${trk.deals.length} comps — ${trk.deals.slice(0, 6).map((x) => `${x.domain} ${money(x.price)} (${x.relation === 'same_sld' ? 'same word' : 'same .' + s.tld})`).join('; ')}` : 'none found'}
  NameBio comparable sales (similar names sold): ${nbc && nbc.comps && nbc.comps.length ? `${nbc.comps.length} comps — ${nbc.comps.slice(0, 6).map((x) => `${x.domain} ${money(x.price)}`).join('; ')}` : 'none found'}
  Internal similar-asking comps: ${intc && intc.count ? `${intc.count} names, median ask ${money(intc.p50)} (e.g. ${(intc.examples || []).map((e) => `${e.domain} ${money(e.price)}`).join(', ')})` : 'none found'}
  Snagged deal history: ${dh && dh.offers && dh.offers.length ? `${dh.offers.length} real figure(s) — ${dh.offers.slice(0, 4).map((o) => `${money(o.amountNum)} (${o.kind}${o.channel ? `, ${o.channel}` : ''})`).join('; ')}${dh.sale ? ` · sale stage: ${dh.sale.label || dh.sale.stage}` : ''}` : (dh ? `we've represented it (inbound ${dh.inbound})` : 'none')}

NAMEPROS (investor forum): ${compactList(s.namepros, (r) => `   - ${r.title}`, 4)}
WEB — term "${s.sld}": ${compactList(s.web.term_search, (r) => `   - ${r.title} — ${(r.snippet || '').slice(0, 90)}`, 5)}
WEB — exact "${s.domain}": ${compactList(s.web.domain_search, (r) => `   - ${r.title}`, 3)}
PRIOR EMAILS about this domain (Snagged inbox): ${s.email_sweep && s.email_sweep.length ? s.email_sweep.slice(0, 5).map((t) => `"${(t.subject || '').slice(0, 60)}"`).join('; ') : 'none'}

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

// Rebuild the price-band ladder + recommended bid from a (possibly adjusted) mid.
function ladderFromMid(fairMid) {
  let prev = 0;
  const bands = BANDS.map((b) => {
    const max = b.max === Infinity ? Infinity : niceRound(fairMid * b.max);
    const row = { key: b.key, label: b.label, color: b.color, min: prev, max };
    prev = max === Infinity ? prev : max;
    return row;
  });
  return { bands, recommended_max_bid: niceRound(fairMid * BANDS[1].max) };
}

// Deterministic narrative when the LLM is unavailable — readable, not templated-ugly.
function deterministicNarrative(valuation, price) {
  const band = valuation.price_band;
  const conf = valuation.confidence;
  return {
    adjust: 1,
    adjust_reason: '',
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
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 25000, maxRetries: 1 });
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
  // Clamp the LLM's adjustment and recompute the numbers from the adjusted mid.
  let adjust = Number(base.adjust);
  if (!Number.isFinite(adjust)) adjust = 1;
  adjust = Math.max(ADJUST_MIN, Math.min(ADJUST_MAX, adjust));
  const adjMid = niceRound(valuation.fair_value.mid * adjust);
  const adjusted = adjust !== 1 && adjMid > 0
    ? {
        fair_value: { low: niceRound(valuation.fair_value.low * adjust), mid: adjMid, high: niceRound(valuation.fair_value.high * adjust) },
        ...ladderFromMid(adjMid),
        price_band: price ? bandForPrice(price, adjMid) : null,
      }
    : null;

  const finalMid = adjusted ? adjusted.fair_value.mid : valuation.fair_value.mid;
  const finalBand = price ? (adjusted ? adjusted.price_band : valuation.price_band) : null;

  return {
    model: base.model || null,
    fallback: Boolean(base.fallback),
    adjust,
    adjust_reason: String(base.adjust_reason || '').trim(),
    confidence: ['low', 'medium', 'high'].includes(base.confidence) ? base.confidence : valuation.confidence,
    headline: String(base.headline || '').trim(),
    rationale: String(base.rationale || '').trim(),
    reasons_for: Array.isArray(base.reasons_for) ? base.reasons_for.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
    reasons_against: Array.isArray(base.reasons_against) ? base.reasons_against.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
    buyer_summary: String(base.buyer_summary || '').trim(),
    name_quality_read: String(base.name_quality_read || '').trim(),
    // The verdict band for an entered price (post-adjustment), else null.
    verdict_band: finalBand ? { key: finalBand.key, label: finalBand.label, color: finalBand.color } : null,
    // Surface the adjusted valuation so the API/UI use the final numbers.
    adjusted_valuation: adjusted ? { fair_value: adjusted.fair_value, bands: adjusted.bands, recommended_max_bid: adjusted.recommended_max_bid, price_band: adjusted.price_band } : null,
    final_fair_mid: finalMid,
  };
}

export default { synthesizeVerdict };
