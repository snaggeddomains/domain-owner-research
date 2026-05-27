import { getToolSpecs, getCategoryMap, runTool } from './sources/index.js';
import * as openai from './llm/openai.js';
import * as anthropic from './llm/anthropic.js';

const SYSTEM_PROMPT = `You are a meticulous domain-ownership research analyst.
Given a domain, determine who owns or controls it, the history of that ownership, and the supporting infrastructure evidence.

How to work:
- The internal Master Domain List has ALREADY been checked for you automatically as the first step (the result is in the task message). If it found a record, lead with it as a strong internal ownership pointer (recorded owner/price/source/category); do not call masterlist_lookup. Then, still free and early, run marketplace_check for the domain before any paid source — a listing names the selling channel and often the broker/holder.
- Gather evidence with the available tools. Begin with rdap_whois, whois_lookup and dns_lookup, then wayback_history, then any premium sources (whoisxml_lookup, domainiq_lookup, bigdomaindata_lookup) that are available for historical WHOIS, reverse-WHOIS and related domains.
- ALWAYS run whois_lookup (legacy port-43 WHOIS) as well as rdap_whois. Thin registries (notably .com/.net) return almost nothing useful over RDAP, but their registrar's port-43 WHOIS frequently exposes the PUBLIC registrant name, organization, email and phone. When that contact is public, report it directly — it is already public, so it must appear even on the free pre-flight pass; never make the user "go deeper" for data that is already public in WHOIS.
- Call independent tools in parallel. Do not ask the user for permission — just gather what you need.
- RULE — enrich any candidate owner: as soon as you have even moderate confidence in a potential owner (a real person's name, organization, email or phone from WHOIS/RDAP/site/archive/cluster/trademark — anything), run what you have through rocketreach_search (it is FREE and spends no credits) to find additional professional contact info (current employer, title, LinkedIn, location). Do this on the free pre-flight pass too. Pass the person's name (and company/title/linkedin if known); prefer the registrant or a historically-named owner.
- Cross-reference findings: registrant identity/org, registrar, nameserver/hosting/email provider, creation/expiry/transfer dates, historical registrant changes, and how long content has existed (Wayback).
- Reconstruct the FULL ownership timeline from historical WHOIS (DomainIQ returns dated "eras"). Surface every historical registrant NAME, organization and email — especially a real person's name from a pre-privacy era — even when the current record is privacy-shielded.
- Piece clues together across eras. If infrastructure is continuous across a privacy transition (e.g. the same nameservers, registrar, hosting or email pattern persist from a named era through today), infer that the historically-named registrant most likely still controls the domain — name them and explain the chain of evidence, with calibrated confidence.
- Check the registration cluster (registration_cluster): same-label siblings on other TLDs registered around the same time as the target, or sharing its nameservers, are likely the same owner — and a sibling whose WHOIS is NOT private can directly reveal the owner's name/email. Pivot on any such lead (reverse_whois / web_search / domainiq).
- Check trademarks (trademark_search) on the brand (the domain's SLD) and on any candidate owner. The applicant/owner on a matching mark — even a pending or abandoned application — is a strong ownership/entity lead, and a filing date near the domain's creation corroborates it.
- Search the open web (web_search) for the candidate owner, company, a distinctive email, or the domain itself — scoping to LinkedIn, Crunchbase, X/Twitter, news and other public databases (e.g. site:linkedin.com, site:crunchbase.com) to corroborate identity and find current affiliation/contact.
- Be explicit about privacy redaction (e.g. "Domains By Proxy", "Privacy Protect", "REDACTED FOR PRIVACY"). NEVER invent a registrant when the record is private or a tool returned nothing.

Deliver your answer in TWO parts.

PART 1 — a single fenced \`\`\`json code block FIRST (valid JSON, no comments, no trailing commas), with these keys (use null or [] when unknown):
{
  "confidence": "High" | "Medium" | "Low",
  "likely_owner": "person or org name, or null",
  "owner_type": "active_company" | "former_operator" | "individual" | "domain_investor" | "marketplace_only" | "unknown",
  "summary": "1-2 sentence plain-English bottom line",
  "contacts": [ { "type": "name" | "email" | "phone" | "org" | "social", "value": "...", "note": "where it came from / how current/strong" } ],
  "contact_path": [ "ranked, concrete next step to reach the owner" ],
  "timeline": [ { "date": "YYYY, YYYY-MM-DD, or a range", "event": "short label", "detail": "what changed: registrant / privacy / registrar / nameservers / site" } ]
}
"confidence" = your confidence in naming the ACTUAL owner (not merely whether it is privacy-protected). Put the STRONGEST clues here — real names, emails, phones, and the ownership movements — ordered most-useful first. Never invent a registrant.

PART 2 — after the JSON block, the supporting detail in Markdown, most-useful first, using these sections (omit any with nothing to say):
**Current registration** · **Infrastructure** · **Live site & archive** · **Marketplace & valuation** · **Web, social & trademark** · **Confidence & gaps**.
Cite the source of each key fact inline, e.g. "(RDAP)", "(WHOIS)", "(DNS)", "(Wayback)", "(DomainIQ)", "(RocketReach)", "(Signa)". If a tool failed or returned nothing useful, say so rather than guessing.`;

