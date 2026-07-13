// Inbound-lead enrichment — a high-level, at-a-glance read on WHO this inbound is:
// how prominent / well-connected the person is, their work history, and the company
// behind them. Reuses the existing stack (person deep-dive + Apollo firmographics)
// and adds a fresh Google pass (separate from the person lookup) to fill in career
// background + a plain-English "how important are they" overview. No scoring, no
// routing — just the facts. Everything best-effort + fail-open.
import Anthropic from '@anthropic-ai/sdk';
import { runPersonDeepDive } from '../person/orchestrate.js';
import { firmographicsApollo } from '../sales/enrich/firmographics.js';
import { runTool } from '../sources/index.js';
import { recordModelUsage } from '../db/usage.js';
import { emailDomain, isFreeEmail } from './triage.js';

function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* try to salvage */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* give up */ } }
  return null;
}

const BG_SYSTEM = `You profile ONE person for a domain-sales team that wants a fast, honest read on how important / well-connected an inbound lead is. From the provided Google results (and any prior dossier), produce a STRICT JSON object:
{
 "overview": "2-4 sentences: who they are, their seniority/role, and how prominent or well-connected they appear. Be honest — if the public footprint is thin, say so plainly (e.g. 'a mid-level professional with limited public presence'). Do NOT inflate.",
 "standing": "ONE short phrase capturing their standing, e.g. 'Well-connected industry executive', 'Senior operator at a major brand', 'Mid-level professional', 'Low public profile / hard to place'",
 "work_history": [ {"role": "title", "org": "company", "period": "years if known or null"} ],  // most recent first, ONLY roles supported by the results
 "highlights": [ "notable, verifiable facts — board seats, exits, funding raised, senior roles at known companies, press, awards" ]
}
Rules: use ONLY the provided information; never invent employers, dates, or facts. Omit anything unknown (empty array is fine). No filler.`;

async function webSearch(query, env) {
  const r = await runTool('web_search', { query }, env).catch(() => null);
  return r && r.ok ? r.data : null;
}

// Fresh Google pass on the person (separate from the person deep-dive) → career
// background + a plain "how important are they" overview.
async function personBackground({ name, employer, company, priorNarrative, env }) {
  if (!name) return null;
  const co = employer || company || '';
  const [general, career] = await Promise.all([
    webSearch(`${name}${co ? ' ' + co : ''}`, env),
    webSearch(`"${name}"${co ? ' ' + co : ''} career OR experience OR background OR biography`, env),
  ]);
  const org = (d) => (Array.isArray(d && d.organic) ? d.organic : []);
  const seen = new Set();
  const results = [...org(general), ...org(career)]
    .map((x) => ({ title: x.title, link: x.link, snippet: x.snippet }))
    .filter((x) => x.title && x.link && !seen.has(x.link) && seen.add(x.link))
    .slice(0, 10);
  const kg = (general && general.knowledge_graph) || (career && career.knowledge_graph) || null;
  const base = { search_results: results, knowledge_graph: kg || null };
  if ((!results.length && !kg) || !env.ANTHROPIC_API_KEY) return base;

  const ctx = [];
  ctx.push(`PERSON: ${name}${co ? ` — appears to work at ${co}` : ''}`);
  if (priorNarrative) {
    if (priorNarrative.summary) ctx.push(`PRIOR DOSSIER SUMMARY: ${priorNarrative.summary}`);
    if (priorNarrative.prominence) ctx.push(`PRIOR PROMINENCE READ: ${priorNarrative.prominence}`);
    if (Array.isArray(priorNarrative.notable) && priorNarrative.notable.length) ctx.push(`PRIOR NOTABLE: ${priorNarrative.notable.join(' · ')}`);
  }
  if (kg) ctx.push(`KNOWLEDGE PANEL: ${JSON.stringify(kg).slice(0, 600)}`);
  ctx.push('GOOGLE RESULTS:');
  for (const r of results) ctx.push(`- ${r.title} — ${r.snippet || ''} (${r.link})`);

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 18000, maxRetries: 1 });
    const model = env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
    const resp = await client.messages.create({
      model,
      max_tokens: 900,
      system: [{ type: 'text', text: BG_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${ctx.join('\n')}\n\nWrite the JSON now.` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = parseJsonLoose(text);
    return parsed ? { ...base, ...parsed } : base;
  } catch { return base; }
}

export async function runLeadEnrich({ form = {}, env = process.env } = {}) {
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || form.name || null;
  const emailDom = emailDomain(form.email);
  const freeMail = isFreeEmail(form.email);
  const companyDomain = freeMail ? null : emailDom;

  // Person deep-dive + company firmographics in parallel — independent lookups.
  const [personRes, companyRes] = await Promise.allSettled([
    (form.linkedin_url || name)
      ? runPersonDeepDive({ url: form.linkedin_url || null, name, company: companyDomain, env })
      : Promise.resolve(null),
    companyDomain ? firmographicsApollo(companyDomain, env).catch(() => null) : Promise.resolve(null),
  ]);
  const person = personRes.status === 'fulfilled' ? personRes.value : null;
  const company = companyRes.status === 'fulfilled' ? companyRes.value : null;

  // Fresh Google pass for career background / prominence (uses the resolved
  // employer/company from the person + firmographics passes).
  const employer = (person && person.professional && person.professional.employer)
    || (company && company.company) || null;
  const background = await personBackground({
    name,
    employer,
    company: companyDomain,
    priorNarrative: person && person.narrative,
    env,
  }).catch(() => null);

  return {
    name,
    email: form.email || null,
    email_domain: emailDom,
    free_mail: freeMail,
    company_domain: companyDomain,
    domain_of_interest: form.domain_of_interest || null,
    intent: form.intent || null,
    budget: form.budget || null,
    message: form.message || null,
    location: form.location || null,
    linkedin_url: form.linkedin_url || (person && person.professional && person.professional.linkedin_url) || null,
    person,
    company,
    background,
    enriched_at: new Date().toISOString(),
  };
}

export default { runLeadEnrich };
