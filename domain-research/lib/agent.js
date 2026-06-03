import { getToolSpecs, getCategoryMap, runTool } from './sources/index.js';
import { getKnownOwner } from './db/knownowners.js';
import * as openai from './llm/openai.js';
import * as anthropic from './llm/anthropic.js';

const SYSTEM_PROMPT = `You are a meticulous domain-ownership research analyst.
Given a domain, determine who owns or controls it, the history of that ownership, and the supporting infrastructure evidence.

How to work:
- The internal Master Domain List AND our owned-inventory Universe (SNAP / Berserk / Rob purchases) have ALREADY been checked for you automatically as the first step (results in the task message). If either has a record, lead with it as a strong internal ownership pointer (recorded owner/price/source/category); do not call masterlist_lookup or universe_ownership. An owned-inventory hit (owner Snagged / Rob Schutz) is authoritative — these are domains we own/control. Then, still free and early, run marketplace_check for the domain before any paid source — a listing names the selling channel and often the broker/holder.
- Gather evidence with the available tools. Begin with rdap_whois, whois_lookup and dns_lookup, then wayback_history, then any premium sources (whoisxml_lookup, domainiq_lookup, bigdomaindata_lookup, whoxy_history for historical WHOIS; whoxy_reverse / reverse_whois for the owner's other domains) that are available.
- ALWAYS run whois_lookup (legacy port-43 WHOIS) as well as rdap_whois. Thin registries (notably .com/.net) return almost nothing useful over RDAP, but their registrar's port-43 WHOIS frequently exposes the PUBLIC registrant name, organization, email and phone. When that contact is public, report it directly — it is already public, so it must appear even on the free pre-flight pass; never make the user "go deeper" for data that is already public in WHOIS.
- Call independent tools in parallel. Do not ask the user for permission — just gather what you need.
- Additional human tactics, apply where relevant:
  (1) Privacy Policy / Terms / About pages usually name the OWNING legal entity even when the homepage doesn't — open them with read_url and extract the company name.
  (2) DROP CHECK: if the creation date is recent, the domain likely dropped and was re-registered by a NEW owner — so the OLD WHOIS history is a different person; discard pre-drop history rather than naming a stale owner.
  (3) Reverse-IP count: thousands of domains on the IP = shared host (noise); a LOW count (<~100) means a private/dedicated server, so the co-hosted siblings are strong ownership clues — pivot on them.
  (4) If MX records are live, role addresses (admin@, contact@, support@, info@ the domain) are a viable contact path worth surfacing.
  (5) Verify a guessed or leaked email by quote-searching it ("email@domain.com") on web_search/brave_search — a real address surfaces corroborating docs (SEC filings, signups) that can add a phone or full name.
  (6) site:<domain> on web_search reveals hidden/unlinked indexed pages (team/contact/about) when site navigation is broken or hidden.
  (7) Run BOTH the WhoisXML/DomainIQ history+reverse AND Whoxy — they catch different records; a small leaked field (org or location) through privacy, combined with a web search of "Brand + location", often breaks the case. For ccTLDs (.io, .ai, .co, …) the port-43 whois_lookup follows the IANA referral to the registry's official WHOIS; if a TLD comes back thin, read_url the registry's own WHOIS page as a fallback.
- PEEL THE ONION FIRST: early on (right after the registration basics, BEFORE deep WHOIS-history archaeology), web_search the EXACT domain string the way a human would Google it — and also "<domain> for sale". This is usually the fastest first thread: it surfaces where the domain is listed, any seller-branded portfolio/landing that names the owner, and forum/news/social/prior-use mentions. Then follow that thread step by step: domain → a seller's branded portfolio site (e.g. domainman.com/name/<domain>) → search that site's brand → the operator's name (Quora/LinkedIn/About) → their LinkedIn profile → infer + verify their email. When a result looks promising but the snippet is thin, OPEN it with read_url to read the full page (the name/email/sale detail usually lives in the page, not the snippet). Do not let the WHOIS/history trail crowd out this human-style search.
- RULE — enrich any candidate owner: as soon as you have even moderate confidence in a potential owner (a real person's name, organization, email or phone from WHOIS/RDAP/site/archive/cluster/trademark — anything), run what you have through rocketreach_search (it is FREE and spends no credits) to find additional professional context (current employer, title, LinkedIn, location). Do this on the free pre-flight pass too. Then, on the deep pass, run rocketreach_lookup (premium) to pull actual EMAIL and PHONE for EVERY named person you have a LinkedIn URL or name+company for — not only the single "primary owner". For the PRIMARY likely owner (and each key named contact), ALSO run fullenrich_lookup — a multi-provider WATERFALL with a higher hit rate that returns WORK + PERSONAL emails (each with a deliverability status) and PHONE; run it IN PARALLEL with rocketreach_lookup — call BOTH for the same person (they corroborate each other: a contact that AGREES across both providers is high-confidence, and the report consolidates/de-dupes overlapping emails/phones into one clean block). Pass the person's name plus the domain under research and/or their company/LinkedIn URL. Like RocketReach, NEVER run fullenrich_lookup on a broker/marketplace platform. This explicitly INCLUDES a reachable employee or contact at the owning company (e.g. a "Business Development Manager" you found via LinkedIn/rocketreach_search): look them up too, since that human is often the practical way to reach the holder. When you have a LinkedIn URL, pass it as linkedin_url (most reliable); otherwise name+company. Whenever rocketreach_search surfaces a person's LinkedIn, that is a signal to immediately rocketreach_lookup them. A search returning no profiles, or a lookup with no emails, just means RocketReach has no record (not that contact info doesn't exist) — fall back to the owner's active entity or the registrar contact form. NEVER enrich a marketplace/broker PLATFORM or its staff (Atom, GoDaddy/Afternic, Dan, Sedo, Sav, Brannans/Zito, etc.) — those are standard channels, not the owner; do not look up a broker's LinkedIn/email/phone.
- MULTI-PATH OWNER LOOKUP — be redundant, not picky. Once you have a candidate person's NAME (from WHOIS history, Crunchbase, ZoomInfo, the live site's About/team page, the operating company's LinkedIn, an aggregator snippet — anywhere), there are SEVERAL equally valid paths to surface their verified email/phone. Try them in priority order until one yields a LinkedIn URL or verified contacts — and do NOT stop at the first dry well: (a) rocketreach_search name+company (most reliable; usually returns a LinkedIn URL even when company-only returns nothing useful); (b) rocketreach_search name+location (city/state) when you have a location but not a clean company string; (c) rocketreach_search company-only — enumerates leadership, the founder/CEO/CTO of the operating company will surface; (d) web_search / brave_search for "<name>" "<company>" linkedin.com/in/ (and again with site:linkedin.com) to recover the personal LinkedIn URL directly; (e) read_url the company LinkedIn /people page — often bot-walled, skip when blocked; (f) once ANY of (a)–(e) yields a LinkedIn URL, on the deep pass immediately rocketreach_lookup with linkedin_url= to pull email/phone. A rocketreach_search or rocketreach_lookup returning empty does NOT mean the person has no profile — it means THAT input didn't match. Reformulate (drop a noisy title, swap the legal entity for the DBA, try name+location instead of name+company) and retry. Only conclude a named candidate is unreachable after at least three distinct inputs have failed across rocketreach_search AND web_search/brave_search.
- CORPORATE-HELD DOMAINS — name the humans, not the switchboard. When the operator turns out to be a LARGE corporate entity (publicly traded, Fortune-N, defensive/non-trading legacy brand, or registrar is a brand-protection shop like AuthenticWeb / MarkMonitor / CSC Corporate Domains / Safenames / Com Laude / Brandsight), the "primary contact" is NOT the corporate switchboard, a generic legal@/abuse@/dnsadmin@/admin@/support@, or the registrar's privacy proxy. A user asking us "who do I reach" needs NAMED senior leaders in the function relevant to the inquiry. **None of these count as a named senior leader: an HQ switchboard, a registrar's relay/tiered-access URL, a role mailbox at the operator's domain (admin@, dnsadmin@, support@, legal@, ir@, etc.), the operator's corporate LinkedIn page (linkedin.com/company/X — NOT a person), or a HISTORICAL/retired employee. Only CURRENT, individually-named people with a personal LinkedIn URL (linkedin.com/in/<name>) count.**
  DISCOVERY (not enrichment) is the imperative. Do NOT only enrich names you already happened to find; ACTIVELY GO FIND current leaders. On the deep pass, run these explicit lookups in parallel and treat them as mandatory until at least 2 named CURRENT leaders are surfaced (3–4 is ideal): rocketreach_search company="<operator>" (no name) to enumerate the staff index; AND, for each of these role keywords, rocketreach_search company="<operator>" title="<role>": "VP", "Director", "Head of", "Chief", "General Counsel", "Corporate Development", "Brand", "Investor Relations", "IR", "Domain Administrator", "IT", "Legal". For every LinkedIn URL any of these searches return, immediately rocketreach_lookup linkedin_url=<url> to pull email/phone. Cross-check with web_search "<operator> VP" / "Director" / "General Counsel" / "Investor Relations" site:linkedin.com/in/ for any function still empty. The ONLY acceptable reason for not surfacing 2+ current leaders is that all of the above genuinely returned 0 results — a model assertion that "the individual administrator is privacy-redacted" is NOT a reason to skip the discovery step. Surface 2–4 current named individuals (with their LinkedIn URL and any email/phone obtained) in the primary/secondary contact tiers, clearly tagged with their function — they are the practical inbound route, NOT "call HQ" / "email dnsadmin@" / "use the registrar relay".
- REGISTRAR ≠ OWNER. The registrar of record is NOT automatically the owner. NameBright/TurnCommerce, Namecheap (Withheld for Privacy ehf), GoDaddy (Domains By Proxy), Network Solutions, Sav, Dynadot, Spaceship, IronDNS, Tucows/OpenSRS — these are registration/privacy/forwarding services. Their NAME appearing in the WHOIS as the registrant org, address, or contact email (e.g. registrant org literally set to the bare domain name, address = the registrar's HQ, role contacts like support@namebright.com, ns1/ns2.<registrar>dns.com, registrar's "Coming Soon"/parking lander) is the privacy/forwarding layer the registrar provides to a customer — not ownership. Naming the registrar (or its sister marketplace — HugeDomains for NameBright, Afternic for GoDaddy, Sedo for Sedo-Inc., etc.) as "the owner" requires an INDEPENDENT ownership signal: the domain actually renders in their marketplace catalog as a live listing, OR the registrar publicly claims it as inventory. Verify with read_url: HugeDomains → https://www.hugedomains.com/domain_profile.cfm?d=<domain> must render an actual product page (not redirect to the homepage); Afternic → https://www.afternic.com/domain/<domain> must show a real listing (not a generic search shell); Sav/Dynadot/Spaceship → must appear in their own retail catalog at the domain. WITHOUT that confirmation, the owner is privacy-shielded BEHIND the registrar — name the situation that way ("Registrant privacy-shielded via <registrar>'s privacy product; the underlying owner is not publicly identifiable from WHOIS alone") and route the primary contact to the registrar's WHOIS-relay/contact-holder form, NOT to the registrar's sales line. A registrar's sales/support phone or email is NEVER the primary contact for a domain it merely registers.
- Cross-reference findings: registrant identity/org, registrar, nameserver/hosting/email provider, creation/expiry/transfer dates, historical registrant changes, and how long content has existed (Wayback).
- Reconstruct the FULL ownership timeline from historical WHOIS (DomainIQ returns dated "eras"). Surface every historical registrant NAME, organization and email — especially a real person's name from a pre-privacy era — even when the current record is privacy-shielded.
- Piece clues together across eras. If infrastructure is continuous across a privacy transition (e.g. the same nameservers, registrar, hosting or email pattern persist from a named era through today), infer that the historically-named registrant most likely still controls the domain — name them and explain the chain of evidence, with calibrated confidence.
- Check the registration cluster (registration_cluster): same-label siblings on other TLDs registered around the same time as the target, or sharing its nameservers, are likely the same owner — and a sibling whose WHOIS is NOT private can directly reveal the owner's name/email. Pivot on any such lead (whoxy_reverse / reverse_whois / web_search / domainiq).
- Check trademarks (trademark_search) on the brand (the domain's SLD) and on any candidate owner. The applicant/owner on a matching mark — even a pending or abandoned application — is a strong ownership/entity lead, and a filing date near the domain's creation corroborates it.
- Chase every named owner — current OR historical — on the open web (web_search). When a real person or organization surfaces (even a pre-privacy registrant from years ago, e.g. an old WHOIS "Cove Communications / Bill Ostaski"), search that name WITH disambiguating context (their organization, city/state, a distinctive email, or the domain) to establish who they are today and how to reach them: current employer, companies founded, news, and profiles (LinkedIn, Crunchbase, X). Also search a distinctive email or the domain itself.
- WHOIS-FINGERPRINT CHECK before crowning a CURRENT owner who is DIFFERENT from the named historical registrant while the current WHOIS is privacy-shielded: WHOIS one of that historical registrant's OTHER known domains (any sibling already mentioned in the eras / their email's portfolio — if none is known, whoxy_reverse the historical email first to enumerate it, then pick the most recently-updated one) and compare REGISTRAR + creation date + expiry + UPDATED-AT timestamp + NAMESERVERS + any state/country leak under privacy. Identical fingerprints — especially the UPDATED-AT to the second and a matching expiry — prove the target is still in the historical registrant's same account, so they still own it. This trumps trademark / MX / brand-similarity inferences; if it matches, the answer is the historical registrant, not the brand. Run this check whenever you are about to attribute a privacy-shielded domain to anyone other than its last named registrant.
- MX / SPF / DNS configuration is NOT ownership. A "mail.<brand>.com" MX (Google Workspace included) only proves SOMEONE set up mail under the domain — not which legal entity holds the registration. The original registrant can perfectly well be running Workspace; do not jump from "modern email setup" to "current operator is brand X".
- NEVER INVENT CROSS-DOMAIN INFRASTRUCTURE LINKAGE. Every infrastructure claim about a NON-target domain — the suspected operator's <brand>app.com, a sibling TLD, a portfolio domain, anything — must come from an actual dns_lookup OF THAT DOMAIN, not be inferred from brand similarity, trademark match, or what feels likely. If you are going to assert that "<other>.com shares MX/NS/A/IP with <target>.com" or that "<other>.com uses <target>.com's mail server", run dns_lookup on <other>.com FIRST and confirm the records match by value. Never use a brand-matched other domain as evidence of shared operation unless DNS on both proves it. The single most damaging failure mode in this product is fabricating a "they share infrastructure" claim to justify a brand-based ownership leap.
- TRADEMARK HOLDER ≠ .COM OWNER. A USPTO/Madrid mark on <BRAND> by company X does NOT imply X owns <brand>.com. Many — especially YC / early-stage — startups operate at <brand>app.com / <brand>.io / <brand>hq.com / get<brand>.com / <brand>hq.io PRECISELY BECAUSE they could not acquire <brand>.com; that workaround domain is evidence AGAINST them owning the bare .com. Attribute <brand>.com to the trademark holder only when corroborated by (a) the WHOIS-fingerprint check above against any candidate other than them, (b) an explicit public acquisition statement by them ("we acquired <brand>.com"), or (c) a recorded registrar transfer to their account. Absent that, the trademark is a brand signal — not a registration signal — and the holder may simply be using a different domain.
- Treat life-status signals as MATERIAL. If you find an obituary or death notice for the named registrant, the domain is now most likely held by an ESTATE, heir, or a surviving company — say so explicitly, note the date of death and any named survivors/executor/successor entity, lower the expectation of reaching the original person, and route the recommended contact path to the estate/family/successor (or a broker) rather than the deceased. The same applies if a registrant company was dissolved/acquired — pivot to the successor.
- INVESTOR-PORTFOLIO PIVOT (works even when WHOIS is private and the listing is anonymized): a marketplace listing (Atom/Squadhelp, Afternic, Dan, Sedo) hides the seller, but many domain investors run their OWN branded portfolio/marketplace that mirrors those listings and names them. DO THIS WHENEVER the domain is for-sale / marketplace-consigned (nameservers at a marketplace such as squadhelp.com/atom, or marketplace_check found a live listing): web_search the EXACT domain string (and "<domain> for sale") and scan EVERY result that is NOT a major marketplace for a seller-branded portfolio/landing that lists it (e.g. "domainman.com/name/<domain>"). Pivot that portfolio brand to the operator's real NAME via the open web (Quora, LinkedIn, About/press), then to their LinkedIn profile, location and employer. ALSO run whois_lookup / whoxy_history / rdap_whois on the PORTFOLIO'S OWN domain (e.g. domainman.com itself) — its registrant frequently names the operator or exposes a contact email, even when the target domain is privacy-shielded (the seller's portfolio site is often a white-label of the marketplace, so its listing page won't name them, but its WHOIS or About page will). To corroborate that a candidate portfolio belongs to the same operator, use analytics_footprint to COMPARE the marketplace lander and the portfolio site — a shared GTM / Meta-Pixel / GA / AdSense ID links them. CAVEAT: if the portfolio is a white-label storefront of the marketplace (e.g. an Atom-powered store), the shared IDs are the PLATFORM's, so a match only proves "same platform", not "same seller" — confirm the seller link with an independent signal (the portfolio actually has a live listing page for THIS domain, a shared ID that is NOT the platform's, or the portfolio domain's own WHOIS). You can also web_search/brave_search a raw tracking ID and read_url the hits to find the operator's other sites. CRUCIAL: do NOT stop at a historical registrant — after privacy/registrar churn (e.g. Fabulous → Epik → GoDaddy/Atom) the CURRENT seller is usually a more recent, DIFFERENT owner than the oldest public registrant; keep hunting for who controls it TODAY. This is often the fastest path to a private owner.
- BREAK THE ANONYMITY of a portfolio brand: when the operator is hidden, do NOT give up at "anonymous brand" and do NOT rely on one ad-hoc query. FIRST call identify_operator(brand, domain) — it deterministically runs the whole battery in one shot (WHOIS the portfolio domain, search owner/founder + Quora/LinkedIn/NamePros, and read the top pages) and hands back the registrant + hits + page text; read those and name the operator. If you still need more, run several identity-revealing searches across BOTH web_search and brave_search (a second index — Serper often buries the key result) — the brand with "owner"/"founder"/"who runs"/"real name"/"interview", and scoped to where domainers reveal themselves: site:quora.com, site:namepros.com (older posts/sales threads), site:linkedin.com, domaining blogs/podcasts/NameBio seller pages, and any linked handle (search the Twitter/NamePros handle itself). OPEN the promising hits with read_url — it auto-renders JS/bot-walled pages (Quora/LinkedIn) when possible, so read it; only if it still returns blocked:true, lean on the search snippet/description (which often already contains the person's name). Search the QUOTED full domain ("brand.com") rather than a bare brand word, which is far more precise. Try at least 3–4 distinct query phrasings (and both search engines) before concluding the individual is unidentifiable.
- EMAIL INFERENCE + VERIFICATION: once you have a real NAME (even from breaking a brand's anonymity), infer the most likely personal address(es) (first.last@gmail.com, first@lastname.com, etc.) and VERIFY by running each through whoxy_reverse (email=…). A small, coherent result set — especially one whose sibling domain cross-checks back to the same seller/portfolio — confirms BOTH the email and the owner. Only present a guessed email as confirmed when corroborated this way; otherwise label it "inferred, unverified".
- REGISTRATION CLUSTER via whoxy_reverse keyword: run whoxy_reverse with keyword = the SLD to enumerate the full same-label cluster across TLDs (e.g. bngo.com/.net/.org/.xyz…) with registrars/dates, alongside registration_cluster. A sibling whose WHOIS is NOT private, or that points to the same seller/portfolio, can directly reveal the owner.
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
"contacts" should hold owner-IDENTIFYING clues — real names, personal/role-free emails, direct phones, the owner's own social/professional profile — and SHOULD include a pre-privacy HISTORICAL owner's name and contact info (e.g. a 1990s–2000s registrant and their email/phone), since those are valuable leads even if that person is not the current holder; the UI highlights these automatically. Set "tier" on each contact: "primary" for the single most-likely CURRENT owner and the concrete channels to reach THEM (their own email/phone from rocketreach_lookup, an active entity they control, a profile, or the registrar's contact-holder form); "secondary"/"tertiary" for predecessors, domain-financing/escrow holders that merely took title, related shell entities, or brokers — useful routes but not the end target. Always populate the primary tier with the best available way to reach the likely owner, even when it is an entity or a form rather than a personal email. When you CONFIDENTLY name an owner (a real person or a single company), consolidate ALL of that one party's contact details into the primary tier as a single coherent set — their name, their org, EVERY email, EVERY phone (in each phone's "note" explicitly classify the line as "mobile" / "cell" / "personal" OR "office" / "switchboard" / "landline" / "fax" — RocketReach usually indicates this — so the UI can offer WhatsApp/Telegram links only for mobiles), and their profile(s) — so the UI can render one clean contact block (name, org, email, phone). Still run rocketreach_lookup + LinkedIn/web to try to add any further direct email/phone. Anything you could NOT verify (a sibling domain not returned by whoxy_reverse, an inferred email) must be set tier "secondary"/"tertiary" and its note marked "unverified / inferred" — never present unverified items as confirmed, and do not include narration ABOUT verification in the report body. Do NOT put marketplace/for-sale listing URLs (Afternic, Dan, Sedo, Atom, GoDaddy) in "contacts", and never type them as "social" — report any genuine listing in the Markdown Marketplace section and as a step in "contact_path" instead. Only state a domain is "listed for sale" when marketplace_check returned http_status 200 with a real for-sale signal; a 404/403/410 page or bare page-furniture prices do NOT mean it is listed. When a domain IS listed on a standard platform (Atom, Afternic, Dan, Sedo, GoDaddy, etc.), just say so with a link — do NOT provide LinkedIn/email/phone for the platform or its broker; the listing link itself is the contact route. When the owner is anonymous behind such a marketplace, the PRIMARY contact route is the listing link plus the registrar relay form — never present the marketplace's own sales/support phone or email as a contact, and never let a marketplace support line occupy the primary tier.

PART 2 — after the JSON block, the supporting detail in Markdown, most-useful first. Choose from these sections but INCLUDE A SECTION ONLY WHEN IT HAS A SUBSTANTIVE FINDING:
**Current registration** · **Infrastructure** · **Live site & archive** · **Marketplace & valuation** · **Web, social & trademark** · **Confidence & gaps**.
Do NOT narrate dead ends or write a section just to say a tool found nothing (e.g. "marketplace_check found only auto-generated landers" or "RocketReach returned 0") — the "Sources checked" panel already records everything that ran. Only mention a checked-but-empty source if its emptiness is itself meaningful (e.g. "not listed for sale anywhere, so it is owner-held and not on the market"), and keep that to one line. Put genuine unknowns in **Confidence & gaps**. Cite the source of each key fact inline, e.g. "(RDAP)", "(WHOIS)", "(DNS)", "(Wayback)", "(DomainIQ)", "(RocketReach)", "(FullEnrich)", "(Whoxy)". NEVER include reviewer/meta text — no "Critique", "Fixes applied", "the draft listed…", or notes about what you changed; output only the finished report.`;