const MAX_TOOL_RESULT_CHARS = 12000;
const MAX_STEPS = 8;

// "claude" and "anthropic" are aliases for the same adapter.
const PROVIDERS = { claude: anthropic, anthropic, openai };

export async function research({ domain, question, history = [], env, tier = 'all' }) {
  const providerName = (env.LLM_PROVIDER || 'claude').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER "${providerName}" — use "claude" or "openai"`);
  }

  const toolSpecs = getToolSpecs(env, { tier });

  // Deterministically run the internal Master Domain List FIRST (it's free), so
  // a hit always anchors the report and always appears first in "Sources
  // checked" — instead of depending on the model's tool ordering. We then drop
  // it from the model's tool list and seed the result into the task message.
  const seedTrace = [];
  const agentToolSpecs = toolSpecs.filter((t) => t.name !== 'masterlist_lookup');
  let seedNote = '';
  if (agentToolSpecs.length !== toolSpecs.length) {
    const ml = await runTool('masterlist_lookup', { domain }, env);
    seedTrace.push({
      tool: 'masterlist_lookup',
      args: { domain },
      ok: ml.ok,
      error: ml.error || null,
      data: ml.ok ? JSON.stringify(ml.data).slice(0, 4000) : null,
    });
    if (ml.ok && ml.data && ml.data.found) {
      seedNote = `\n\n[Already checked automatically as the first step — do NOT call masterlist_lookup again] Our internal Master Domain List HAS this domain: ${JSON.stringify(ml.data)}. Lead with this as a strong internal ownership pointer (recorded owner / price / source / category).`;
    } else if (ml.ok) {
      seedNote = `\n\n[Already checked automatically as the first step — do NOT call masterlist_lookup again] Our internal Master Domain List has NO record for this domain (a miss is not evidence either way).`;
    } else {
      seedNote = `\n\n[masterlist_lookup ran automatically as the first step but errored: ${ml.error}]`;
    }
  }

  const userPrompt =
    (question ? `Research the domain: ${domain}\n\nSpecific question: ${question}` : `Research the domain: ${domain}`) +
    seedNote;

  const result = await provider.runAgent({
    system: SYSTEM_PROMPT,
    history,
    userPrompt,
    toolSpecs: agentToolSpecs,
    env,
    maxSteps: MAX_STEPS,
    maxToolResultChars: MAX_TOOL_RESULT_CHARS,
    seedTrace,
  });

  // toolsAvailable lets the UI show which sources ran vs. were available-but-unused;
  // categories let the recap group them into labeled sections.
  return { ...result, toolsAvailable: toolSpecs.map((t) => t.name), categories: getCategoryMap(), tier };
}
