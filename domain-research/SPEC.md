# Domain Ownership Research — Product Spec & Architecture

Status: **draft for review**. This is the product backbone derived from the
narrative workflow. It supersedes the current single-loop scaffold's scope (which
covers only the "ownership spine" stage). Nothing here is built yet beyond
Stage 1–3 sources; this document is the plan.

---

## 1. Purpose & scope

Given a domain, produce a **defensible ownership read**: who controls it now, how
ownership has changed over time, the supporting infrastructure/marketplace
evidence, a likely owner classification, a realistic contact path, and a clear
separation of **hard evidence vs inference** with a confidence note.

Two consumers of the output:
1. A clean narrative report (human-readable).
2. A structured evidence store the user can drill into (raw + normalized).

---

## 2. Core architectural decision: deterministic pipeline + LLM synthesis

The current scaffold is a **free-form agent**: one LLM loop decides which tools
to call. That's great for open-ended Q&A but wrong for this product, because the
workflow is a **fixed, ordered pipeline** with strict "ownership sources first,
separate evidence from inference" discipline. Recommendation:

- **Stages 1–6 are deterministic, code-orchestrated.** Code calls each source in
  the prescribed order, stores raw responses, and normalizes them into entities.
  The LLM is used *within* stages only for bounded extraction (e.g. pulling
  analytics IDs out of HTML, normalizing messy WHOIS history into a timeline).
- **Stage 7 (synthesis) is the main LLM step.** It reasons over the normalized
  evidence to produce eras, classification, contact path, and confidence —
  always citing which evidence item supports each claim.

| | Free-form agent (today) | Deterministic pipeline + LLM synthesis (proposed) |
|---|---|---|
| Source ordering | Model's choice | Guaranteed (ownership spine first) |
| Reproducibility | Low | High |
| Evidence/inference split | Hard to enforce | Structural — evidence is collected by code, inference is the LLM's labeled output |
| Cost/latency control | Model can over-call | Code budgets each stage |
| Drill-into-raw | Not captured | Every raw response stored |

**Async, not synchronous.** A full run hits ~3 paid APIs + RDAP/DNS + live-site
fetch + Wayback CDX + up to 5 marketplace checks + comps + an LLM synthesis pass.
That will routinely exceed Vercel's 60s function limit. The pipeline must run as a
**background job** with persisted state and a polling/streaming UI (see §10–11).

---

## 3. Inputs

| Input | Required | Notes |
|---|---|---|
| `domain` | yes | normalized + validated (existing `lib/util.js`) |
| `depth` | no | `quick` (spine only) \| `standard` \| `deep` (+marketplace+comps) |
| `question` | no | free-text focus to bias the synthesis |
| `refresh` | no | bypass cache for this run |

---

## 4. Pipeline stages

Each stage: **purpose → sources → outputs (normalized entities) → evidence emitted → failure handling.** All stages append to a shared `RunContext`.

### Stage 1 — Ownership spine (paid, first)
- **Sources:** DomainIQ (`domain_history`), BigDomainData (`historical`, with pagination + `fuzzy_domains` for related), WhoisXML (current + **history** endpoint).
- **Outputs:** `Registrant`, `Organization`, `Email`, `Nameserver`, `RegistrarEvent`, raw WHOIS-history records.
- **Evidence:** dated registrant/org/email/registrar/NS snapshots.
- **Failure:** any one source can fail; record the gap, continue.

### Stage 2 — Timeline & ownership eras (normalize)
- **Logic (LLM-assisted):** merge Stage 1 records into a single chronological
  timeline of registrant/org/email/registrar/NS/privacy changes; collapse into
  probable **ownership eras** (date range → likely holder + basis).
- **Outputs:** `OwnershipEra[]`, `TimelineEvent[]`.

### Stage 3 — Current status (RDAP + DNS)
- **Sources:** RDAP (`.com`→Verisign, `.net`→Verisign, else `rdap.org`), live DNS (NS, A/AAAA, MX, notable TXT).
- **Outputs:** `CurrentRegistration`, `DnsPosture` (parked / developed / for-sale / email-configured / dead / investor-infra), provider inferences from NS/MX patterns.

