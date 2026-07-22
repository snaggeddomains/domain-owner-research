// Draft a first-touch outreach email — thoroughly. The drafter reads the FULL
// report context (structured conclusion + indicators + the agent's whole
// narrative + contacts/timeline), is handed the entire template catalog (so it
// understands what each template is for) plus a deterministic indicator-based
// ranking as a prior, and then decides the best approach: adapt a template,
// propose a new named template, or write a fully bespoke personalized email when
// nothing fits. It writes short, specific, and in Rob's voice, weaving in only
// verifiable hooks. Falls back to a placeholder-filled template if the LLM is
// unavailable.

import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';
import { STYLE_GUIDE } from './templates.js';

const SYSTEM = `You are Rob Schutz of Snagged.com, a domain brokerage, writing the FIRST-TOUCH email to the likely owner of a domain a client wants to acquire. Opening email only.

Your job is to be THOROUGH about context but CONCISE on the page. Read everything provided, understand the ownership situation, and write a short, sharp, genuinely personalized opener — not a mail-merge.

${STYLE_GUIDE}

PROCESS (think it through, then write):
1. Interpret the situation in one line: who likely owns this, their relationship to the domain (current operator? former operator who may still hold it? investor? acquired/redirected corporate asset? privacy-shielded unknown?), and the most compelling, VERIFIABLE hook for reaching out now.
2. Choose the APPROACH:
   - "template": one catalog template clearly fits → adapt it (keep its structure and Rob's voice), personalized with the real hooks.
   - "new_template": no catalog template fits, but this is a recognizable, repeatable pattern worth saving → write the email and name the pattern (3-6 word Title Case suggested_title).
   - "bespoke": no template fits and it's a one-off → write a fully personalized email from scratch, still on Rob's spine and voice.
   If the user FORCED a template (noted in the input), use it (approach "template", that template_id).
3. Pick the 1-3 strongest hooks actually supported by the report and weave them in naturally. One earned, specific sentence ("I believe the domain traces back to your time with Amicus") beats three generic ones.

HARD RULES:
- Use ONLY facts present in the provided context. NEVER invent a name, company, acquisition, platform, price, or relationship. If you need a value you don't have, leave a clearly bracketed placeholder like [COMPANY] for Rob to fill — do not guess.
- The "For-sale status" line is the AUTHORITATIVE, real-time marketplace check. If it says NOT listed, do NOT claim or imply the domain is listed/for sale on any marketplace, and do NOT name marketplaces — even if the narrative loosely says "listed for sale". Trust the verified status over the narrative.
- Address the email ONLY to the name(s) on the "Address as" line — those are the people we actually have a way to reach. Do NOT add other stakeholders, co-founders, or names from the narrative to the greeting, even if the report mentions them. If "Address as" has one name, greet only that person.
- SHORT: roughly 4-9 sentences. Cut anything that isn't earning its place. No corporate filler.
- Match Rob's warmth and directness. No pricing or commitments beyond the templates' spirit.
- Subject line EXACTLY: <DOMAIN> Domain Inquiry. Sign off "-Rob".

Return STRICT JSON only (no prose, no code fence):
{"situation":"one-line read of the ownership situation","approach":"template"|"new_template"|"bespoke","template_id":"<catalog id or null>","fit":"good"|"weak","suggested_title":"<name if new_template/bespoke, else ''>","hooks":["the specific facts you used"],"subject":"...","body":"..."}`;

function compactContacts(contacts) {
  return (Array.isArray(contacts) ? contacts : [])
    .slice(0, 12)
    .map((c) => `- [${c.type || '?'}${c.tier ? `/${c.tier}` : ''}] ${String(c.value || '').trim()}${c.note ? ` (${c.note})` : ''}`)
    .join('\n');
}
function compactTimeline(tl) {
  return (Array.isArray(tl) ? tl : [])
    .slice(0, 12)
    .map((t) => `- ${t.date || ''}: ${t.event || ''}${t.detail ? ` — ${t.detail}` : ''}`)
    .join('\n');
}

