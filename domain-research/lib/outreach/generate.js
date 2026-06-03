// Draft a first-touch outreach email. The user picked "LLM free-write, templates
// as style guide": we let the model compose in Rob's voice, anchored hard on the
// chosen template (built-in scenario OR a saved custom one) + the recurring spine,
// constrained to the report's facts (no invented names/companies/platforms/prices
// — missing values stay as a visible [BRACKET]). The same call also judges whether
// the template actually FITS this report and proposes a short title for the
// situation, so the UI can offer "save this as a new template" when nothing fits.
// Falls back to a plain placeholder-filled template if the model is unavailable.

import Anthropic from '@anthropic-ai/sdk';
import { STYLE_GUIDE } from './templates.js';

const SYSTEM = `You are drafting a FIRST-TOUCH cold outreach email AS Rob Schutz of Snagged.com, a domain brokerage, to the current owner of a domain his client wants to acquire. This is the opening email only.

${STYLE_GUIDE}

HARD RULES:
- Write in Rob's voice. Use the provided template(s) as the style anchor — match their tone, length, and structure closely. This is a light personalization of a proven template, NOT a fresh essay.
- Only use facts present in RESEARCH FACTS / report excerpt. NEVER invent a person's name, company, acquisition story, marketplace platform, or price.
- If the template needs a value you don't have, either omit that clause or leave a clearly bracketed placeholder like [COMPANY] or [First Name] for Rob to fill. Do not guess.
- Keep it short — match the example length. No subject-line preamble in the body.
- Do not state or imply a price, and don't promise anything beyond what the templates say.
- The subject line must be exactly: <DOMAIN> Domain Inquiry

Also assess FIT: does the anchor template genuinely suit this owner situation?
- "good" = the template's best-fit clearly matches the report.
- "weak" = it's the closest available but the situation is meaningfully different (e.g. a mix of signals, or a case none of the scenarios cover well).
And propose "suggested_title": a short (3-6 word) Title Case label naming THIS owner situation, suitable as the name of a reusable template (e.g. "Estate / Deceased Owner", "Foreign-Language Registrant", "Charity / Nonprofit Owner").

Return STRICT JSON only, no prose, no code fence:
{"subject": "...", "body": "...", "fit": "good" | "weak", "suggested_title": "..."}`;

function factsBlock(sig) {
  const f = [];
  f.push(`Domain: ${sig.domain}`);
  if (sig.firstName) f.push(`Owner first name: ${sig.firstName}`);
  if (sig.primaryContactName) f.push(`Likely owner / contact: ${sig.primaryContactName}`);
  if (sig.ownerType) f.push(`Owner type: ${sig.ownerType}`);
  if (sig.confidence) f.push(`Ownership confidence: ${sig.confidence}`);
  if (sig.listed) f.push(`Listed for sale: yes${sig.platform ? ` (on ${sig.platform})` : ''}`);
  if (sig.redirectsToParent) f.push(`Redirects to parent site: ${sig.parentHost || 'yes'}`);
  if (sig.siteActive) f.push('Site/email appear actively in use: yes');
  if (sig.parked) f.push('Domain is parked / inactive: yes');
  if (sig.acquisition) f.push('Acquisition / inheritance suggested in the research: yes');
  if (sig.privacy) f.push('WHOIS is privacy/proxy-protected: yes');
  if (sig.summary) f.push(`Research bottom line: ${sig.summary}`);
  return f.join('\n');
}

export function fillTemplate(tpl, sig) {
  return String(tpl || '')
    .replace(/\[DOMAIN\]/g, sig.domain || '[DOMAIN]')
    .replace(/\[First Name\]/g, sig.firstName || '[First Name]')
    .replace(/\[Names\]/g, sig.primaryContactName || '[Names]')
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
  // Longest / most-specific first so a name inside an org isn't half-replaced.
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

// Deterministic fallback when the LLM is unavailable/misbehaves.
export function fallbackDraft(template, sig) {
  const anchor = (template.anchors && template.anchors[0]) || '';
  return {
    subject: `${sig.domain} Domain Inquiry`,
    body: fillTemplate(anchor, sig),
    fit: 'good',
    suggested_title: template.name || '',
  };
}

// template = { id, name, bestFit, adjustment, anchors: [string,...], subject }
export async function generateOutreach({ template, signals, env = process.env }) {
  if (!template || !Array.isArray(template.anchors) || !template.anchors.length) {
    throw new Error('generateOutreach: template with anchors required');
  }
  if (!env.ANTHROPIC_API_KEY) return { ...fallbackDraft(template, signals), fallback: true };

  const variants = template.anchors
    .map((a, i) => `${i === 0 ? 'PRIMARY anchor (stay close to this)' : 'Alternative variant'}:\n${a}`)
    .join('\n\n');

  const userPrompt = `TEMPLATE: ${template.name}
${template.bestFit ? `Best fit: ${template.bestFit}` : ''}
${template.adjustment ? `How Rob adjusts here: ${template.adjustment}` : ''}

TEMPLATE TEXT TO ANCHOR ON:
${variants}

RESEARCH FACTS:
${factsBlock(signals)}

REPORT EXCERPT (for breadcrumbs — only use what's here, don't infer beyond it):
${signals.narrativeExcerpt || '(none)'}

Draft the opening email now, then assess fit and suggest a title.`;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 1200,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = parseJsonLoose(text);
    if (parsed && parsed.subject && parsed.body) {
      return {
        subject: String(parsed.subject).trim(),
        body: String(parsed.body).trim(),
        fit: parsed.fit === 'weak' ? 'weak' : 'good',
        suggested_title: String(parsed.suggested_title || template.name || '').trim(),
        model,
      };
    }
    return { ...fallbackDraft(template, signals), fallback: true, model };
  } catch (err) {
    return { ...fallbackDraft(template, signals), fallback: true, error: String((err && err.message) || err) };
  }
}
