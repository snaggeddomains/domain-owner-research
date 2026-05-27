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
- RULE — enrich any candidate owner: as soon as you have even moderate confidence in a potential owner (a real person's name, organization, email or phone from WHOIS/RDAP/site/archive/cluster/trademark — anything), run what you have through rocketreach_search (it is FREE and spends no credits) to find additional professional context (current employer, title, LinkedIn, location). Do this on the free pre-flight pass too. Then, on the deep pass, run rocketreach_lookup (premium) on the PRIMARY likely owner — by name+company, by LinkedIn URL, or by the profile id from search — to retrieve their actual EMAIL and PHONE. Prefer the current/most-likely owner over a historical one. A search returning no profiles, or a lookup with no emails, just means RocketReach has no record (not that contact info doesn't exist) — fall back to the owner's active entity or the registrar contact form. NEVER enrich a marketplace/broker PLATFORM or its staff (Atom, GoDaddy/Afternic, Dan, Sedo, Sav, Brannans/Zito, etc.) — those are standard channels, not the owner; do not look up a broker's LinkedIn/email/phone.
- Cross-reference findings: registrant identity/org, registrar, nameserver/hosting/email provider, creation/expiry/transfer dates, historical registrant changes, and how long content has existed (Wayback).
- Reconstruct the FULL ownership timeline from historical WHOIS (DomainIQ returns dated "eras"). Surface every historical registrant NAME, organization and email — especially a real person's name from a pre-privacy era — even when the current record is privacy-shielded.
- Piece clues together across eras. If infrastructure is continuous across a privacy transition (e.g. the same nameservers, registrar, hosting or email pattern persist from a named era through today), infer that the historically-named registrant most likely still controls the domain — name them and explain the chain of evidence, with calibrated confidence.
- Check the registration cluster (registration_cluster): same-label siblings on other TLDs registered around the same time as the target, or sharing its nameservers, are likely the same owner — and a sibling whose WHOIS is NOT private can directly reveal the owner's name/email. Pivot on any such lead (reverse_whois / web_search / domainiq).
- Check trademarks (trademark_search) on the brand (the domain's SLD) and on any candidate owner. The applicant/owner on a matching mark — even a pending or abandoned application — is a strong ownership/entity lead, and a filing date near the domain's creation corroborates it.
- Chase every named owner — current OR historical — on the open web (web_search). When a real person or organization surfaces (even a pre-privacy registrant from years ago, e.g. an old WHOIS "Cove Communications / Bill Ostaski"), search that name WITH disambiguating context (their organization, city/state, a distinctive email, or the domain) to establish who they are today and how to reach them: current employer, companies founded, news, and profiles (LinkedIn, Crunchbase, X). Also search a distinctive email or the domain itself.
- Treat life-status signals as MATERIAL. If you find an obituary or death notice for the named registrant, the domain is now most likely held by an ESTATE, heir, or a surviving company — say so explicitly, note the date of death and any named survivors/executor/successor entity, lower the expectation of reaching the original person, and route the recommended contact path to the estate/family/successor (or a broker) rather than the deceased. The same applies if a registrant company was dissolved/acquired — pivot to the successor.
- Be explicit about privacy redaction (e.g. "Domains By Proxy", "Privacy Protect", "REDACTED FOR PRIVACY"). NEVER invent a registrant when the record is private or a tool returned nothing.

Deliver your answer in TWO parts.

PART 1 — a single fenced \`\`\`json code block FIRST (valid JSON, no comments, no trailing commas), with these keys (use null or [] when unknown):
{
  "confidence": "High" | "Medium" | "Low",
  "likely_owner": "person or org name, or null",
  "owner_type": "active_company" | "former_operator" | "individual" | "domain_investor" | "marketplace_only" | "unknown",
  "summary": "1-2 sentence plain-English bottom line",
  "contacts": [ { "type": "name" | "email" | "phone" | "org" | "social", "value": "...", "note": "where it came from / how current/strong", "tier": "primary" | "secondary" | "tertiary" } ],
  "contact_path": [ "ranked, concrete next step to reach the owner" ],
  "timeline": [ { "date": "YYYY, YYYY-MM-DD, or a range", "event": "short label", "detail": "what changed: registrant / privacy / registrar / nameservers / site" } ]
}
"confidence" = your confidence in naming the ACTUAL owner (not merely whether it is privacy-protected). Put the STRONGEST clues here — real names, emails, phones, and the ownership movements — ordered most-useful first. Never invent a registrant.
"contacts" should hold owner-IDENTIFYING clues — real names, personal/role-free emails, direct phones, the owner's own social/professional profile — and SHOULD include a pre-privacy HISTORICAL owner's name and contact info (e.g. a 1990s–2000s registrant and their email/phone), since those are valuable leads even if that person is not the current holder; the UI highlights these automatically. Set "tier" on each contact: "primary" for the single most-likely CURRENT owner and the concrete channels to reach THEM (their own email/phone from rocketreach_lookup, an active entity they control, a profile, or the registrar's contact-holder form); "secondary"/"tertiary" for predecessors, domain-financing/escrow holders that merely took title, related shell entities, or brokers — useful routes but not the end target. Always populate the primary tier with the best available way to reach the likely owner, even when it is an entity or a form rather than a personal email. Do NOT put marketplace/for-sale listing URLs (Afternic, Dan, Sedo, Atom, GoDaddy) in "contacts", and never type them as "social" — report any genuine listing in the Markdown Marketplace section and as a step in "contact_path" instead. Only state a domain is "listed for sale" when marketplace_check returned http_status 200 with a real for-sale signal; a 404/403/410 page or bare page-furniture prices do NOT mean it is listed. When a domain IS listed on a standard platform (Atom, Afternic, Dan, Sedo, GoDaddy, etc.), just say so with a link — do NOT provide LinkedIn/email/phone for the platform or its broker; the listing link itself is the contact route.

PART 2 — after the JSON block, the supporting detail in Markdown, most-useful first, using these sections (omit any with nothing to say):
**Current registration** · **Infrastructure** · **Live site & archive** · **Marketplace & valuation** · **Web, social & trademark** · **Confidence & gaps**.
Cite the source of each key fact inline, e.g. "(RDAP)", "(WHOIS)", "(DNS)", "(Wayback)", "(DomainIQ)", "(RocketReach)", "(Signa)". If a tool failed or returned nothing useful, say so rather than guessing.`;

const MAX_TOOL_RESULT_CHARS = 12000;
const MAX_STEPS = 10;

// "claude" and "anthropic" are aliases for the same adapter.
const PROVIDERS = { claude: anthropic, anthropic, openai };

export async function research({ domain, question, history = [], env, tier = 'all' }) {
  const providerName = (env.LLM_PROVIDER || 'claude').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER "${providerName}" — use "claude" or "openai"`);
  }

  const toolSpecs = getToolSpecs(env, { tier });
  const available = new Set(toolSpecs.map((t) => t.name));

  // Run some sources DETERMINISTICALLY rather than leaving them to the model's
  // discretion: the internal Master Domain List always (free), and on the paid
  // deep pass the domain-only historical-WHOIS sources too — so they ALWAYS
  // execute and anchor the report instead of being skipped. Their results are
  // seeded into the task message and they're removed from the model's tool list.
  const preRun = ['masterlist_lookup'];
  if (tier === 'all') preRun.push('whoisxml_lookup', 'domainiq_lookup', 'bigdomaindata_lookup');
  const toRun = preRun.filter((n) => available.has(n));

  const ran = await Promise.all(toRun.map(async (name) => ({ name, res: await runTool(name, { domain }, env) })));
  const byName = new Map(ran.map((r) => [r.name, r.res]));

  const seedTrace = [];
  const seedParts = [];
  for (const name of toRun) {
    const res = byName.get(name);
    seedTrace.push({
      tool: name,
      args: { domain },
      ok: res.ok,
      error: res.error || null,
      data: res.ok ? JSON.stringify(res.data).slice(0, 4000) : null,
    });
    if (name === 'masterlist_lookup') {
      if (res.ok && res.data && res.data.found) seedParts.push(`Internal Master Domain List HAS this domain: ${JSON.stringify(res.data)} — lead with it as a strong internal ownership pointer (recorded owner / price / source / category).`);
      else if (res.ok) seedParts.push(`Internal Master Domain List: NO record for this domain (a miss is not evidence either way).`);
      else seedParts.push(`masterlist_lookup errored: ${res.error}`);
    } else if (res.ok) {
      seedParts.push(`${name} (ran automatically): ${JSON.stringify(res.data).slice(0, 4000)}`);
    } else {
      seedParts.push(`${name} (ran automatically) errored: ${res.error} — note this gap.`);
    }
  }
  const agentToolSpecs = toolSpecs.filter((t) => !toRun.includes(t.name));
  const seedNote = seedParts.length
    ? `\n\n[Already run automatically as the first step — do NOT call these again: ${toRun.join(', ')}]\n${seedParts.join('\n')}`
    : '';

  // On the paid deep pass the user has explicitly opted in: the history sources
  // above were already run; push the model to also use the remaining premium
  // sources (which need inputs discovered during research) rather than settling.
  const deepNote =
    tier === 'all'
      ? `\n\n[PAID DEEP PASS] The user explicitly opted into the paid sources — be thorough and do not settle for a free-tier answer. The historical-WHOIS sources above already ran. Now ALSO call the remaining available premium sources: reverse_whois, reverse_ns and reverse_ip for the owner's wider portfolio and shared infrastructure, and rocketreach_lookup on the primary likely owner to retrieve their email/phone. Batch independent calls in parallel; only skip one that genuinely cannot apply.`
      : '';
  const userPrompt =
    (question ? `Research the domain: ${domain}\n\nSpecific question: ${question}` : `Research the domain: ${domain}`) +
    seedNote +
    deepNote;

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