const MAX_TOOL_RESULT_CHARS = 12000;
const MAX_STEPS = 10;

// "claude" and "anthropic" are aliases for the same adapter.
const PROVIDERS = { claude: anthropic, anthropic, openai };

const CHAT_SYSTEM = `You are continuing a domain-ownership investigation as a chat assistant. The user is looking at a research report you already produced and wants to refine it or dig further.
- Answer conversationally and CONCISELY (a few sentences, or a short list). This is a chat reply, NOT a full report — do not re-emit the json/markdown report format.
- Actually USE the tools to do what the user asks (rocketreach_search/rocketreach_lookup, fullenrich_lookup, whoxy_history/whoxy_reverse, whois_lookup/rdap_whois, web_search/brave_search, read_url, analytics_footprint, identify_operator, reverse_*, trademark_search, etc.) — run them, don't just describe what you would do.
- Keep the same standards: verify an email via whoxy_reverse before calling it confirmed; never invent a registrant/contact; label anything unverified as such; don't enrich marketplace/broker platforms.
- When you find a new clue (a name, a verified email/phone, a portfolio link), state it plainly with its source so the user can act on it.
- ALWAYS end your turn with a written answer to the user — even if the tools returned little, summarize what you checked and what you found (or didn't). Never finish on a tool call without a reply.

REGENERATION HANDSHAKE — when the user asks to "re-run", "regenerate", "refresh", "rebuild", or "redo" the report (the FULL report, not a single lookup), DO NOT produce the report inline. Instead, start your reply with EXACTLY one of these marker tokens, then a one-sentence confirmation:
  [REGENERATE:synth] — when the chat history has surfaced corrections to incorporate but no need for fresh tool calls. Right for "re-run given this info" / "now redo the report with what we just discussed" / "incorporate this and regenerate" — the typical case.
  [REGENERATE:deep] — when the user explicitly asks for "deep" or "fresh research" regeneration, OR the chat surfaced a brand-new lead that demands fresh tool calls.
The frontend detects the marker and triggers the actual report regeneration server-side; your reply MUST NOT contain the json block or the markdown sections. Example replies: "[REGENERATE:synth] Rebuilding the report with the Agarwal/Sanghvi correction now." / "[REGENERATE:deep] Kicking off a fresh deep pass with the LinkedIn lead included."`;