### Stage 4 — Live site + source inspection
- **Sources:** `https://` then `http://` fallback.
- **Logic (LLM-assisted extraction):** visible company name, contact pages,
  copyright, emails, phones, social links, business address; **source markup**
  for GA/GTAG/GTM, Meta Pixel, Segment, other analytics IDs, inline comments,
  linked assets.
- **Outputs:** `SiteSignal[]`, `AnalyticsId[]` (these can link a privacy-shielded
  domain to a wider footprint).

### Stage 5 — Wayback reconstruction
- **Sources:** Wayback CDX (earliest snapshot, latest snapshot, major changes), snapshot viewer URLs.
- **Outputs:** `ArchiveSnapshot[]` (timestamp, status, role: company/contact/parked/personal), prior owner names/emails surfaced from old pages.

### Stage 6 — Marketplace footprint (deep)
- **Sources:** Afternic, GoDaddy (search + auction), Sedo, Atom (label-based), DomainScout (login — see open questions).
- **Outputs:** `MarketplaceListing[]` (channel, listed?, price, broker, url), sales posture.
- **Note:** most are HTML, not JSON APIs → needs fetch + parse (and ToS review). See §12.

### Stage 7 — Comps / valuation (secondary)
- **Sources:** NameBio (search/filter), Appraise.net (certificate), optional Atom appraisal.
- **Outputs:** `Comp[]`, `Valuation` — supporting context only, never drives ownership conclusion.

### Stage 8 — Synthesis engine (main LLM pass)
- Reasons over all normalized evidence to produce: owner classification, contact
  path, evidence-vs-inference breakdown, confidence. See §6.

---

## 5. Source stack reference (verified URL patterns)

From the supplied source-stack spreadsheet. `API_KEY`/`example.com`/`TIMESTAMP`/`CERT_ID` are placeholders.

| Source | Category | Pattern |
|---|---|---|
| DomainIQ | Ownership | `…/api?key=API_KEY&service=domain_history&domain=example.com&output_mode=json` (`&limit=N` optional) |
| BigDomainData | Ownership | current: `…/?key=API_KEY&current_whois=example.com`; historical: `…/?key=API_KEY&database=historical&domain_name=example.com&page_size=100&page=N`; fuzzy: `&fuzzy_domains=example.com`; keyword: `&database=current&domain_keyword=example` |
| WhoisXML | Ownership | current: `…/whoisserver/WhoisService?apiKey=API_KEY&domainName=example.com&outputFormat=JSON&preferFresh=1`; history: `https://whois-history.whoisxmlapi.com/api/v1?apiKey=API_KEY&domainName=example.com&mode=purchase&outputFormat=JSON&maxRecords=100[&sinceDate=YYYY-MM-DD]` |
| RDAP | Current | `.com`/`.net`: `https://rdap.verisign.com/{com,net}/v1/domain/example.com`; else `https://rdap.org/domain/example.com` |
| Wayback CDX | Archive | `https://web.archive.org/cdx/search/cdx?url=example.com&output=json&filter=statuscode:200&collapse=digest[&limit=1][&reverse=true]`; viewer: `https://web.archive.org/web/TIMESTAMP/https://example.com/` |
| Live site | Live | `https://example.com` → fallback `http://example.com` |
| Afternic | Marketplace | `https://www.afternic.com/domain/example.com` |
| GoDaddy | Marketplace | search `…/domainsearch/find?domainToCheck=example.com`; auction `…/domain-auctions/example.com` |
| Sedo | Marketplace | `https://sedo.com/search/details/?domain=example.com` |
| Atom | Marketplace | `https://www.atom.com/name/example` (label, not full domain) |
| DomainScout | Tracking | `https://www.domainscout.io/domain/example.com` (auth: login/dashboard) |
| NameBio | Comps | `https://www.namebio.com/?s==example` (filters: `?tld=.com&price_min=5000`) |
| Appraise.net | Valuation | `https://appraise.net/certificate?id=CERT_ID` |
| DNS/NS/MX | Infra | direct DNS lookups (no single URL) |

---

## 6. Synthesis engine

**Owner classification taxonomy:** `active_operating_company` · `dormant_former_operator` · `individual_founder_smb` · `domain_investor_portfolio` · `brokered_marketplace_only` · `ambiguous_privacy_shielded`.

