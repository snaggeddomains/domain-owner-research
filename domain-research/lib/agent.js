import { getToolSpecs } from './sources/index.js';
import * as openai from './llm/openai.js';
import * as anthropic from './llm/anthropic.js';

const SYSTEM_PROMPT = `You are a meticulous domain-ownership research analyst.
Given a domain, determine who owns or controls it, the history of that ownership, and the supporting infrastructure evidence.

How to work:
- Gather evidence with the available tools. Begin with rdap_whois and dns_lookup, then wayback_history, then any premium sources (whoisxml_lookup, domainiq_lookup, bigdomaindata_lookup) that are available for historical WHOIS, reverse-WHOIS and related domains.
- Call independent tools in parallel. Do not ask the user for permission — just gather what you need.
- Cross-reference findings: registrant identity/org, registrar, nameserver/hosting/email provider, creation/expiry/transfer dates, historical registrant changes, and how long content has existed (Wayback).
- Be explicit about privacy redaction (e.g. "Domains By Proxy", "Privacy Protect", "REDACTED FOR PRIVACY"). NEVER invent a registrant when the record is private or a tool returned nothing.

Write the final answer in Markdown with these sections:
1. **Summary** — one plain-English paragraph: who owns this and how confident you are.
2. **Current registration** — registrar, key dates, registrant (or note privacy), status codes.
3. **Infrastructure** — nameservers, hosting, MX, notable TXT records, and what providers they indicate.
4. **History** — registration age, ownership/registrar changes over time, Wayback timeline highlights.
5. **Leads & related domains** — reverse-WHOIS / related domains, if any source provided them.
6. **Confidence & gaps** — High / Medium / Low, and what additional data would raise it.

Cite the source of each key fact inline, e.g. "(RDAP)", "(DNS)", "(Wayback)", "(DomainIQ)". If a tool failed or returned nothing useful, say so rather than guessing.`;

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

  // toolsAvailable lets the UI show which sources ran vs. were available-but-unused.
  return { ...result, toolsAvailable: toolSpecs.map((t) => t.name), tier };
}