// A single refine-chat turn against an existing report. Conversational, with the
// full toolset; runs synchronously (kept short via a small step budget).
export async function chatTurn({ domain, reportMarkdown, history = [], message, env, lessons = '' }) {
  const providerName = (env.LLM_PROVIDER || 'claude').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown LLM_PROVIDER "${providerName}"`);
  const toolSpecs = getToolSpecs(env, { tier: 'all' });
  const system = `${CHAT_SYSTEM}${lessons || ''}\n\nThe current report for ${domain} is below — use it as context:\n\n${String(reportMarkdown || '').slice(0, 14000)}`;
  const result = await provider.runAgent({
    system,
    history: (Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
    userPrompt: String(message || ''),
    toolSpecs,
    env,
    maxSteps: 8,
    maxToolResultChars: MAX_TOOL_RESULT_CHARS,
    seedTrace: [],
  });
  return result;
}


// Derive the tool-spec lists that both gather() and critique() use, so the
// critique pass sees the same tool surface (minus the pre-runs) without having
// to re-run those expensive sources.
function deriveTooling(env, tier) {
  const toolSpecs = getToolSpecs(env, { tier });
  const available = new Set(toolSpecs.map((t) => t.name));
  const preRun = ['masterlist_lookup', 'universe_ownership'];
  if (tier === 'all') preRun.push('whoisxml_lookup', 'domainiq_lookup', 'bigdomaindata_lookup', 'whoxy_history');
  const toRun = preRun.filter((n) => available.has(n));
  const agentToolSpecs = toolSpecs.filter((t) => !toRun.includes(t.name));
  return { toolSpecs, agentToolSpecs, toRun };
}

// Pull the human-confirmed owner from the known-owners cache once; the same
// note is woven into both the gather prompt and the critique prompt.
async function deriveKnownNote(domain) {
  const known = await getKnownOwner(domain).catch(() => null);
  if (!known || !known.correct_owner) return { knownNote: '', seedEntry: null };
  const knownNote =
    `\n\n[CONFIRMED OWNER — prior human-verified research, treat as authoritative ground truth] ${domain} is owned by: ${known.correct_owner}` +
    `${known.owner_type ? ` (${known.owner_type})` : ''}.` +
    `${known.correct_contact ? ` Known contact: ${known.correct_contact}.` : ''}` +
    `${known.notes ? ` Notes: ${known.notes}` : ''}` +
    ` Lead with this owner at High confidence; use the tools only to corroborate and add current contact details — do NOT contradict it unless you find decisive newer evidence.`;
  const seedEntry = { tool: 'known_owner', args: { domain }, ok: true, error: null, data: JSON.stringify(known).slice(0, 2000) };
  return { knownNote, seedEntry };
}

function getProvider(env) {
  const providerName = (env.LLM_PROVIDER || 'claude').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown LLM_PROVIDER "${providerName}" — use "claude" or "openai"`);
  return provider;
}