**Contact-path priority:** (1) direct registrant (historical/current) → (2) company contact from live site/archive → (3) broker/marketplace inquiry → (4) registrar/abuse/forwarding.

**Evidence vs inference (structural):** every `EvidenceItem` is collected by code
with a source + timestamp and tagged `hard` | `signal`. Every `Inference` is the
LLM's labeled conclusion that **must reference the evidence IDs** it rests on.
The report renders these in separate blocks.

**Confidence scoring (transparent, rule-assisted):** start from evidence
coverage and recency, then let the LLM adjust with a written rationale.

| Factor | Effect |
|---|---|
| Current registrant exposed (not privacy) | +strong |
| Consistent registrant across ≥2 ownership sources | +strong |
| Analytics ID / archive link ties to a named entity | +moderate |
| Only privacy-shielded + parked + marketplace-listed | −/ambiguous |
| Sources disagree on registrant/era | −, lower confidence, note conflict |

Output band: `High` / `Medium` / `Low` + one-paragraph note.

---

## 7. Data model (normalized entities)

Store **raw responses** (per source, per run) *and* normalized entities so the UI
can drill from a conclusion down to the bytes that justified it.

```
Run            { id, domain, depth, status, created_at, finished_at, error? }
RawResponse    { id, run_id, source, url, status_code, body, fetched_at }
Registrant     { id, run_id, name?, org_id?, email_id?, source_ids[], first_seen, last_seen, privacy:bool }
Organization   { id, run_id, name, source_ids[] }
Email / Phone  { id, run_id, value, source_ids[] }
Nameserver     { id, run_id, host, first_seen, last_seen, provider_guess? }
RegistrarEvent { id, run_id, registrar, event:'creation'|'transfer'|'update'|'expiry', date }
TimelineEvent  { id, run_id, date, kind, from?, to?, source_ids[] }
OwnershipEra   { id, run_id, start, end?, likely_holder, basis, source_ids[] }
SiteSignal     { id, run_id, kind:'company'|'email'|'phone'|'social'|'address'|'copyright', value, source_id }
AnalyticsId    { id, run_id, type:'ga'|'gtm'|'meta_pixel'|'segment'|'other', value, source_id }
ArchiveSnapshot{ id, run_id, timestamp, status, role?, note?, url }
MarketplaceListing { id, run_id, channel, listed:bool, price?, currency?, broker?, url, source_id }
Comp           { id, run_id, name, price, date, source_id }
Valuation      { id, run_id, estimate?, basis, source_id }
EvidenceItem   { id, run_id, tag:'hard'|'signal', statement, source_ids[] }
Inference      { id, run_id, statement, evidence_ids[], confidence:'high'|'med'|'low' }
Report         { run_id, ...rendered schema in §8 }
```

---

## 8. Report schema

```jsonc
{
  "domain": "example.com",
  "current_state_summary": "string",
  "registration": { "registrar": "", "creation": "", "expiry": "", "updated": "" },
  "dns_posture": { "nameservers": [], "mx": [], "classification": "parked|developed|for_sale|email|dead|investor" },
  "live_site": { "status": "", "company": "", "signals": [], "analytics_ids": [] },
  "ownership_timeline": [ { "date": "", "kind": "", "detail": "" } ],
  "ownership_eras": [ { "range": "", "likely_holder": "", "basis": "" } ],
  "archive_findings": [ { "timestamp": "", "role": "", "note": "" } ],
  "marketplace": [ { "channel": "", "listed": true, "price": "", "url": "" } ],
  "valuation_context": { "comps": [], "note": "" },
  "owner_classification": "domain_investor_portfolio",
  "contact_path": [ { "rank": 1, "method": "", "detail": "" } ],
  "evidence": [ { "tag": "hard", "statement": "", "sources": [] } ],
  "inference": [ { "statement": "", "evidence": [], "confidence": "med" } ],
  "confidence": { "band": "Medium", "note": "" }
}
```

---

## 9. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/research` | POST | Enqueue a run; returns `run_id` immediately (async). |
| `/api/research/:id` | GET | Run status + partial/finished results (for polling). |
| `/api/research/:id/stream` | GET (SSE) | Stage-by-stage progress + final report. |
| `/api/research/:id/raw/:rawId` | GET | A single stored raw response (drill-down). |
| `/api/chat` | POST | Follow-up Q&A grounded in a run's stored evidence. |

