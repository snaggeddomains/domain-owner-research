import { getToolSpecs, getCategoryMap } from './sources/index.js';
import * as openai from './llm/openai.js';
import * as anthropic from './llm/anthropic.js';

const SYSTEM_PROMPT = `You are a meticulous domain-ownership research analyst.
Given a domain, determine who owns or controls it, the history of that ownership, and the supporting infrastructure evidence.

How to work:
- Gather evidence with the available tools. Begin with rdap_whois and dns_lookup, then wayback_history, then any premium sources (whoisxml_lookup, domainiq_lookup, bigdomaindata_lookup) that are available for historical WHOIS, reverse-WHOIS and related domains.
- Call independent tools in parallel. Do not ask the user for permission — just gather what you need.
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
Cite the source of each key fact inline, e.g. "(RDAP)", "(DNS)", "(Wayback)", "(DomainIQ)", "(Signa)". If a tool failed or returned nothing useful, say so rather than guessing.`;

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
  const userPrompt = question
    ? `Research the domain: ${domain}\n\nSpecific question: ${question}`
    : `Research the domain: ${domain}`;

  const result = await provider.runAgent({
    system: SYSTEM_PROMPT,
    history,
    userPrompt,
    toolSpecs,
    env,
    maxSteps: MAX_STEPS,
    maxToolResultChars: MAX_TOOL_RESULT_CHARS,
  });

  // toolsAvailable lets the UI show which sources ran vs. were available-but-unused;
  // categories let the recap group them into labeled sections.
  return { ...result, toolsAvailable: toolSpecs.map((t) => t.name), categories: getCategoryMap(), tier };
}