function indicatorList(sig) {
  const on = [];
  if (sig.listed) on.push(`listed-for-sale${sig.platform ? ` on ${sig.platform}` : ''}`);
  else if (sig.verifiedNotListed) on.push('verified-NOT-listed-for-sale');
  if (sig.redirectsToParent) on.push(`redirects-to-parent${sig.parentHost ? ` (${sig.parentHost})` : ''}`);
  if (sig.acquisition) on.push('acquisition/inheritance');
  if (sig.formerOperator) on.push('former-operator');
  if (sig.mayStillOwn) on.push('may-still-own');
  if (sig.priorCompanyTie) on.push('prior-company-tie');
  if (sig.multiStakeholder) on.push('multiple-stakeholders');
  if (sig.siteActive) on.push('active-site/email');
  if (sig.largeCompanyHint) on.push('larger-company');
  if (sig.parked) on.push('parked/inactive');
  if (sig.privacy) on.push('privacy-protected');
  return on.join('; ') || '(none distinctive)';
}

function contextBlock(sig) {
  return `Domain: ${sig.domain}
Identity confidence: ${sig.confidenceBand || 'unknown'}
Likely owner: ${sig.likelyOwner || '(not established)'}
Owner type: ${sig.ownerType || 'unknown'}
Address as: ${sig.namedContactNames && sig.namedContactNames.length ? sig.namedContactNames.join(', ') : sig.firstName || '(no clear name — "Hi there")'}
Key indicators: ${indicatorList(sig)}
For-sale status: ${sig.listed ? `LISTED for sale${sig.platform ? ` on ${sig.platform}` : ''}` : sig.verifiedNotListed ? 'VERIFIED NOT listed for sale (do not claim otherwise)' : 'unknown'}
Bottom line: ${sig.summary || '(none)'}

Contacts:
${compactContacts(sig.contacts) || '(none)'}

Timeline:
${compactTimeline(sig.timeline) || '(none)'}

Recommended contact path:
${(Array.isArray(sig.contactPath) ? sig.contactPath : []).slice(0, 6).map((p) => `- ${p}`).join('\n') || '(none)'}

FULL RESEARCH NARRATIVE (the agent's own synthesis — your richest context):
${sig.narrative || '(none)'}`;
}

// Real past openers (mined from Rob's sent mail) — reference for VOICE + structure,
// NOT facts to copy. The drafter learns phrasing/tone from these, then writes fresh.
function examplesBlock(examples) {
  if (!Array.isArray(examples) || !examples.length) return '';
  return examples
    .slice(0, 3)
    .map((ex, i) => `EXAMPLE ${i + 1}${ex.situation ? ` (${ex.situation})` : ''}${(ex.tags && ex.tags.length) ? ` [${ex.tags.join(', ')}]` : ''}:\n${String(ex.body || '').trim().slice(0, 1200)}`)
    .join('\n\n— — —\n\n');
}

function catalogBlock(catalog) {
  return catalog
    .map(
      (t) =>
        `[${t.id}] ${t.name}${t.builtin ? '' : ' (saved custom)'}\nUSE WHEN: ${t.useWhen || '—'}${t.adjustment ? `\nADJUST: ${t.adjustment}` : ''}\nTEMPLATE:\n${t.text}`,
    )
    .join('\n\n— — —\n\n');
}

