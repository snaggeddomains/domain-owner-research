// Draft a first-touch outreach email. The user picked "LLM free-write, templates
// as style guide": we let the model compose in Rob's voice, but anchor it hard on
// the matched scenario's real templates + the recurring spine, and constrain it
// to the report's facts (no invented names/companies/platforms/prices — missing
// values stay as a visible [BRACKET] for Rob to fill). Falls back to a plain
// placeholder-filled template if the model call fails.

import Anthropic from '@anthropic-ai/sdk';
import { SCENARIO_BY_ID, STYLE_GUIDE } from './templates.js';

const SYSTEM = `You are drafting a FIRST-TOUCH cold outreach email AS Rob Schutz of Snagged.com, a domain brokerage, to the current owner of a domain his client wants to acquire. This is the opening email only.

${STYLE_GUIDE}

HARD RULES:
- Write in Rob's voice. Use the provided scenario template(s) as the style anchor — match their tone, length, and structure closely. This is a light personalization of a proven template, NOT a fresh essay.
- Only use facts present in RESEARCH FACTS / report excerpt. NEVER invent a person's name, company, acquisition story, marketplace platform, or price.
- If a template needs a value you don't have (e.g. the company a breadcrumb refers to, a parent site, a first name), either omit that clause or leave a clearly bracketed placeholder like [COMPANY] or [First Name] for Rob to fill in. Do not guess.
- Keep it short — match the example length. No subject-line preamble in the body.
- Do not state or imply a price, and don't promise anything beyond what the templates say.
- The subject line must be exactly: <DOMAIN> Domain Inquiry

Return STRICT JSON only, no prose, no code fence:
{"subject": "...", "body": "..."}`;

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

function fillTemplate(tpl, sig) {
  return String(tpl || '')
    .replace(/\[DOMAIN\]/g, sig.domain || '[DOMAIN]')
    .replace(/\[First Name\]/g, sig.firstName || '[First Name]')
    .replace(/\[Names\]/g, sig.primaryContactName || '[Names]')
    .replace(/\[PLATFORM\]/g, sig.platform || '[PLATFORM]')
    .replace(/\[PARENT SITE\]/g, sig.parentHost || '[PARENT SITE]');
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
export function fallbackDraft(scenario, sig) {
  return {
    subject: `${sig.domain} Domain Inquiry`,
    body: fillTemplate(scenario.cleaned || scenario.closest, sig),
  };
}

export async function generateOutreach({ scenarioId, signals, env = process.env }) {
  const scenario = SCENARIO_BY_ID[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  if (!env.ANTHROPIC_API_KEY) return { ...fallbackDraft(scenario, signals), fallback: true };

  const variants = [
    `CLOSEST-TO-REAL (stay very close to this):\n${scenario.closest}`,
    scenario.cleaned ? `LIGHTLY CLEANED reusable variant:\n${scenario.cleaned}` : '',
    scenario.ultraLight ? `ULTRA-LIGHT one-liner variant (fine when confidence is thin):\n${scenario.ultraLight}` : '',
  ].filter(Boolean).join('\n\n');

  const userPrompt = `SCENARIO: ${scenario.name}
Best fit: ${scenario.bestFit}
How Rob adjusts here: ${scenario.adjustment}

TEMPLATE(S) TO ANCHOR ON:
${variants}

RESEARCH FACTS:
${factsBlock(signals)}

REPORT EXCERPT (for breadcrumbs — only use what's here, don't infer beyond it):
${signals.narrativeExcerpt || '(none)'}

Draft the opening email now. Personalize lightly from the facts; leave bracketed placeholders for anything you don't actually know.`;

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
      return { subject: String(parsed.subject).trim(), body: String(parsed.body).trim(), model };
    }
    return { ...fallbackDraft(scenario, signals), fallback: true, model };
  } catch (err) {
    return { ...fallbackDraft(scenario, signals), fallback: true, error: String(err && err.message || err) };
  }
}