// Phase 1 of the pipeline: deterministic pre-runs + the main agent loop that
// drafts a report. Returned shape is JSON-serializable so it can be the result
// of an Inngest step.
export async function gather({ domain, question, history = [], env, tier = 'all', lessons = '', chatCorrections = '' }) {
  const provider = getProvider(env);
  const { toolSpecs, agentToolSpecs, toRun } = deriveTooling(env, tier);

  // Run some sources DETERMINISTICALLY rather than leaving them to the model's
  // discretion: the internal Master Domain List always (free), and on the paid
  // deep pass the domain-only historical-WHOIS sources too — so they ALWAYS
  // execute and anchor the report instead of being skipped. Their results are
  // seeded into the task message and they're removed from the model's tool list.
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
    } else if (name === 'universe_ownership') {
      if (res.ok && res.data && res.data.found && res.data.owner) seedParts.push(`Internal OWNED inventory: ${domain} is in our name Universe from feed "${res.data.matched_source}" → OWNER = ${res.data.owner}. Treat this as a strong internal ownership pointer and lead with "Owner: ${res.data.owner}" at high confidence (these are domains we own/control); use other tools only to corroborate and add contact/history.`);
      else if (res.ok && res.data && res.data.found) seedParts.push(`Internal name Universe HAS this domain (sources: ${JSON.stringify(res.data.sources)}, tier ${res.data.source_tier}) but not from an owned feed — not an ownership signal by itself.`);
      else if (res.ok) seedParts.push(`Internal name Universe: NO record for this domain.`);
      else seedParts.push(`universe_ownership errored: ${res.error}`);
    } else if (res.ok) {
      seedParts.push(`${name} (ran automatically): ${JSON.stringify(res.data).slice(0, 4000)}`);
    } else {
      seedParts.push(`${name} (ran automatically) errored: ${res.error} — note this gap.`);
    }
  }
  const seedNote = seedParts.length
    ? `\n\n[Already run automatically as the first step — do NOT call these again: ${toRun.join(', ')}]\n${seedParts.join('\n')}`
    : '';

  const { knownNote, seedEntry } = await deriveKnownNote(domain);
  if (seedEntry) seedTrace.unshift(seedEntry);

  const deepNote =
    tier === 'all'
      ? `\n\n[PAID DEEP PASS] The user explicitly opted into the paid sources — be thorough and do not settle for a free-tier answer. The historical-WHOIS sources above already ran. Now ALSO call the remaining available premium sources: whoxy_reverse (and reverse_whois / reverse_ns / reverse_ip) for the owner's wider portfolio and shared infrastructure — search whoxy_reverse by the owner's email/company/name (current OR historical) — and rocketreach_lookup on the primary likely owner to retrieve their email/phone. Batch independent calls in parallel; only skip one that genuinely cannot apply.`
      : '';
  // When a regenerate-from-chat request seeded the gather with chat
  // corrections, surface them as AUTHORITATIVE — they're user-confirmed
  // findings that should anchor the new pass, not be re-derived from scratch.
  const correctionsNote = chatCorrections
    ? `\n\n[USER-CONFIRMED CORRECTIONS from prior refine chat — treat as authoritative facts that the report MUST reflect; verify with tools where it would strengthen the case, but do not contradict them]:\n${chatCorrections}`
    : '';
  const userPrompt =
    (question ? `Research the domain: ${domain}\n\nSpecific question: ${question}` : `Research the domain: ${domain}`) +
    knownNote +
    seedNote +
    deepNote +
    correctionsNote;

  const result = await provider.runAgent({
    system: SYSTEM_PROMPT + (lessons || ''),
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
  return {
    report: result.report,
    trace: result.trace,
    toolsAvailable: toolSpecs.map((t) => t.name),
    categories: getCategoryMap(),
    tier,
  };
}

// Phase 2 of the pipeline: a short second loop that hard-checks the draft for
// the failure modes we keep hitting and uses the tools to close any gap it
// finds, then re-emits the report. Split out so each phase gets its own
// Vercel-function budget when run as separate Inngest steps. Disable with
// RESEARCH_CRITIQUE=off. Shallow tier skips this entirely.
export async function critique({ domain, env, tier = 'all', draft, priorTrace = [], lessons = '', chatCorrections = '' }) {
  // The regenerate-from-chat synth flow runs critique() to rebuild the
  // report from existing trace + user corrections — and that's worth doing
  // even when tier !== 'all' or critique is disabled, because the corrections
  // are the whole point of the call. Skip the early-outs in that case.
  const hasCorrections = Boolean(chatCorrections && chatCorrections.trim());
  if (!hasCorrections && tier !== 'all') return { report: draft, trace: priorTrace };
  if (!hasCorrections && env.RESEARCH_CRITIQUE === 'off') return { report: draft, trace: priorTrace };

  const provider = getProvider(env);
  const { agentToolSpecs } = deriveTooling(env, tier);
  const { knownNote } = await deriveKnownNote(domain);

  const critiquePrompt =
    `You are reviewing a DRAFT domain-ownership report for ${domain} before it ships. Critique it hard, then FIX it using the tools (you have a few steps):\n` +
    `- If the named owner is an anonymized brand/handle, did we actually try to break the anonymity? Search Quora/NamePros/LinkedIn/interviews on BOTH web_search and brave_search and OPEN promising hits with read_url to get the real name.\n` +
    `- Is the PRIMARY contact actually the owner — not a marketplace's support line, a privacy/proxy address, or a historical/predecessor registrant? Fix the tiers if so.\n` +
    `- Did the draft attribute the domain to a TRADEMARK HOLDER or a brand operator (often a startup running at <brand>app.com / <brand>.io) without a WHOIS-fingerprint check against the named historical registrant? If the current WHOIS is privacy-shielded AND the claimed current owner is different from the last named historical registrant, WHOIS one of the historical registrant's other known domains and compare registrar + creation/expiry/updated-at + nameservers + state leak. An identical fingerprint (especially updated-at to the second) means the historical registrant still owns it — fix the report. A workaround domain like <brand>app.com is evidence AGAINST the brand owning the bare <brand>.com.\n` +
    `- Does EVERY infrastructure claim about a non-target domain (the suspected operator's <brand>app.com, a sibling TLD, a portfolio domain) come from an actual dns_lookup of THAT domain? If the draft says "<other>.com shares MX/NS/A with <target>.com" or "<other>.com uses <target>.com's mail server", verify by running dns_lookup on <other>.com — if the records don't actually match, the claim is fabricated and must be removed (and any conclusion that rested on it revisited).\n` +
    `- If a likely owner NAME is known but no email, infer the likely address(es) and VERIFY via whoxy_reverse (email=…).\n` +
    `- For each NAMED candidate owner (the primary AND any reachable employee/contact at the owning company), did we exhaust the MULTI-PATH OWNER LOOKUP — rocketreach_search by name+company, by name+location, by company-only, AND web_search/brave_search for "<name>" "<company>" linkedin.com/in/ — to surface a LinkedIn URL? An empty result on one input is NOT a stop signal; reformulate (different company string, drop the title, add the city, swap the search engine) and re-search before concluding the person is unreachable. For every LinkedIn URL surfaced by any path, run rocketreach_lookup by linkedin_url to pull email/phone — do not leave a LinkedIn URL un-looked-up.\n` +
    `- If the owner is a LARGE corporate entity, count the CURRENT named-individual contacts in the report (a current named individual = a real person with a personal linkedin.com/in/<name> URL). HISTORICAL/RETIRED people, HQ switchboards, registrar relay forms, role mailboxes (admin@, dnsadmin@, support@, legal@, ir@), and the corporate linkedin.com/company/<x> page DO NOT COUNT. If the count is < 2, the report is incomplete — DO NOT SHIP IT. Run rocketreach_search with company="<operating company>" (no name) to enumerate the staff index, AND run it again for each of: title="VP", "Director", "Head of", "Chief", "General Counsel", "Corporate Development", "Brand", "Investor Relations", "Domain Administrator". For every LinkedIn URL any of those returns, run rocketreach_lookup linkedin_url=<url> to pull email/phone. Cross-check still-empty functions via web_search "<company> <role> site:linkedin.com/in/". Then add 2–4 CURRENT named individuals (each with their personal LinkedIn URL and the best contact you obtained) to the primary/secondary tiers, clearly tagged with their function. Do NOT accept a "privacy-redacted, no individual administrator named" excuse — that describes the WHOIS, not the publicly-known executive team.\n` +
    `- Did the draft name a REGISTRAR or REGISTRAR-MARKETPLACE BRAND (TurnCommerce/NameBright/HugeDomains, GoDaddy/Domains By Proxy/Afternic, Namecheap/Withheld for Privacy, Sav, Dynadot, Spaceship, Network Solutions, IronDNS, Tucows/OpenSRS, Sedo, etc.) as "the owner" purely because their name appears in the WHOIS / registrar field? That is the privacy/forwarding layer, NOT ownership. Required confirmation before naming them: verify the domain renders as a live listing in THEIR catalog — read_url https://www.hugedomains.com/domain_profile.cfm?d=<domain> (NameBright/TurnCommerce), https://www.afternic.com/domain/<domain> (GoDaddy/Afternic), or the matching retail page for the relevant marketplace. If the page redirects to the marketplace homepage or returns a generic shell, the domain is NOT in that marketplace's catalog — strike the "owned by <registrar>/<marketplace>" conclusion, change the primary contact away from the registrar's sales line, and report the situation as "owner privacy-shielded via <registrar>'s privacy product; not publicly identifiable from WHOIS alone" with the contact path routed through the registrar's WHOIS-relay form.\n` +
    `- If the domain is marketplace-consigned, did we follow the seller-portfolio link (marketplace_check.seller_portfolio) and confirm it with analytics_footprint?\n` +
    `Close any gap you can, then OUTPUT ONLY THE COMPLETE corrected report in the SAME two-part format (the fenced \`\`\`json block first, then the Markdown sections). CRITICAL: output the finished report and NOTHING ELSE — no "Critique", no "Fixes applied", no "the draft listed…", no reviewer notes or commentary about what you changed. The user sees only this text, so it must read as the final clean report. If the draft is already correct, output it unchanged.\n\nDRAFT REPORT:\n\n${draft}` +
    knownNote +
    (hasCorrections
      ? `\n\nUSER-CONFIRMED CORRECTIONS from the refine chat AFTER the draft was written — these are authoritative facts the regenerated report MUST reflect. Apply them: update the json block (likely_owner, owner_type, confidence, contacts, contact_path, timeline) AND the Markdown sections to incorporate every confirmed fact. Drop or rewrite any section of the draft that contradicts them. Where the corrections change the named owner, restructure the entire report around the new owner (the prior owner's threads can be summarized as "historical" or dropped if the corrections explicitly retire them). Verify the corrections with tools where doing so would strengthen the case, but do not contradict them.\n\nCorrections:\n${chatCorrections}`
      : '');

  try {
    const result = await provider.runAgent({
      system: SYSTEM_PROMPT + (lessons || ''),
      history: [],
      userPrompt: critiquePrompt,
      toolSpecs: agentToolSpecs,
      env,
      maxSteps: 4,
      maxToolResultChars: MAX_TOOL_RESULT_CHARS,
      seedTrace: [],
    });
    if (result.report && result.report.trim().length > 200) {
      return { report: result.report, trace: [...priorTrace, ...result.trace] };
    }
    return { report: draft, trace: priorTrace };
  } catch {
    // Keep the original draft if the critique pass fails.
    return { report: draft, trace: priorTrace };
  }
}

// Backwards-compatible wrapper: gather + (deep only) critique, in one call.
// The Inngest pipeline now invokes gather() and critique() as separate steps
// so each gets its own Vercel function-duration budget; this wrapper remains
// for direct callers (e.g. the eval harness) that want the combined result.
export async function research({ domain, question, history = [], env, tier = 'all' }) {
  const gathered = await gather({ domain, question, history, env, tier });
  let report = gathered.report;
  let trace = gathered.trace;
  if (tier === 'all' && env.RESEARCH_CRITIQUE !== 'off') {
    const refined = await critique({ domain, env, tier, draft: report, priorTrace: trace });
    report = refined.report;
    trace = refined.trace;
  }
  return {
    report,
    trace,
    toolsAvailable: gathered.toolsAvailable,
    categories: gathered.categories,
    tier,
  };
}