function rankingBlock(ranked) {
  return ranked
    .filter((r) => r.score > 0)
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r.id} (score ${r.score}): ${r.reasons.join('; ')}`)
    .join('\n') || '(no strong signal — consider bespoke)';
}

export function fillTemplate(tpl, sig) {
  return String(tpl || '')
    .replace(/\[DOMAIN\]/g, sig.domain || '[DOMAIN]')
    .replace(/\[First Name\]/g, sig.firstName || '[First Name]')
    .replace(/\[Names\]/g, (sig.namedContactNames && sig.namedContactNames.join(' and ')) || sig.primaryContactName || '[Names]')
    .replace(/\[PLATFORM\]/g, sig.platform || '[PLATFORM]')
    .replace(/\[PARENT SITE\]/g, sig.parentHost || '[PARENT SITE]');
}

// Reverse of fillTemplate: turn a concrete draft back into a reusable template by
// swapping the report's actual values for [PLACEHOLDERS]. Used when saving.
export function placeholderize(text, sig) {
  let out = String(text || '');
  const sub = (val, token) => {
    const v = String(val || '').trim();
    if (v.length < 2) return;
    const re = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, token);
  };
  for (const n of sig.namedContactNames || []) sub(n, '[Names]');
  sub(sig.primaryContactName, '[Names]');
  if (sig.parentHost) sub(sig.parentHost, '[PARENT SITE]');
  if (sig.platform) sub(sig.platform, '[PLATFORM]');
  sub(sig.domain, '[DOMAIN]');
  if (sig.firstName) sub(sig.firstName, '[First Name]');
  return out;
}

function parseJsonLoose(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Deterministic fallback when the LLM is unavailable/misbehaves: fill the top
// candidate's template.
export function fallbackDraft(catalog, ranked, sig) {
  const topId = (ranked.find((r) => r.score > 0) || ranked[0] || {}).id;
  const t = catalog.find((c) => c.id === topId) || catalog[0];
  return {
    situation: sig.summary || '',
    approach: 'template',
    template_id: t ? t.id : null,
    template_name: t ? t.name : '',
    fit: 'good',
    suggested_title: '',
    hooks: [],
    subject: `${sig.domain} Domain Inquiry`,
    body: fillTemplate(t ? t.text : '', sig),
  };
}

// catalog:  [{ id, name, useWhen, adjustment, text, builtin }]
// ranked:   [{ id, name, score, reasons }] (built-in prior)
// forced:   { mode:'auto'|'template'|'bespoke', templateId? }
// examples: [{ body, situation, tags }] mined real openers (voice reference)
// retry:    true → take another deep look; vary the angle; don't repeat previousBody
export async function generateOutreach({ signals, catalog, ranked, forced = { mode: 'auto' }, examples = [], retry = false, previousBody = '', env = process.env }) {
  if (!env.ANTHROPIC_API_KEY) return { ...fallbackDraft(catalog, ranked, signals), fallback: true };

  let forcedNote = '';
  if (forced.mode === 'bespoke') {
    forcedNote = '\n\nUSER OVERRIDE: write a BESPOKE personalized email (approach "bespoke", template_id null). Do not anchor on a catalog template.';
  } else if (forced.mode === 'template' && forced.templateId) {
    forcedNote = `\n\nUSER OVERRIDE: use template "${forced.templateId}" (approach "template", template_id "${forced.templateId}"). Adapt it to the context.`;
  }

  const exBlock = examplesBlock(examples);
  const retryNote = retry
    ? `\n\nTRY AGAIN: this is a regeneration. Take another deep look at ALL the inputs (indicators, contacts, timeline, full narrative, and the real examples) and produce a MATERIALLY DIFFERENT draft — a different angle, hook, or structure. Do NOT lightly reword the previous attempt${previousBody ? `:\n--- previous attempt (do not repeat) ---\n${String(previousBody).slice(0, 1200)}\n---` : '.'}`
    : '';

  const userPrompt = `REPORT CONTEXT
${contextBlock(signals)}

DETERMINISTIC RANKING (indicator-based prior; strongest first):
${rankingBlock(ranked)}
${exBlock ? `\nREAL PAST OUTREACH (Rob's own sent openers — learn the VOICE, tone, and structure; do NOT copy their specific facts):\n${exBlock}\n` : ''}
TEMPLATE CATALOG (understand each before choosing):
${catalogBlock(catalog)}${forcedNote}${retryNote}

Interpret the situation, choose the approach, and write the opener now. Be thorough about context, concise on the page, and personalize with verifiable hooks only.`;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 1500,
      temperature: retry ? 1 : 0.7,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = parseJsonLoose(text);
    if (parsed && parsed.subject && parsed.body) {
      const tid = parsed.template_id && catalog.some((c) => c.id === parsed.template_id) ? parsed.template_id : null;
      const tname = tid ? (catalog.find((c) => c.id === tid) || {}).name : '';
      return {
        situation: String(parsed.situation || '').trim(),
        approach: ['template', 'new_template', 'bespoke'].includes(parsed.approach) ? parsed.approach : (tid ? 'template' : 'bespoke'),
        template_id: tid,
        template_name: tname || '',
        fit: parsed.fit === 'weak' ? 'weak' : 'good',
        suggested_title: String(parsed.suggested_title || '').trim(),
        hooks: Array.isArray(parsed.hooks) ? parsed.hooks.map((h) => String(h).trim()).filter(Boolean).slice(0, 5) : [],
        subject: String(parsed.subject).trim(),
        body: String(parsed.body).trim(),
        model,
      };
    }
    return { ...fallbackDraft(catalog, ranked, signals), fallback: true, model };
  } catch (err) {
    return { ...fallbackDraft(catalog, ranked, signals), fallback: true, error: String((err && err.message) || err) };
  }
}