(Today's synchronous `/api/research` becomes the `quick` path or is replaced by the enqueue+poll model.)

---

## 10. UI views

1. **Search** — domain + depth selector.
2. **Run progress** — live stage checklist (spine → timeline → current → site → archive → marketplace → comps → synthesis).
3. **Report** — rendered §8 schema, with **Evidence** and **Inference** in visually distinct blocks and a confidence badge.
4. **Evidence drill-down** — click any cited fact → see the raw source response.
5. **Follow-up chat** — ask questions; answers grounded in stored evidence (existing follow-up box, upgraded).

---

## 11. Architecture mapping (onto current Vercel app)

- **Orchestrator** (`lib/pipeline/`): runs stages in order against a `RunContext`; each stage is its own module with a `run(ctx)` signature (mirrors today's pluggable `lib/sources/` pattern).
- **Background execution:** Vercel functions cap at 60s, so a full run needs a queue/worker. Options to decide (see §12): Vercel Cron + a job table, an external worker, or a durable queue. Quick runs (spine-only) can stay synchronous.
- **Persistence:** raw + normalized + report. Vercel KV (already added for rate-limiting) suits run-state/caching; relational storage (e.g. Postgres) suits the entity graph and drill-down. **Backend choice is an open decision.**
- **LLM usage:** the existing dual-provider adapters (`lib/llm/`) are reused — but called for **bounded extraction** (HTML→IDs, WHOIS→timeline) and the **synthesis pass**, not free-form tool selection. Prompt caching on the synthesis system prompt still applies.
- **Caching:** key raw responses by `(source, domain)` with a TTL to cut cost/latency on repeat lookups.

---

## 12. Build phases (incremental, post-spec)

1. **P1 — Pipeline skeleton + persistence**: `RunContext`, run table, enqueue+poll routes, stage runner; port existing spine sources into Stages 1/3/5.
2. **P2 — Normalization + timeline/eras** (Stage 2) and the **synthesis engine** (Stage 8) with evidence/inference + confidence; new report schema + report UI.
3. **P3 — Live-site + source inspection** (Stage 4) incl. analytics-ID extraction; WhoisXML history endpoint.
4. **P4 — Marketplace footprint** (Stage 6) + comps/valuation (Stage 7).
5. **P5 — Evidence drill-down UI + grounded follow-up chat.**

---

## 13. Decisions (resolved)

1. **Marketplace + DomainScout access.** Best-effort fetch + **content parse** for
   a real for-sale signal (price / "Buy Now" / "Make Offer"), not just HTTP 200.
   v1 set: **Afternic, GoDaddy, Atom, Sedo**, plus **Efty as a live-site lander
   fingerprint** (Stage 4). **DomainScout deferred** (needs login) to a later phase.
2. **Persistence.** **Supabase (Postgres)** is the system of record for runs +
   normalized entities + raw responses (enables drill-down and cross-domain
   footprint queries). Vercel **KV** stays for the rate limiter and optional
   response caching.
3. **Execution model.** Everything async; runs may take 5–20+ min. Vercel
   functions can't hold a job that long, so a **job framework (Inngest)** runs the
   pipeline as durable steps; the API enqueues and returns a `run_id`; the UI
   polls/streams. Inngest functions deploy inside the Vercel app (`/api/inngest`).
4. **Cost controls + auth.** Per-run cap (max paid-API calls + max LLM tokens) to
   bound spend. **Simple shared-password gate**; tool hosted at
   **research.snagged.com** (internal). Rate limiter is a backstop.
5. **Compliance.** Loose — internal use. No special WHOIS/PII handling; just never
   persist API secrets in the data.

Still open: confirm an **Efty listing-page URL pattern** if one exists (else it
stays a live-site fingerprint); when to bring **DomainScout** back in.

---

## 14. Risks

- Marketplace scraping is brittle and may breach ToS / trip anti-bot.
- Paid-API cost scales with deep-run volume; needs caps + caching.
- LLM synthesis must not fabricate registrants — enforced by the evidence/inference split and "never invent" prompting.
- 60s function limit makes the naive synchronous design fail on deep runs (→ async).
