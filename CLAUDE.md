# Domain Owner Research — Working Rules & Project State

Source of truth for any Claude Code session picking up work on this repo. **Read this first.** The SessionStart hook will surface it on every new session.

---

## Working rules — read before committing

1. **Feature branches, not `main`.** Develop on `claude/<your-session-slug>` (Claude Code on the web names one automatically). Merge into `main` only at a clean, tested checkpoint. **`main` deploys directly to production (research.snagged.com) with no preview** — every push to main is an immediate live deploy.
2. **`git fetch` before any work.** The SessionStart hook does this and warns if your branch is behind. If it warns: read the new commits (`git log --oneline HEAD..origin/main`) before changing anything, or you'll duplicate work or conflict with another session.
3. **One session is primary.** If multiple sessions are open on this repo, designate one as the merger; others stay on their own feature branches and don't push to `main` without coordination.
4. **Push often.** A frozen session loses chat memory but not pushed work. Commit + push at every reviewable checkpoint.
5. **Decisions live in the repo, not chat — update memory EVERY checkpoint.** When you ship a feature/fix, add or update its `CLAUDE.md` section **in the same commit as the code** (code + memory ship together). Don't let more than one shippable change go by without a memory note. The chat transcript is NOT a backup — if a session dies (or an account is suspended), only what's committed here survives. Keep sections concise: what it does, the key files, the gotchas, any one-time setup.
6. **Don't reinvent existing sources.** ~26 sources are already wired in `domain-research/lib/sources/index.js`. Check there before adding a new one.
7. **Data tables are SORTABLE by default (Rob, 2026-08-10).** Every data table gets click-to-sort column headers — don't ship a static table and wait to be asked. Pattern: numeric columns default to descending (high-first), string columns ascending, blanks last, active header shows ▲/▼; client-side over the loaded rows, and any CSV export respects the active sort. (Same rule in the admin repo.)
8. **ALWAYS deep-link SQL to run AND Actions to dispatch, on GitHub — and NAME THE EXACT PROJECT (Rob, 2026-08-28).** Whenever a change needs Rob (or an admin) to run SQL / a migration OR dispatch a GitHub Action, give the GitHub deep-link, not just a path/name. **For SQL, ALWAYS state the EXACT Supabase project** — there are FOUR separate ones (research/main `SUPABASE_URL`, naming `snagged-naming-universe`, master `Master Domain Name List`, zone `snagged-zone-index`) and it's easy to run in the wrong one (0022 got run in naming instead of research once → tables in the wrong project, nothing populated). Name it, e.g. "run on the **research** project (the one with the other `domain_research_*` tables — NOT snagged-naming-universe)". SQL file: `https://github.com/snaggeddomains/domain-owner-research/blob/main/<repo-relative-path>`. Action: `https://github.com/snaggeddomains/domain-owner-research/actions/workflows/<file>.yml` (links straight to Run-workflow). Admin repo: swap the base to `.../snagged-admin/…`. This extends to **any repo file/artifact** Rob needs to open/run/review on GitHub (a script, config, migration, PR, `.../commit/<sha>`) — default to a clickable GitHub URL, never a bare path/name. Commit + push the file FIRST so the `main` link resolves. (Same rule in the admin repo.)

---

## Ahrefs Report — website deep-dive (2026-08-06)

A Reports-section tool (`/research/ahrefs`, gated `ahrefs`) that pulls a comprehensive
website deep-dive from the **Ahrefs Site Explorer API v3** for one domain: overview (Domain
Rating + Ahrefs rank, organic traffic + traffic value + keywords, live backlinks + referring
domains), a **monthly organic-traffic history** with per-week/month/quarter/year rollups +
MoM/YoY deltas + an inline bar chart, traffic **by country**, the **organic keywords** it ranks
for, its **top pages**, **referring domains**, and **organic competitors**.

- **Client** `lib/ahrefs.js` (dependency-free, `fetchJson`, base `https://api.ahrefs.com/v3/
  site-explorer`, auth `Authorization: Bearer <AHREF_API_KEY>` — also accepts `AHREFS_API_KEY`).
  `ahrefsConfigured(env)`; `ahrefsOne(domain,env)` (metrics + domain-rating, for the Sales Hub
  prominence chip); **`ahrefsReport(domain,env,{country})`** = the full report — every section an
  independent, **fail-open** call (a section that errors is omitted + noted in `errors[]`), run in
  parallel. Endpoint/param/column names + JSON wrapper keys were verified against the v3 docs
  (`metrics`/`domain-rating`/`backlinks-stats`/`metrics-history`/`metrics-by-country`/
  `organic-keywords`→`keywords`/`top-pages`→`pages`/`refdomains`/`organic-competitors`→`competitors`).
  List endpoints REQUIRE an exact `select` column list (a wrong column 400s just that section).
  **⚠️ Cost fields (`org_cost`/`cpc`/`value`) are assumed USD CENTS (÷100 to $) per the docs —
  verify the magnitude on the first live run** (if values look 100× off, drop the `cents()` divide).
- **API** `api/ahrefs.js` (gated `ahrefs`; admins auto-pass; maxDuration 60): `GET ?domain=&country=us&refresh=1`
  → the report; `GET ?list=1` → recent. **Cache-first by DOMAIN** (kind `ah` in
  `domain_research_tool_lookups`) so a re-view is instant + never re-spends; `refresh=1` forces.
  503 if `AHREF_API_KEY` unset. Only caches a report that returned data (never an all-errors miss).
- **UI** (`public/app.js` `ahrefs*` helpers — `ahrefsLookup`/`renderAhrefs`/`ahSpark`/`ahNum`/
  `ahrefsCsv`; `#view-ahrefs` + `#nav-ahrefs` in the **Reports** nav group; `.ah-*` styles):
  DR badge + stat cards + traffic-trend cards + SVG bar chart + keyword/pages/refdomains/
  competitors/country tables + per-section CSV (keywords, refdomains) + a ↻ Refresh button.
  `VIEW_SECTION.ahrefs='reports'`; `topbar-reports` also shows for an ahrefs-only user. Cache-bust
  `?v=20260806ahrefs`.
- **Also feeds the Sales Hub prominence** — `handleProminence` (`api/sales.js`) now returns Ahrefs
  `traffic`/`dr` per target alongside Open PageRank; the target card shows a **📈 <traffic>/mo · DR**
  chip, an "Organic traffic (Ahrefs)" sort, and Ahrefs columns in the CSV (OPR stays the free fallback).
- **Permission:** `research.ahrefs` (module, group Reports, stored flat as `ahrefs`) in snagged-admin
  `dashboard/lib/permissions.ts` (MODULES + REPORTS_TABS + CATALOG). Grant per-user; admins auto-pass.
- **Setup:** set `AHREF_API_KEY` in the research Vercel project (done). No new table (reuses
  `domain_research_tool_lookups`). **Verify field shapes on first live run** — built + probed
  against the docs but not run authenticated from the sandbox (key is Vercel-only).

---

## Add to Pipedrive — buy-side deal button on research surfaces (2026-07-20)

**2026-07-21 — Pipedrive DROPPED for a native in-house CRM (snagged-admin "Deals" module).**
The button + drawer are UNCHANGED here (still labeled "Add to Pipedrive" — a cosmetic rename
is a pending follow-up), but the admin internal endpoint it POSTs to (`/api/internal/pipedrive-deal`,
path kept) now creates a NATIVE deal on the admin Deals board instead of a Pipedrive deal, and
returns that deal's URL. Everything below still describes the research-side wiring accurately.

An "➕ Add to Pipedrive" button on three surfaces turns a domain into a tracked buy-side
deal. The deal record + board live in snagged-admin; this app is a thin, gated proxy.

- **Cross-app client** `lib/pipedrive.js`: `pipedriveConfigured()`, `pipedriveMeta()` (GET
  assignable owners + Source/Channel labels), `createBuyDeal(input)` (POST). Calls admin's
  `/api/internal/pipedrive-deal` server-to-server with `x-internal-secret ==
  RESEARCH_INTERNAL_SECRET` (same pattern as `lib/email/threads.js`). Env `ADMIN_INTERNAL_BASE`
  (default `https://app.snagged.com`). Both unset → the button hides (503).
- **API** `api/pipedrive.js` (gated by the `pipedrive` module perm; admins auto-pass):
  `GET` → drawer metadata; `POST {domain, source, assigneeEmail?, priority?, buyerName?,
  buyerEmail?, budgetRange?, reportLink?, appraisalValue?, …}` → `{ok, dealId, created, url,
  notified}`. Domain + source required; numeric/string fields sanitized; `withCategory('pipedrive')`.
- **UI** (`public/app.js`): `canPipedrive = can('pipedrive')`. Three launchers —
  (1) **owner report** header button `#pipedrive-btn` (`openPipedriveFromReport`, attaches the
  report's public share link); (2) **whois** + (3) **appraisal** inline buttons injected via
  `pipedriveInlineBtn(domain, surface, {appraisal})` (whois share row + appraisal `.ap-meta`),
  opened by a delegated `[data-pd-open]` click handler. Shared slide-over `#pipedrive-drawer`
  (reuses the `.od-*` outreach-drawer styles) collects an **editable Target domain** (`#pd-target-domain`,
  prefilled from the surface's domain — added 2026-07-22 so the drawer's field set matches the admin
  Buy-Side Inquiries convert modal exactly) + source/assignee/priority/buyer/budget →
  `submitPipedrive()` (reads the editable domain, not the ctx) → shows "✓ Added — open the deal ↗". Assignee dropdown is the ACTIVE
  Pipedrive users only (so you never assign to someone the deal can't route to; blank =
  Unassigned / Inbox). `.pd-*` styles in styles.css. Cache-bust `?v=20260720pipedrive`.
- **Lead dossier button too (2026-07-20).** The inbound-lead dossier (`#/lead/<key>`,
  `renderLead`) also gets an Add-to-Pipedrive button — `pipedriveCtxFromLead` prefills the drawer
  from the parsed inquiry (buyer name/email, budget, the primary domain + the rest as
  additionalDomains, the on-file report share link) and a triage-suggested assignee (tier VIP→Rob /
  Notable→Brian) with source defaulted to "Website form". This is the buy-side triage convert from
  the research side; the admin **Deals → Buy-Side Inquiries** queue is the dedicated list version
  (snagged-admin `lib/inquiries.ts` + `app/deals/inquiries/`).
- **"TBD" placeholder domain + no more 500 (2026-07-29).** A buy-side inquiry can be added as a deal
  with NO chosen name yet — the drawer's Target domain accepts **"TBD"** (or blank), which passes
  through as the literal placeholder `TBD` (admin `createDeal` stores it lowercased; edit the target
  domain later to re-link research/appraisal). Root-cause fix in `api/pipedrive.js` POST:
  `cleanDomainInput(body.domain)` ran OUTSIDE the try/catch, so a dotless/invalid value (e.g. "TBD")
  made `cleanDomainInput` THROW → the whole function 500'd → the UI showed an opaque **"create 500"**.
  Now: blank/`TBD` → `domain='TBD'`; otherwise `cleanDomainInput` is wrapped and an invalid entry
  returns a clean 400 ("Enter a full domain … or 'TBD' …"), never a 500. Idempotency stays domain+buyer,
  so two TBD inquiries from the same buyer merge into one deal.
- **Lead dossier polish (2026-07-22).** (1) The dossier prose (overview / standing / highlights /
  the buyer's quoted message) is run through `linkifyLead` in `renderLead` — auto-links URLs,
  emails, bare domains (curated TLD set), and **@social-handles** (e.g. an Instagram
  `@_nevaehthompson` → instagram.com, or the matching known `social[]` profile URL) so they're
  real hyperlinks, not plain text. (2) The dossier's **Add-to-Deal launcher flips to "🔗 View
  Deal"** when a deal already exists for the inquired domain — `updateLeadDealButton(el, domain)`
  checks `GET api/pipedrive?domain=` (same `data.deal.url` the report header uses); the
  `[data-pd-lead]` click opens the deal instead of the drawer. Cache-bust `?v=20260722leadlinks`.
- **New buy-side inquiry → triage notification (2026-07-22; email dropped 2026-08-04).**
  `api/lead-enrich.js` POST (the Zapier "New Submission" hook) pings the triage team the moment a
  NEW buy-side inquiry lands: `notifyTriageOfInquiry` drops an in-app **bell** (`createNotification`,
  kind `inquiry`, link `/research/#/lead/<key>`) for every user who can triage (`userCan(u,'pipedrive')`
  OR admin), best-effort. Gated to **new** leads only (`getLeadByKey` before upsert — a
  re-submission/enrichment re-run never re-pings) AND buy-side intent only (`looksBuySide`, mirrors
  the admin queue). **No EMAIL (Rob 2026-08-04):** the inbound inquiry email already lands in the
  inbox, so a second "new inquiry" email was redundant — `notifyTriageOfInquiry` now bells only
  (dropped the `sendEmail` job + the unused `esc`/`email.js` import). The ONLY follow-up email is the
  deal-**assignment** notification (snagged-admin `lib/deals/notify.ts` `notifyAssignment`, from
  `deals@snagged.com`) once someone picks the deal up. No new env/table (reuses
  `domain_research_notifications`).
- **"How did you hear about us?" auto-carried (2026-08-02).** `pipedriveCtxFromLead` reads the lead's
  `form.heard_about` (fallback `form.source`) and `submitPipedrive` passes it as `heardAbout` in the
  POST; `api/pipedrive.js` forwards it to the admin internal endpoint → `deals.heard_about`.
  `lead-enrich.js` `readForm` now captures `heard_about` into the lead `form` jsonb so future inquiries
  have it. Cache-bust `?v=20260802hdyhau`. (Admin side + backfill: snagged-admin CLAUDE.md "How did you
  hear about us?".)
  - **Now a VISIBLE, editable drawer field (2026-08-10).** The Add-to-Deal drawer gained a **"How did
    you hear about us? (optional)"** input (`#pd-heard`, between Budget and Comment) — `openPipedrive`
    prefills it from `ctx.heardAbout` (the lead's `form.heard_about`), and `submitPipedrive` reads the
    FIELD (falling back to `pipedriveCtx.heardAbout`) instead of only the silent ctx value. So a
    dossier-convert shows the carried attribution and you can edit/add it; a report-surface convert (no
    lead) starts blank + fillable. Same downstream path (`heardAbout` → `deals.heard_about`). Cache-bust
    `?v=20260810pdheard`.
- **Buyer's inquiry message → deal Notes (2026-08-04).** `pipedriveCtxFromLead` carries the lead's
  `message` + `location`; `submitPipedrive` assembles them into `📩 Buyer's inquiry:\n<message>` and sends
  it as `notes`; `api/pipedrive.js` forwards `notes` to the admin internal endpoint → `deals.notes`. So a
  dossier-converted deal shows the buyer's own words (why they want it) in Details, not just buried in the
  ingested email. Report-surface converts (no lead) send empty. Cache-bust `?v=20260804inqnotes`.
- **Free-text Comment field on the drawer (2026-08-05).** The Add-to-Deal drawer (`#pipedrive-drawer`)
  now has a **Comment (optional)** textarea (`#pd-comment`, cleared per open). `submitPipedrive` sends
  it as `comment`; `api/pipedrive.js` forwards it + `actorEmail` (the research user) to the admin
  internal endpoint, which posts it as the deal's **first COMMENT** on the timeline (`addActivity`
  kind=comment) — separate from the auto-filled Notes (buyer's inquiry), so pretext reaches whoever
  picks the deal up. The admin board New-deal modal + the inquiry triage convert modal have the same
  field. Cache-bust `?v=20260805dealcomment`. (Admin side: snagged-admin CLAUDE.md.)
- **Permission:** `research.pipedrive` (module) added in snagged-admin `dashboard/lib/permissions.ts`
  (MODULES + CATALOG, group Research; stored flat as `pipedrive`). Grant per-user; admins auto-pass.
- **One-time setup:** none new — reuses `RESEARCH_INTERNAL_SECRET` + `ADMIN_INTERNAL_BASE`
  (already set) and the admin-side Pipedrive setup (pipeline/stages/fields, applied 2026-07-20).

## Internal-owner call-out on the Domain Owner report (2026-08-05)

When OUR OWN database already attributes an owner to the domain, the report now LEADS with a
prominent banner (`#internal-owner`, above the for-sale strip) instead of burying it in the DB
Screen / narrative prose — an internal record (e.g. Master Domain List owner "Amanda Waltz",
source=snagged, for final.com) is a first-class ownership signal Rob didn't want missed.
- **Endpoint** `api/db-owner.js` — SLIM read of BOTH corpora, deliberately gated by **`domain_owner`**
  (the report's own perm, NOT `dbsearch`) so every report viewer sees the call-out; the full field
  dump stays on the DB Screen. `GET ?domain=` → `{owner, corpus, source, price, ownedByUs, master,
  universe}`. Master: exact `.ilike` → `owner/source/price`. Universe: exact `.eq('domain')` (the
  b-tree index — `.ilike` would seq-scan millions) → owner DERIVED from an owned-feed source
  (`OWNER_BY_SOURCE`: snagged_snap/berserk→Snagged, rob_purchases→Rob Schutz, mirrors
  `lib/sources/universe_ownership.js`). Headline owner = a named Master owner FIRST, else an
  owned-feed universe owner. `ownedByUs` = Snagged/Rob or universe `source_tier===1`. Read-only,
  fail-open (a corpus that errors → null; no banner).
- **UI** (`public/app.js`): `loadInternalOwner(domain)` (kicked from `renderReport`, next to
  `loadCompanyVitals`) → `renderInternalOwner` paints `#internal-owner` ONLY when our DB names an
  owner. `.io-*` styles (coral banner; green `.io-owned` variant + "owned by us" tag when
  `ownedByUs`); shows owner + corpus + source + our price + a "DB Screen ↗" link. Hidden in the
  report-reset paths. Cache-bust `app.js`/`styles.css` `?v=20260805intowner`.
- **No new table / permission / env** — reuses the Master + naming DB creds already set.

## Registrar registrant-contact relay in the report contact path (2026-08-11)

When a domain is privacy-walled and we have no solid DIRECT owner lead, the report's
**Recommended Contact Path** now routes to the registrar's **precise ICANN registrant-contact
relay** (e.g. IONOS → `https://registrar.ionos.de/domains_raa/privacy?market=us_EN`, GoDaddy →
its `contactDomainOwner` form, MarkMonitor → `whois-webform.markmonitor.com/whois/<domain>`)
instead of a generic registrar homepage. Every registrar on Rob's "Whois privacy" sheet
is covered, with the real domain substituted into the form's `domain.com` placeholder.
- **Map** `lib/registrarContact.js` — `CONTACTS` (67 registrars → contact-form URL and/or
  privacy-proxy email, transcribed from the sheet
  `docs.google.com/spreadsheets/d/15-pbi-xnB9YDGlxwgxJZtGzo5Njct9aMamcxoghpxAI`, tab "Whois
  privacy") + `registrarContactFor(registrar, domain)` which resolves an RDAP/WHOIS registrar
  (`{name, ianaId}`) to its row via a `PATTERNS` regex table ("GoDaddy.com, LLC"→Godaddy,
  "IONOS SE"→IONOS…), an `IANA` id backstop for the big ones, and a normalized-name fallback,
  then fills the real domain into the `domain.com`/`<domain.com>`/`domain.ru` placeholder.
  Returns `{registrar, url?, email?}` or null (registrar not on the sheet → no relay, e.g.
  Namecheap isn't listed). **To update: re-read the sheet + edit `CONTACTS`/`PATTERNS`.**
- **Wiring** `lib/agent.js` `gather()`: after the pre-run seeds, a deterministic
  `whoisLookup(domain)` resolves the registrar → `registrarContactFor` → a **seed fact** ("REGISTRANT-
  CONTACT CHANNEL …") instructing the agent to put this EXACT relay in `contact_path` whenever the
  owner isn't solidly identified (privacy-shielded / marketplace_only / Medium-Low confidence), and
  a matching line was added to the SYSTEM_PROMPT's REGISTRAR ≠ OWNER rule. Fail-open (any error just
  omits the seed). Flows downstream into the outreach draft too (it reads `contact_path`).
- **No new table / permission / env** — the sheet content is baked into the module (static list);
  it uses the free RDAP/WHOIS path already in the app. Verified live: zcashlabs.com→IONOS relay,
  google.com→MarkMonitor form with the domain filled in.

## Whois tool — block-format ccTLD parsing + live-DNS nameserver fallback (2026-08-27)

The free Whois lookup returned a THIN card for `.it` (infin.it: registered date + status + MX
only — no expiry / nameservers / registrar / DNSSEC), while raw `whois.nic.it` has all of it.
Root cause: **`.it` isn't in IANA's RDAP bootstrap and rdap.org 404s it** → RDAP returns nothing
(the 404 even briefly reads as "available"; the WHOIS `created` date rescues it), so the whole
record must come from the port-43 WHOIS leg — but `lib/sources/whois.js` `parseFields` was written
for the **standard ICANN gTLD format** (`Registry Expiry Date:`, `Name Server:`, `Registrar:`) and
couldn't read nic.it's **block format** (`Expire Date:`, a `Nameservers` header + indented bare
hostnames, a `Registrar` block whose name is a nested `Organization:`). Fixes:
- **`parseFields` is now SECTION-AWARE** (`lib/sources/whois.js`): a non-indented value-less block
  header (`Registrant`/`Registrar`/`Nameservers`/`Admin Contact`/`Technical Contacts` — `SECTION_HEAD`)
  opens a section; indented sub-fields are stored BOTH bare (last-wins, unchanged) AND section-qualified
  (`registrar organization`, `registrant organization`) so a block's generic `Organization:`/`Name:`
  no longer collides across blocks; **bare indented hostnames under a Nameservers block are captured
  as NS**. Standard gTLD lines carry a value on the same line, so they never match `SECTION_HEAD` and
  parse exactly as before (regression-tested).
- **Widened the date getters**: `expires` also reads `expire date`/`expiry`/`expire`/`expiration time`/
  `paid-till`; `updated` reads `last update`/`changed`; registrar prefers `registrar organization` (the
  display name) over `registrar name` (nic.it's internal `REGISTRAR-EU-REG` code). New `dnssec` field
  (`dnssecBool`) reads the WHOIS `DNSSEC:` line. Literal redaction tokens (`hidden` — nic.it's convention,
  `redacted`/`n/a`) in the name/org now read as **privacy-protected** (`REDACT_TOKEN_RE`, exact-match so
  "Hidden Valley LLC" isn't false-flagged).
- **Always-on live-DNS nameserver fallback** (`lib/whois/lookup.js`): when neither RDAP nor WHOIS
  yields nameservers, a DoH `NS` lookup fills them in — so nameservers show for ANY registry format
  (verified: infin.it → pns21/pns22.cloudns.net). Also merges the WHOIS-derived DNSSEC when RDAP has none.
- Extracted `parseWhoisText`/`deriveRecord` (exported) so the registry-format parsing is unit-tested
  without the network. Verified: nic.it now yields registrar "Hosting Concepts B.V." / expiry 2026-08-24 /
  DNSSEC true / both NS / privacy; standard `.com` unchanged. Backend-only (UI `renderWhois` already
  renders every row when present) — no cache-bust. **NB port-43 WHOIS can't be run from the sandbox
  (443-only egress); the `.it` end-to-end only exercises live on Vercel** — the parser is unit-verified
  against the real nic.it format and the DoH fallback is live-verified.

## Internal kick-research endpoint (2026-07-22)

`api/internal/kick-research.js` — server-to-server, `x-internal-secret == RESEARCH_INTERNAL_SECRET`
(same pattern as `internal/valuate.js`). `POST {domain}` → dedupes against existing
queued/running/done runs (or an errored run that still saved a pre-flight report) and, if none,
`createRun` + `inngest.send(RUN_REQUESTED, {phase:'shallow'})` → returns `{ok, runId, existed}`.
Kicks the **free pre-flight** pass only (no paid credits). Mirrors the `prewarmDomainReport` the
inquiry intake already does. Consumed by snagged-admin's Deals CRM so a manually-added deal gets a
Domain Owner report to auto-link (see admin CLAUDE.md "Auto-research + dossier links").

`api/internal/report-summary.js` — same auth. `GET ?domain=` → `{ok, likely_owner, owner_type,
owner_contact, summary, appraisal:{mid,low,high}|null}`. Owner fields = newest DONE run's report
PART-1 via `summarizeReport` (`lib/reportSummary.js`) + best email/phone from `contacts[]`
(primary tier first); appraisal = cache-first `appraisalOnly`. All fail-open to null. Lets the
admin Deals sidebar auto-fill likely owner / owner contact / appraisal once research has run.

## Owner-research triangulation sources — CT logs, email infra, reverse-analytics, corp registry, Hunter (2026-08-08)

Five new sources in `lib/sources/` to crack privacy-walled owners + expand an owner's footprint. Two are
FREE and auto-seed on EVERY report (added to `preRun` in `lib/agent.js`, so their results anchor the report
and they're removed from the model's tool list); three are key-gated + deep-pass only (in the `PAID` set for
tier-gating + quota control). All registered in `lib/sources/index.js` (ALL + PAID + CATEGORY + usageMeters);
the agent SYSTEM_PROMPT gained a bullet per source (right after the ns_siblings triangulation bullet).

- **`cert_transparency` (crtsh.js) — FREE, keyless, auto-seeded.** Certificate Transparency: every TLS cert a
  domain used is public, so it can't be privacy-walled. Returns the domain's own **subdomains** (what they run)
  + **related_domains** = OTHER registrable domains that shared a cert with the target (strong same-operator
  signal → pivot to a sibling with public WHOIS). **Two providers for resilience: crt.sh first (3 retries,
  best coverage, no cap) → falls back to SSLMate Certspotter** (crt.sh 502s constantly). Optional
  `CERTSPOTTER_API_KEY` raises the fallback limit. Verified live: stripe.com → link.com / stripecdn.com /
  stripe.network (all Stripe-owned).
- **`email_infra` (emailinfra.js) — FREE, keyless (node:dns), auto-seeded.** Parses MX/SPF/DMARC into owner
  hints: MX provider, non-generic SPF `include:` hosts, and the **DMARC rua/ruf reporting addresses** (real
  owner-controlled mailboxes that often name the operating company even under WHOIS privacy → `operator_domain_hints`).
  Also flags marketplace verification TXT tokens (afternic-verification, etc.) tying the domain to a seller
  account. Verified live: snagged.com → Google Workspace, DMARC p=quarantine, rua parsed.
- **`reverse_analytics` (reverseanalytics.js) — PAID, deep-pass, needs a key.** The missing half of
  `analytics_footprint`: given a tracking id (GA4/UA/GTM/AdSense/Meta pixel) it finds EVERY other site carrying
  it = the operator's portfolio. Providers: **PublicWWW (`PUBLICWWW_API_KEY`, preferred, CSV export) or
  DNSlytics (`DNSLYTICS_API_KEY`)** — `requiresKey:[['PUBLICWWW_API_KEY','DNSLYTICS_API_KEY']]`. A shared
  PLATFORM id only proves same-platform (prefer a distinctive GA/AdSense id). Meters `publicwww.search` /
  `dnslytics.reverse`.
- **`opencorporates_search` (opencorporates.js) — PAID, deep-pass, `OPENCORPORATES_API_KEY`.** Company name →
  official registry record: jurisdiction, status, registered address, and **officers** (named directors, for
  the top match — 1 bounded extra call). Turns "owned by Acme LLC" into reachable humans. Free developer tier
  exists; meters `opencorporates.search`.
- **`hunter_search` (hunter.js) — PAID, deep-pass, `HUNTER_API_KEY`.** Company domain → email **pattern**
  (`{first}.{last}@`) + known verified addresses. Construct/confirm a reachable email for a named owner when
  RocketReach/FullEnrich came up empty. Free tier ~25/mo; meters `hunter.search`.
- **Setup:** cert_transparency + email_infra work with NO setup (already live on deploy). To activate the
  other three, set the keys in the research Vercel project (all optional + fail-open — a source with no key is
  simply hidden from the tool list). Env documented in `.env.example`. No new table/permission (reuses the
  existing usage meter + tool-lookup infra). CATEGORY groups reuse existing recap sections (Portfolio & shared
  infra / Infrastructure (DNS) / People & contacts).

## FullEnrich phone waterfall — chat can request it + button shows past a landline (2026-08-08)

Two fixes so a user can actually get a mobile for the likely owner when RocketReach has none
(hit on opentabs.com / Peter Seitz — RocketReach returned 4 emails, 0 phones, and the report
already carried a 2017 WHOIS **office landline**, so neither path let us hunt for a mobile):
- **Chat couldn't request a phone.** `fullenrich_lookup` (`lib/sources/fullenrich.js`) `run()` has
  always honored `include_phone` (adds `contact.phones` to `enrich_fields`), but `include_phone` was
  deliberately **NOT in the tool's `parameters` schema**, so the chat/research agent could only ever
  run it emails-only (it correctly said "even when it completes it won't yield a phone"). Now
  `include_phone` IS exposed, with a hard-gated description: **emails-only by default; set
  `include_phone:true` ONLY when the user EXPLICITLY asks for a phone/mobile for a specific person and
  no mobile was already found — never in the autonomous pass, never proactively.** So "get me a phone
  for X" now runs the phone waterfall without a further prompt. (The on-demand button path
  `api/research.js enhance_contact` already passed `include_phone:true` — unchanged.)
- **"☎ Get phone number" button was hidden whenever ANY phone existed.** `public/app.js` gated the
  button on `!hasPhone(rows)`, so an office **landline** suppressed it even when we lacked a mobile.
  New `isMobileRow`/`hasMobile` (reuses the mobile-vs-landline note regex from the WhatsApp/Telegram
  link logic) — the button now shows when there's **no MOBILE** (a landline no longer hides it), and
  relabels to **"Get mobile number"** when a landline is already on file. Both call sites (primary
  `contact-card` + `leadCard`) updated. Gated by `canEnhance` (= deep-pass perm) as before. Cache-bust
  `?v=20260808phone`.

## Two-tier contact reveal — cheap RocketReach lookup before the $1.50 FullEnrich phone (2026-08-10)

The report enumerates corporate execs via the FREE `rocketreach_search` (LinkedIn only, no
email/phone), but on a big roster it often doesn't spend the paid `rocketreach_lookup` on each one —
so a person shows LinkedIn only, and the ONLY on-demand button was **"☎ Get phone number"**, which
fires the **FullEnrich phone waterfall (~$1.50)**. That's the wrong first step when we haven't even
done the cheap RocketReach lookup (emails + any phones RR has, ~1 credit) — e.g. Chen Fang (BitGo):
her `chen.b.fang@gmail.com` is right there in RocketReach but never appeared because no RR lookup was
spent on her. Fix = a **cheapest-first two-tier reveal**:
- **API** `api/research.js` `enhance_contact` now takes `source`: `'rocketreach'` → runs
  `rocketreach_lookup {name,linkedin_url,company}` (cheap, returns emails+phones); default/omitted →
  the existing `fullenrich_lookup {…, include_phone:true}` (~$1.50). Persists `source` on the
  enhancement + returns it.
- **UI** (`public/app.js`): `enhanceFor(name, rows, seed)` picks the affordance per person — **no
  email/phone on the card → cheap `rrBtn` "🔍 Look up contact (RocketReach)" (1 credit)**; has contact
  but **no MOBILE → `enhanceBtn` "☎ Get phone/mobile number" (FullEnrich · ~$1.50)** as the escalation.
  Both `card()` + `leadCard()` route through it. New `.enhance-rr` click handler (source:'rocketreach',
  ~10s) re-renders on a hit; the FullEnrich note relabeled "FullEnrich · ~$1.50" (was "premium · spends
  a credit"). `mergeEnhancements` is **source-aware**: a RR phone is NOT tagged "mobile" (RR carries no
  line-type after the source flattens `phones`), so it won't wrongly suppress the FullEnrich mobile
  escalation; FullEnrich phones stay tagged mobile. `.enhance-rr` = subtle teal fill (reads as the
  primary/first action). Cache-bust `app.js`/`styles.css` `?v=20260810rrlookup`.
- **Progression:** LinkedIn-only person → click RocketReach (cheap) → emails (+RR phone) fill in → if
  still no mobile, the FullEnrich "Get mobile number" button appears for the expensive escalation.
  Gated by `canEnhance` (deep-pass perm) throughout. No new table/permission/env (reuses
  `ROCKETREACH_API_KEY` + the run's `report.enhancements`).

## TLD Count + valuation calibration + cross-app valuate endpoint (2026-07-18)

- **TLD Count tool** — a free DotDB-style "how many TLDs is this word registered in"
  demand read. `lib/evaluate/tldcount.js` `countRegistrations(input)` probes every IANA
  TLD (`<sld>.<tld>`) for nameservers via `node:dns` (bounded concurrency, round-robin
  public resolvers), cache-first per SLD (kind **`tc`**); pluggable DotDB path if
  `DOTDB_API_KEY` is ever set. `api/tldcount.js` (`?q=<word>` → `{sld,count,extensions}`),
  gated by **domain_owner OR evaluate**. UI: standalone **Research** tab `/research/tld-count`
  (`#view-tldcount`, the `tc*`/`tld*` helpers in app.js) AND an auto-loaded demand card in
  the SNAP Eval report. Validated: distribute → 88 (DotDB shows 91). DNS is UDP-53 so it
  only runs on Vercel, never the sandbox.
- **SNAP Eval valuation fix — premium names were laughably low** (distribute.com $29K when
  Appraise.net said $1.3–1.95M). Two root causes fixed in `lib/evaluate/`: (1) **signals.js**
  raised the Appraise.net poll cap **9s→24s** — it's async (poll-to-complete ~12s) and the
  short cap was dropping the appraisal from the blend entirely; (2) **score.js** now bounds a
  name-specific appraisal DOWN to comps **only when the comp set is robust (≥4 comps)** — with
  a thin/stale set (distribute's one 2016 sale) the appraisal is the better signal and ANCHORS
  the value (weight 3.4 for a dictionary word). Well-comped names unchanged. Rob's calibration:
  basis = **retail ask** (not wholesale clearing), distribute.com target **$300K+**.
- **TLD demand → valuation.** `computeValuation` applies a bounded **demand multiplier
  [0.9–1.15]** from the TLD count (high count = proven demand supports value; minimal = caps
  it), dampened for very common words (zipf ≥4.5) to avoid double-counting brandability.
  Surfaced in the verdict LLM context + the valuation audit (`valuation.tld_demand`) + the
  in-report card (shows its % effect on value).
- **⚠️ STILL OPEN:** this fixed the PREMIUM tier (appraisal-driven). The **retail-ask rescale
  for mid/low tiers** (comp-driven names are still wholesale-basis) + the band/max-bid math
  under a retail-ask fair value are a pending calibration pass — needs live spot-checks from Rob.
- **Internal valuate endpoint** `api/internal/valuate.js` — server-to-server (`x-internal-secret`
  == `RESEARCH_INTERNAL_SECRET`, same pattern as the admin-side internal endpoints): `POST
  {domains:[…]}` → per-domain `{appraisal:{mid,low,high}, tld_count, tld_band}`. Lightweight
  (no NameBio comps/firmographics), cache-first (kinds `ap`/`tc`), bounded + fail-open. Lets the
  **admin SNAP-Opportunities "worth a look" picks** reuse research's valuation keys WITHOUT
  duplicating them into the admin project. `appraisalOnly()` exported from signals.js.

---

## Renewal Price lookup — "what will it cost US to hold" (2026-07-20)

Standalone Research tool `/research/renewal` + a SNAP Eval signal. Answers "if we ACQUIRED
this name, what does it cost to RENEW each year" — the standard registry/registrar cost for
a new owner, NOT what the current owner pays with promos.

- **Engine** `lib/evaluate/renewalprice.js` `renewalPrice(domain, env)`: (1) Porkbun's PUBLIC
  `pricing/get` (no key, no rate limit, all TLDs) → the standard `{registration,renewal,transfer}`
  for the TLD; (2) `porkbunCheck` (extended to return `renewal` from `additional.renewal.price`,
  cache kind `pkd` bumped `_v`→2) refines it for a registry-**PREMIUM** name, which renews at a
  multiple of standard (a real recurring holding cost). Returns `{standard, premium, renewal
  (effective), multiple, note}`, fail-open. Premium detection is best-effort (checkDomain often
  won't price a REGISTERED name — then we report the standard TLD renewal).
- **API** `api/renewal.js` (`?domain=`), gated `evaluate` OR `domain_owner`. Standalone tab
  `#view-renewal` + `nav-renewal` (the `renewal*` helpers in app.js), mirrors the TLD-count tool.
- **SNAP Eval**: `signals.js` gathers it → `signals.renewal_cost`; `verdict.js` feeds it to the
  buy/don't-buy LLM context (a premium renewal = a margin-eating hold cost). Cache-bust
  `?v=20260720renewal`.
- **HTTP 504 fix — Porkbun pricing/get is slow + un-timed (2026-08-25).** sna.gg (and any cold
  lookup) 504'd: Porkbun's PUBLIC `pricing/get` was observed taking **~23s**, and `tldPricing()`
  fetched it with NO timeout, so it blew the API's `maxDuration` → gateway 504. The in-module cache
  doesn't survive serverless cold starts, so every cold function re-hit the slow endpoint. Fix in
  `renewalprice.js` `tldPricing()`: (1) **DB cache** (kind `pkp`, key `_all`, 12h TTL via
  `getToolLookup`/`saveToolLookup`) so the ~900-TLD price map survives cold starts and loads
  instantly; (2) a **12s AbortController** on the live fetch so a slow Porkbun degrades gracefully;
  (3) fall back to a STALE DB cache rather than 504 if the live fetch times out. `api/renewal.js`
  `maxDuration` 20→30 for headroom (12s pricing + 8s premium worst case). `.gg` is priced fine
  ($51.80 std per Porkbun); the endpoint was just slow. Backend-only, no cache-bust.

## Plural detection — `is_plural` flag (2026-07-20)

The Domain Name Search "exclude Plurals" filter was a SLD regex (`[^suaio]s$`, in
`api/dbsearch.js` `FORM_SLD.plural`) that catches consonant+s plurals (cats, offences)
but **deliberately skips vowel+s** (so it won't false-flag atlas/virus/canvas) — thus it
missed every plural whose singular ends in a vowel (croatias←croatia, aleppos←aleppo,
anorexias←anorexia). The NameClub import surfaced ~30% such plurals.

- **Fix = an `is_plural` enrichment flag** on `name_universe`: a plural = SLD ends in
  s/es/ies AND the singular is a real word in the `english_words` table (same naming
  project). Catches the vowel+s proper-noun plurals precisely; `atlas`→`atla` isn't a word
  so it's NOT flagged (validated: croatias/aleppos/anorexias/boxes/cats = true;
  atlas/virus/canvas/bonus/mantra = false).
- **dbsearch** (`api/dbsearch.js`) now applies BOTH on "exclude Plurals": the regex
  (`.not('sld','match',…)`, covers not-yet-flagged rows) AND `.not('is_plural','is',true)`
  (covers the vowel+s gap). NULL is treated as "keep", so coverage fills in as the flag is set.
- **SQL** `supabase/naming_is_plural.sql` — column + partial index + an **idempotent,
  re-runnable** backfill (only flips still-unflagged rows). Run in the NAMING project SQL
  editor (long timeout; batch by first letter if needed). **Re-run after big marketplace
  imports** (NameClub etc.) so new plurals get flagged — or wire it into the post-import
  structural backfill.
- **Scope:** Universe only. Master uses the same regex (`FORM_DOMAIN`) but has no `sld`
  column and english_words is a different project (no cross-project join), so its `is_plural`
  is a later follow-up.
- **⚠️ Missing-column resilience + the migration was never run (2026-08-05).** The `is_plural`
  column was NEVER created on the naming project, so `.not('is_plural','is',true)` (added when
  "Plurals" is excluded — a common default) errored the WHOLE universe query (Postgres **42703
  column does not exist**). Symptom: **excluding Plurals silently zeroed the Universe results**, and
  because a POS filter makes "Both DBs" SKIP Master (POS is universe-only), the **Part-of-Speech
  filter returned 0 results** for any single POS (all-4-POS = no constraint, so Master still ran and
  masked it). Fix in `api/dbsearch.js`: a module `isPluralMissing` flag + `missingIsPlural(err)`;
  `buildUniverse` skips the predicate when set; `runUniverse`/`fetchAllUniverse` wrappers strip-and-
  retry on a 42703/is_plural error (all 3 call sites — both/universe/export). So search works with or
  without the column; once the migration + a redeploy land, is_plural filtering (vowel+s plurals)
  resumes. **STILL RUN `supabase/naming_is_plural.sql` on the NAMING project** — until then the vowel+s
  plural exclusion (croatias/aleppos) is silently off. Validated: POS=noun on `.ai` dict now returns
  ~4,195 rows (was 0). (Names like bare.ai/bean.ai are in BOTH corpora — the universe row carries the
  POS tag, so they POS-filter fine once this works; a truly Master-ONLY dictionary name still can't be
  POS-filtered, since POS is a universe enrichment.)

---

## GLEIF + SEC EDGAR — free entity-enrichment sources (2026-08-08)

Two FREE, KEYLESS company/entity sources added to `domain-research/lib/sources/` — both confirm/enrich
a registrant ORGANIZATION already identified from WHOIS/RDAP/the site (not owner-discovery).

- **`gleif_entity`** (`gleif.js`) — GLEIF (Global Legal Entity Identifier Foundation) lookup by company
  NAME (or a known 20-char LEI). Returns authoritative legal name, registered address + jurisdiction,
  entity status, legal form, and — best-effort — the **direct corporate PARENT** (`/lei-records/<lei>/direct-parent`).
  Fulltext search (`filter[fulltext]`, `accept: application/vnd.api+json`), top 5. Coverage skews to
  larger / registered / financial entities (only entities holding an LEI). Keyless, fail-open.
- **`sec_edgar`** (`sec_edgar.js`) — SEC EDGAR lookup by company NAME. Determines whether the owner is a
  U.S. SEC-registered (public/reporting) company: caches `company_tickers.json` (~10.4k cos, 6h), ranks
  name matches (exact/startsWith/contains, top 3), then pulls `data.sec.gov/submissions/CIK<10>.json` for
  CIK / official name / ticker / SIC industry / HQ state+city / exchange / **most recent filings**
  (10-K/10-Q/8-K/S-1/DEF 14A/20-F/…). **Keyless but the SEC REQUIRES a descriptive User-Agent** —
  `SEC_EDGAR_UA` env (default `rob-personal domain-owner-research (rob@snagged.com)`). U.S. filers only.
- **Wiring:** both imported + added to `ALL[]` in `index.js`, category **"Company & entity"**. NEITHER is
  in `PAID` (free → available on both the free pre-flight and deep passes, and to the agent). No keys, no
  migration, no setup. Verified live 2026-08-08 (GLEIF returned parent hierarchies; SEC returned Selective
  Insurance Group CIK 230557 / SIGI / Nasdaq / recent 10-Q).

---

## What this project is

A serverless Vercel + Inngest + Supabase app at **research.snagged.com** that takes a domain and produces a defensible ownership/contact report. Two-tier execution: a **free pre-flight pass** (RDAP, WHOIS, DNS, Wayback, marketplace check, registration cluster) and a paid **"go deeper" pass** (WhoisXML, DomainIQ, BigDomainData, Whoxy, reverse-WHOIS, RocketReach lookup, web/Brave search, trademark, valuation). Standalone Trademark and Appraisal tools are also live.

Password-gated (single `APP_PASSWORD`). Async pipeline runs in Inngest so jobs aren't bound by Vercel's function timeout.

---

## Authoritative entry points

- **`domain-research/lib/agent.js`** — research + chat agent; the `SYSTEM_PROMPT` is the **authoritative playbook** (drop check, peel-the-onion, enrich every named person via RocketReach, never enrich brokers, evidence vs inference, WHOIS-fingerprint check, etc.). When the spec and this prompt disagree, the prompt wins.
- **`domain-research/lib/sources/index.js`** — every source registered + free/paid tier gating + category map for the recap UI.
- **`domain-research/lib/inngest/functions.js`** — async pipeline (`runResearch`, `runChat`).
- **`domain-research/api/*.js`** — HTTP endpoints (`research`, `inngest`, `chat`, `lookup`, `tool-history`, `feedback`, `me`, `login`, `diag`).
- **`domain-research/supabase/schema.sql`** — data model.
- **`domain-research/SPEC.md`** — earlier product spec. **Partially superseded by the live code.** Cross-reference with the SYSTEM_PROMPT; the prompt is the authority.
- **`domain-research/.env.example`** — required env vars (Supabase, Anthropic/OpenAI, Inngest, paid data sources, `APP_PASSWORD`).

---

## Available-domain short-circuit — skip the pipeline for an unregistered name (2026-08-18)

An AVAILABLE (unregistered) domain has NO owner to research, but the report used to run the full
~3-minute pipeline (gather → owner research → agent narrative → marketplace → reverse-WHOIS →
critique) before concluding "not registered." Now it's an **immediate check that short-circuits**.
- **Where** `lib/inngest/functions.js` `runResearch` — right after `mark-running`, before lessons/
  gather. Gated to **fresh (non-regen)** runs. Calls `whoisLookup(domain)` (`lib/whois/lookup.js`) —
  which RDAP-checks AND corroborates an RDAP-available result against a WHOIS port-43 leg before
  declaring available (guards a registered-but-undelegated false positive). Only `reg.available ===
  true` short-circuits; a lookup FAILURE or `available:false` falls through to the normal pipeline
  (safe direction — worst case a rare name still runs the full report). On available: `saveRunReport`
  with `available:true` + a minimal markdown + `registration:{available:true,…}`, then returns —
  skipping gather/critique/owner-crack and all the paid work. Turns a 3-min "nobody owns this" into
  ~seconds.
- **Client** `public/app.js` — `renderReport` branches at the top on `report.available` →
  `renderAvailableReport`: a green **"✓ Available — register now"** card (`.av-*` styles) with
  GoDaddy/Porkbun/Dynadot/Namecheap/Spaceship register links, hides the confidence chip + the for-sale
  strip (`stopDsPoll` + hide `#market-strip`) + every owner block (internal-owner / company-vitals /
  registrar / auction), and skips the outreach button + chat (nothing to reach out about). Cache-bust
  `?v=20260818available`.
- **No new table / env** — reuses `whoisLookup` (RDAP + WHOIS, already used in `gather`) and the
  existing `report` jsonb (new `available` flag). Verified: rdapStatus google.com→registered,
  a random string→available, both from the sandbox.
- **⚠️ FALSE-available on RESERVED/PREMIUM names → Porkbun confirmation + manual override (2026-08-28).**
  **koe.tv** (a reserved/premium `.tv`) was wrongly shown "✓ Available to register" — but it's NOT
  registerable (renews $26.26). Root cause: a **registry-RESERVED/premium** name has the SAME
  "not found" fingerprint as a genuinely unregistered one — `rdap.nic.tv` **404s** koe.tv (no
  registration record), it has **no NS** (DoH NXDOMAIN), and WHOIS shows no-match. RDAP/WHOIS/DNS
  "not found" ≠ registerable. Fixes:
  - **Porkbun confirmation gate** (`lib/whois/lookup.js`): in the branch that would declare available
    (RDAP-available + no WHOIS + no NS), now calls **`porkbunCheck(domain)`** (authoritative "can I buy
    it this second", already used by the naming exercise). Only a clear **`avail:yes`** returns
    `available:true`; a taken/reserved/premium result OR an inconclusive one (no key / error /
    rate-limit) **falls through to the normal pipeline** — never a false "available". Fixes BOTH the
    report short-circuit AND the Whois tool's available card. NB the sandbox can't run Porkbun (keys
    are Vercel-only), so the confirmation only exercises live.
  - **Manual override** (Rob's ask): the available card now has a **"Actually registered? Run the full
    report anyway →"** button (`.av-override-btn`, `data-av-override`) → `run({domain, force:true,
    skipAvailable:true})`. Wired through: `enqueue`/`run` send `skip_available`; `api/research.js`
    reads `body.skip_available` (also skips the cached-run reuse) → `RUN_REQUESTED data.skipAvailable`;
    `runResearch` gates the short-circuit `if (!isRegen && !skipAvailable)`. Cache-bust `?v=20260828koeavail`.
  - **PREMIUM-name variant (2026-08-28).** koe.tv is actually a **registry-PREMIUM/reserved** `.tv`
    (verified live: rdap.nic.tv 404s it — but 200s twitch/plex/nic.tv — DoH NXDOMAIN, no live site; the
    registry has NO registrant record, so there's genuinely no owner). Porkbun's `checkDomain` returns
    `avail:yes` (Porkbun sells it as a premium), so the short-circuit correctly fired — but a **plain
    "✓ Available to register" green card with cheap registrar buttons was misleading**, because at a
    registrar that doesn't carry the premium (Dynadot showed koe.tv "unavailable · Inquire/Transfer
    only") you can't just grab it. Availability of a premium name is **registrar-specific**. Fix: carry
    Porkbun's `premium` flag through — `whoisLookup` returns `{available:true, premium, premium_price,
    renewal}` (`lookup.js`); `runResearch` saves them into `report.registration` + swaps the markdown;
    `renderAvailableReport` (`public/app.js`) renders a distinct **amber "◆ Premium / reserved"** card
    (`.av-premium`/`.av-badge-premium`/`.av-price`) — "has no registrant, registerable at a premium,
    availability/price vary by registrar" + the premium price/renewal when known — instead of the green
    grab-it card. A genuinely-open name (`avail:yes && !premium`) still shows the green card. NB Porkbun
    keys are Vercel-only so the premium flag can't be exercised from the sandbox; if Porkbun returns a
    premium name as non-premium standard-avail, it'd still show green (Porkbun genuinely thinks it's a
    $X reg — a legit registrar-specific disagreement with Dynadot; the override is the escape hatch).
    Cache-bust `?v=20260828premium`.
  - **RESERVED-RISK hedge — Porkbun's API lies for reserved ccTLDs (2026-08-28).** Rob checked koe.tv at
    **Porkbun's OWN storefront → "unavailable · Inquire / Transfer"** (same as Dynadot). So koe.tv is NOT
    registerable at retail anywhere — yet our report still showed green, because **Porkbun's `checkDomain`
    API returned `avail:yes` while porkbun.com itself says "unavailable."** The API/store disagree for
    registry-RESERVED short ccTLD names, and koe.tv is RESERVED not premium (standard $26.26 price, not a
    premium price), so the premium branch never fired. Since Porkbun's avail flag can't be trusted for this
    class, `whoisLookup` now also computes **`reserved_risk`** = short SLD (≤4 chars) on a reservation-prone
    TLD (any TLD outside `{com,net,org,info,biz}`), independent of the avail flag. `runResearch` carries it
    into `report.registration.reserved_risk` + swaps the markdown; `renderAvailableReport` renders a THIRD
    variant — a rust **"⚠ May be reserved"** card (`.av-reserved`/`.av-badge-reserved`): "no owner on file,
    but a short name on this extension is often registry-reserved and not registerable at retail — verify at
    checkout." Priority premium > reserved_risk > green. Errs toward "verify" (a genuinely-open short ccTLD
    name just gets a verify prompt — a safe under-confident error, never a false confident green). The
    override + full-report escape hatch stays. Cache-bust `?v=20260828reserved`. **A truly authoritative
    "can I register it at retail" check would need a registrar storefront/EPP call (all bot-walled from the
    sandbox / Vercel), so the heuristic hedge is the pragmatic fix.**

---

## Auto "Verify alive" on the deep pass (2026-08-23)

The report's **"🫀 Verify alive"** deeper-dive (an `ADDON_DEFS` entry in `public/app.js` — a canned
obituary/death-notice search fired through `/research/api/chat`, namesake-guarded, owner-focused) now
**auto-runs when a DEEP/full-enrichment report finishes**, instead of only on a manual click — so a
DECEASED owner surfaces automatically and the contact path can pivot to the estate/heirs (Rob had been
chasing an owner who'd actually passed; the son + wife are the real contacts). The agent SYSTEM_PROMPT
already treats a found death notice as MATERIAL (`lib/agent.js:47` — route to estate/family/successor);
this makes the *targeted* obituary search proactive rather than incidental.
- **Wiring** (`public/app.js`): `autoVerifyAlive(report)` + a session `aliveAutoFired` Set; called from
  `startPolling`'s `status==='done'` handler right after `renderReport`, gated to `report.phase==='deep'`.
  Fires **once per run**, **only on a fresh deep completion** (the poll path — NOT on cached re-opens, so
  no re-spend), only for a **named individual** owner (`reportOwnerName`, skips `CLUE_NOISE_RE` privacy
  names + any `owner_type` matching compan/corp/organi/business/investor/marketplace/successor/holding).
  Reuses the existing `runAddon('alive')` path entirely — the result renders as the same Deeper-dives card
  and persists as a chat turn. No backend/pipeline change.
- **Prominent DECEASED banner (2026-08-23).** The alive prompt now prefixes its reply with a machine tag
  **`[LIVENESS:deceased|alive|unknown]`** (same pattern as the `[REGENERATE:…]` marker). `runAddon`'s done
  handler, for `kind==='alive'`, runs `detectLiveness(content)` → strips the tag from the card body, and on
  **`deceased`** calls `renderOwnerLiveness` which leads the report with a red **`#owner-liveness`** banner
  (`.ol-*` styles) — "⚰️ <owner> appears to be deceased → contact the estate/heirs" + an excerpt + a "see
  full finding ↓" jump to the card. alive/unknown clear the banner (the card still shows the detail). The
  banner is reset alongside the other owner blocks (both report-reset paths + the available-report branch).
  Works for BOTH the auto-run (deep) and a manual click. Cache-bust `?v=20260823alivebanner`.

---

## Shareable report links + OG previews (2026-06-18)

Report deep-links are SPA **hash** routes (`#/r/<slug>`), which link-preview
crawlers (Slack/iMessage/Twitter) can't read — and the SPA is login-gated — so a
shared report previewed as the generic app card. Fix:

- **Clean slug.** `buildSlug` (public/app.js) is now `<domain>-<runId>` (dotted
  domain, no date) — e.g. `inference.com-<uuid>`. `runIdFromHash` still regex-
  extracts the uuid, so **older dashed/dated slugs keep working**.
- **Public share route** `api/r.js` at **`/research/r/<slug>`** (vercel.json rewrite
  → `/api/r?slug=`, placed before the `/research/:path*` catch-all). It's PUBLIC
  (no auth, no DB): parses the domain from the slug, renders OG/Twitter meta
  (`Domain Owner Report — <domain>`), then redirects a real visitor into the gated
  SPA (`#/r/<slug>`). Exposes only the domain (already in the URL), never report
  content. Handles both new and legacy slug shapes.
- **Share button** (`share()` in app.js) copies the path URL
  `https://app.snagged.com/research/r/<slug>` instead of the bare hash href.
- The snagged-admin proxy already forwards `/research/:path*`, so no admin change.
  Research has **no preview builds** — this only previews correctly once on `main`.

## Branch & deploy

- `main` → production (research.snagged.com), no preview builds (Ignored Build Step cancels non-prod).
- Feature branches: `claude/<slug>`. Merge to `main` only when ready to ship.
- Stale local divergence (if any) lives on `claude-stale-divergence` for archival only.

---

## Owner Outreach module (2026-06-03) — email-draft add-on to a report

Optional, permission-gated feature that drafts a **first-touch** outreach email to
the likely owner, off the signals the report already produced. Seeded from Rob's
real opening emails ("Domain Owner Initial Outreach" playbook).

- **Templates** (`lib/outreach/templates.js`): 7 scenarios verbatim from the
  playbook (closest-to-real + lightly-cleaned variants), each with the recurring
  spine + per-scenario adjustment. `SUBJECT = "[DOMAIN] Domain Inquiry"`.
- **Signals** (`lib/outreach/signals.js`): `extractSignals(report, domain)` reads
  the report PART-1 JSON + `summarizeReport` + (best-effort) `marketplace_check` /
  `livesite_inspect` / `registration_cluster`, plus narrative analysis. Produces
  rich indicators (confidence band, `formerOperator`, `mayStillOwn`,
  `priorCompanyTie`, `acquisition`, `redirectsToParent`+host, `listed`+platform,
  `siteActive`/`parked`, `largeCompanyHint`, `multiStakeholder`, `privacy`) AND the
  **full agent narrative** (PART-2, capped ~9k) so the drafter reads everything.
- **Mapping table** (`lib/outreach/classify.js`): `MAPPING` is an explicit
  indicator→template weight table; `rankScenarios(sig)` scores every built-in and
  returns a ranked list with the reasons that fired (inspectable + tunable —
  change a weight, not an if/else). The top is the deterministic prior; e.g.
  pavilion.com → research_informed via may-still-own + prior-company-tie +
  medium-confidence.
- **Drafting** (`lib/outreach/generate.js`): one rich LLM call gets the FULL
  context (indicators + narrative + contacts/timeline/contact_path), the WHOLE
  template catalog (each template's "use when" + text), and the ranking as a prior,
  then **interprets the situation and chooses an approach**: adapt a template,
  propose a `new_template`, or write a fully **bespoke** email when nothing fits.
  Returns `{situation, approach, template_id, fit, suggested_title, hooks[],
  subject, body}`. Short + personalized; hard rule = only verifiable facts, never
  invent (missing → visible `[BRACKET]`). Model `OUTREACH_MODEL` (default
  `claude-sonnet-4-6`); falls back to the top-ranked template filled in if the LLM
  is unavailable. The drawer dropdown has a `✨ Personalized (no template)`
  (`__bespoke__`) option to force a bespoke draft.
- **API** (`api/outreach.js`): `POST {run_id, scenario_id?}` → `{scenario:{id,name,
  why[]}, scenarios[], subject, body}`. Gated by `domain_owner` **and** the new
  `outreach` action permission (admins auto-pass).
- **Fit + suggest-a-new-template**: the draft call also returns `fit`
  (`good`|`weak`) and a `suggested_title`. On a weak fit the drawer shows a note
  and prefills a **Save as a new template** name. Saving (`POST {action:
  'save_template', run_id, title, subject, body}`) **placeholderizes** the concrete
  draft back to `[DOMAIN]`/`[First Name]`/`[PLATFORM]`/`[PARENT SITE]`/`[Names]`
  (`placeholderize` in generate.js) and stores it in
  `domain_research_outreach_templates` (`lib/db/outreachTemplates.js`). Saved
  templates merge into the dropdown (`customToTemplate`) and can be re-selected to
  draft from. **One-time migration:** the table in `supabase/schema.sql` (RLS
  auto-enabled by the trailing `domain_research_%` loop) must be run on the
  research project before Save works; drafting/fit work without it (listTemplates
  is best-effort → `[]`).
- **UI**: a "✉ Draft outreach" button in the report header opens a right-side
  **slide-over drawer** (`#outreach-drawer` in index.html; logic + `openOutreach`
  in app.js; `.od-*` styles in styles.css). Scenario dropdown (override →
  re-draft), editable subject/body with **per-field copy icons** (subject + body),
  Save-as-template row, Copy-email. **Copy-to-clipboard only — nothing is sent.**
  Launcher hidden unless `canOutreach`.
- **Permission**: catalog key `research.outreach` (action) added in the
  snagged-admin Users editor (`dashboard/lib/permissions.ts`); stored flat as
  `outreach` in the `permissions` JSONB. Grant per-user there.
- **Referenceable outreach toolkit — mine real sent emails + "Try again" (2026-07-22).** The 7
  built-in templates are now just a baseline; the drafter also learns from Rob's REAL sent openers.
  - **Corpus:** `domain_research_outreach_examples` (schema.sql; RLS via the `domain_research_%`
    loop) — `lib/db/outreachExamples.js` (`listExamples`/`countExamples`/`upsertExample`, best-effort).
  - **Mining:** `lib/outreach/mine.js` `mineOutreachExamples` searches the deal mailboxes via the
    admin internal Gmail endpoint (`email/threads.js` `searchEmailThreadsRaw`, query
    `subject:(Domain Inquiry) from:snagged.com`), extracts the FIRST snagged.com opener from each
    thread, redacts the domain + greeting name → `[DOMAIN]`/`[First Name]`, tags it by scenario
    (`tagText`), upserts by `ext_id=mailbox:threadId`. `relevantExamples(signals, all, k)` ranks by
    tag-overlap with the report. Triggered by cron `api/cron/mine-outreach.js` (`vercel.json` daily
    `0 7 * * *`, CRON_SECRET) + on-demand `POST /api/outreach {action:'mine'}`. Fail-open (no Gmail
    creds / no DB → mines nothing, drafter still works off templates).
  - **Draft context:** `generate.js` gets a "REAL PAST OUTREACH (learn the VOICE… don't copy facts)"
    block from the top-3 relevant examples, alongside the full narrative it already reads.
  - **"Try again"** (renamed from Regenerate): the drawer button now sends `retry:true` +
    `previous_body`; `generateOutreach` raises temperature to 1 and instructs a MATERIALLY DIFFERENT
    draft that re-reads every input and doesn't repeat the prior attempt. Skips the skeleton on retry.
    Cache-bust `?v=20260722outreach2`.
  - **Setup:** run the `domain_research_outreach_examples` table on the research project; mining
    reuses `ADMIN_INTERNAL_BASE` + `RESEARCH_INTERNAL_SECRET` (already set).
- **Outreach drawer polish (2026-07-22).** (1) **Address only reachable contacts.** `signals.js`
  now derives the greeting names from the **PRIMARY tier** named contacts only (`primaryNamed`),
  not every non-tertiary name — so an email is addressed to the person(s) we actually have a
  contact route for (e.g. Ron), not a co-founder we only know by name (Mitch). `multiStakeholder`
  requires >1 primary-tier person (narrative "team/owners" language no longer forces it). A new
  generate.js HARD RULE tells the LLM to greet ONLY the "Address as" names. (2) **Spinner, not a
  skeleton.** The drawer no longer flashes the deterministic template-fill (it read as finished) —
  `setOutreachGenerating(on)` swaps the subject/body for a spinner (`#od-generating`) until the AI
  draft lands; "Try again" keeps the prior draft visible while re-thinking. Skeleton API mode is
  now unused by the UI. (3) **Same-window "View Deal"** — `window.location.assign` instead of
  `window.open(_blank)` (the desktop app spawned a new window, losing the session). Cache-bust
  `?v=20260722outreach3`.
- **Draft must USE the report, not mail-merge (2026-07-24).** The drafter was reading the full
  narrative fine (ingestion is OK — `signals.narrative` carries the PART-2 prose, 9k cap) but writing
  GENERIC bodies ("I saw it's listed, open to selling?") that ignored the identified hooks, and the
  `situation` line leaked the internal instruction ("the user has forced the passive_individual
  template"). Fixed in `generate.js` SYSTEM prompt: (1) a HARD RULE that the body MUST include ≥1
  concrete verifiable detail about THIS owner/domain from the report (how long held, prior company,
  parked/redirected/listed state) — a domain-agnostic opener is a FAILURE — **even when a template is
  selected** (a selected template is a skeleton to personalize, never a fill-in-the-blanks); (2) the
  `situation` is a clean external read of ownership ONLY — never mention templates/"forced"/"the
  user"/instructions/process anywhere in the output; (3) reworded the forced-template note from
  "USER OVERRIDE: use template X, adapt it" → "template X pre-selected, use for structure/voice but
  personalize with specific hooks; don't mention the selection." Prompt-only change.
- **Report NARRATIVE also respects the authoritative for-sale strip (2026-07-22).** Strengthened the
  agent `SYSTEM_PROMPT` (`lib/agent.js`): marketplace_check + domainscout_lookup are AUTHORITATIVE —
  if they ran and found no live listing, do NOT write "listed for sale" or name a marketplace, no
  matter how strongly the owner reads as an investor. (Pairs with the outreach-signal fix below.)
- **For-sale signal now AUTHORITATIVE (2026-07-22).** The outreach draft was claiming a
  domain was "listed for sale across multiple marketplaces" when it wasn't (e.g. electron.ai:
  `domainscout_lookup.for_sale:false` + `marketplace_check.any_listed:false`, yet the agent
  NARRATIVE loosely said "listed"). Fix in `signals.js`: read BOTH `marketplace_check` and
  `domainscout_lookup` traces; `listed` is true only if a source AFFIRMATIVELY found a listing,
  and a source that ran + found none sets `checkedNotListed`. The owner_type/narrative fallback
  (`domain_investor`/`marketplace_only` → listed; narrative marketplace-name scrape) now fires
  ONLY when `!listed && !checkedNotListed` — so a verified for-sale strip never gets overridden
  by narrative inference. New signal `verifiedNotListed`; `generate.js` adds a **"For-sale status"**
  context line + a HARD RULE telling the drafter to trust the verified status over the narrative
  (don't claim/name marketplaces when NOT listed). `classify.js` `listed_for_sale` still scores
  `domainInvestor` (4) so a true investor still pitches as one — just without the false listing.
- **For-sale fix pt.2 — the strip result wasn't reaching outreach (2026-07-27).** The 2026-07-22 fix
  only works if a `domainscout_lookup`/`marketplace_check` trace is in the SAVED run — but the report's
  "For sale" strip is a LIVE client-side call, so its authoritative "Not listed (10 checked)" result is
  NOT in `run.report.trace` that `extractSignals` reads. With no authoritative trace, the narrative
  fallback fired and (because it only needed a marketplace NAME + a for-sale word anywhere in the whole
  doc) wrongly claimed **arc.com "listed for sale on GoDaddy"** — GoDaddy was just the registrar / a
  lookup link, and the strip said NOT listed. Two fixes: (1) `api/outreach.js` `withForSaleTrace` runs
  the SAME authoritative check (`domainscout_lookup`, fallback `marketplace_check`, `track:false`,
  skips a `pending` DomainScout) fresh and INJECTS it as a trace before `extractSignals` — so
  `verifiedNotListed` is set like the strip shows. (2) `signals.js` narrative fallback now requires the
  marketplace name + for-sale phrase in the **SAME sentence** (`MARKETPLACE_TEST`/`FORSALE_PHRASE_RE`),
  since these hosts are also registrars and doc-wide co-occurrence isn't a listing. Validated: arc.com
  → `listed:false, verifiedNotListed:true`; a genuine one-sentence "listed for sale on Afternic" still
  → `listed:true`. **NB the drafter DOES use the report context** (acquisition, redirect, etc. were all
  real) — this only stops the fabricated for-sale hook.
- **HTTP-only redirect on a broken-HTTPS site is NOT an "open" redirect (2026-08-05).** translucent.com's
  report narrative said it "openly 301-redirects to translucent.ca," which poisoned the outreach draft —
  but `https://translucent.com` fails the TLS handshake entirely (curl exit 35, even with `-k`); the
  redirect exists ONLY over plain HTTP (`http://translucent.com`→`http://www.translucent.ca`). Browsers
  are HTTPS-first, so a human sees a security error, NOT a redirect. Root cause: `livesite_inspect`
  fetches https then falls back to http; it recorded `scheme:'http'` (= https failed) but only that subtle
  flag reached downstream, so the agent rendered it as a live "open" redirect. Fixes: (1) **`lib/sources/livesite.js`**
  now returns explicit `https_ok`, `https_error`, and a `redirect{offsite,target,target_url,http_only}`
  object + a plain `note` when the redirect is http-only (https broken) — additive, agent-readable. (2)
  **`lib/agent.js` SYSTEM_PROMPT** gained a REDIRECT PRECISION rule: an http-only redirect where HTTPS
  fails is an ownership tie, NOT an "open/active/browser-visible" redirect — describe precisely. (3)
  **`lib/outreach/signals.js`** exposes `redirectHttpOnly` (set from `redirect.http_only` or
  `https_ok===false && scheme==='http'`). (4) **`lib/outreach/generate.js`** tags the `redirects-to-parent`
  indicator `[HTTP-ONLY …]` + a HARD RULE forbidding pitching it as "your domain forwards to X." Verified
  live: `http://translucent.com`→`http://www.translucent.ca/` 200; `https://translucent.com` exit 35. No
  client asset change (backend + prompt only) — re-run the report / re-draft to pick it up.

---

## Chat email ingestion (2026-06-20) — attach Gmail threads as chat context

The Domain Owner **chat** can ingest relevant email threads (instead of the user
copy-pasting correspondence), mirroring the nameserver "reports" picker: **auto-
suggest by the report's domain + manual search**, you pick which threads to attach.

- **Email source = snagged-admin's Gmail layer.** This app holds NO Google creds.
  snagged-admin exposes an INTERNAL endpoint `/api/internal/email-threads`
  (shared-secret `x-internal-secret`, restricted to `dealMailboxes()` =
  rob@/brian@ snagged.com/.co) that reuses `lib/gmail.ts` (`searchMessages` /
  `getThread`). `lib/email/threads.js` calls it server-to-server
  (`ADMIN_INTERNAL_BASE` default `https://app.snagged.com` + `RESEARCH_INTERNAL_SECRET`).
  Degrades gracefully when unset (search → [], the chat-email bar hides on 503).
- **Storage:** `domain_research_chat_emails` (per RUN: mailbox, thread_id, subject,
  snippet, body, attached_by; unique run_id+thread_id) — `lib/db/chatEmails.js`
  (`listChatEmails`, `chatEmailContext`, `attachChatEmail` upsert, `detachChatEmail`).
- **API** `api/chat-email.js` (gated `domain_owner`, same as chat): `GET ?run_id=&list=1`
  / `&suggest=1` / `&q=<query>`; `POST {action:'attach'|'detach'|'refresh'}`.
  **refresh** re-pulls every attached thread (upsert replaces the body) so NEW
  replies since attach get ingested.
- **Agent:** `chatTurn({…, emails})` injects the attached thread bodies into the
  system prompt as authoritative primary-source context; `runChat` loads
  `chatEmailContext(runId)` each turn (so refreshed bodies are always used).
- **UI:** a "📎 Attach email" bar above the chat thread (`#chat-email` in
  index.html; the `ce*` helpers in app.js; `.ce-*` styles). Auto-suggests on open,
  manual search box, attach/detach chips, ↻ Refresh. Cache-bust `?v=20260620email`.
- **One-time setup:** run the `domain_research_chat_emails` table on the research
  project; set `RESEARCH_INTERNAL_SECRET` (BOTH projects, same value) +
  `ADMIN_INTERNAL_BASE` (research, → the admin app). No extra permission — chat
  access (`domain_owner`) is the gate.

## DomainScout integration (2026-06-26) — auto-track + authoritative for-sale strip

DomainScout (https://www.domainscout.io) is a domain-monitoring service. With the
`DOMAINSCOUT_KEY` env var set (Sanctum personal access token; **API needs the
Hunter plan — a lesser plan returns 403**) the server now uses it for two things,
replacing the old manual "Add to DomainScout" bookmarklet (which existed only
because the server had no session there):

- **Auto-track.** Every Domain Owner research request initiated from the Research
  tab POSTs the domain into the DomainScout watchlist. Wired in `api/research.js`
  (new-run path, right after `cleanDomainInput`): `trackDomain(domain, env)`,
  **best-effort + non-blocking** (a failure never blocks the run), idempotent
  (re-tracking is a no-op). Fires for both fresh and reused-domain requests.
- **For-sale strip = DomainScout.** The report header's "For sale" strip now calls
  the **`domainscout_lookup`** source (one API call → authoritative per-marketplace
  listing state: listed/price/currency/link across Afternic, Sedo, GoDaddy,
  Namecheap, Sav, Spaceship, Atom, Dan, Efty, HugeDomains, …) instead of scraping
  six pages. **Falls back to the legacy page-scraping `marketplace_check` strip
  when no key is set / the call fails**, so non-keyed envs still work.

- **Client** `lib/domainscout.js`: `isConfigured`, `trackDomain` (POST; 201/200/
  409/422 all = success, never throws), `lookupDomain` (GET `/{domain}`; on 404 it
  POST-tracks then re-reads, since DomainScout only has data for monitored domains;
  normalizes `marketplaces[]` + builds per-marketplace deep-link URLs).
- **Source** `lib/sources/domainscout.js` → `domainscout_lookup`, registered in
  `lib/sources/index.js` as a **FREE** source (flat monthly sub, no per-call credit;
  category `Marketplace`). `requiresKey: [['DOMAINSCOUT_KEY','DOMAINSCOUT_API_KEY']]`.
- **UI** (`public/app.js`): `loadDomainScoutStrip` (primary) → `streamMarketStrip`
  (fallback). `renderMarketStripDS` shows **listed marketplaces first** (favicon
  logo + price + deep-link), with the not-listed ones **collapsed behind a "+N not
  listed ▸" toggle** (kept clean whether 2 or 12 come back). Logos via Google's
  favicon CDN (`MARKET_HOSTS` map). Cached server-side kind `mk` (shape
  `{v:6, source:'domainscout', marketplaces[]}`; **MARKET_V bumped 5→6**; a
  "pending" just-tracked result is NOT cached so it re-checks once scanned).
  Cache-bust `app.js?v=20260626domainscout`.
- **Test:** `/research/api/diag?source=domainscout_lookup&domain=<d>` (auth-gated)
  exercises the GET + auto-track in isolation. Research has **no preview builds**,
  so this only runs live once on `main`.
- **For-sale strip stall — stop re-tracking on every poll (2026-08-05).** A brand-new
  domain (never before in DomainScout) 404s on GET until DomainScout finishes its OWN async
  marketplace scan, so `lookupDomain` did GET(404)→POST-track→GET(404) — three round-trips +
  a redundant re-POST — on EVERY one of the ~20 client polls (DS_POLL_MAX 20 × 4s). The
  domain is already auto-tracked at run start (`api/research.js`), so the strip never needs to
  keep re-tracking. Fix: the poll loop now fetches with **`track=0`** (`dsFetchOnce(domain,false)`
  in `scheduleDsPoll`; the FIRST `loadDomainScoutStrip` read still tracks defensively) → each
  poll is a single fast GET, no re-POST. `lib/sources/domainscout.js` `run` now COERCES a
  string/query falsy (`'0'`/`'false'`/`'no'`) to `track:false` (the HTTP layer passes params as
  strings, so the old `track !== false` never turned tracking off). DomainScout's API itself is
  fast (~0.7s/call) — the stall was purely the redundant re-track loop. A truly never-scanned
  fresh domain still settles to "✗ No marketplace listings found" at the poll cap (the Open:
  GoDaddy/Dynadot/Spaceship/Live-site links are the manual fallback). Cache-bust `?v=20260805dsstrip`.
- **For-sale strip — fall back to the live scraper when DomainScout hasn't scanned it (2026-08-05).**
  DomainScout's by-domain GET **404s until DomainScout has run its OWN async marketplace scan** of a
  domain; our client surfaces that as `pending:true` + empty `marketplaces`. A brand-new domain
  (parkinglots.com/final.com/avec.net) stays `pending` for a long time, so the strip spun "Scanning
  marketplaces on DomainScout…" the full ~80s poll window with no result. (A domain DomainScout HAS
  scanned — e.g. donkey.com — returns the full 12-marketplace result in ~300ms; auth + parsing are
  fine, it's purely scan coverage.) Fix: `dsFetchOnce` now surfaces the `pending` flag (was dropped,
  so the poller couldn't tell "not scanned yet / 404" from "scanned, nothing listed"); `scheduleDsPoll`
  counts pending reads and after **`DS_PENDING_MAX` (3)** falls back to the legacy live page-scraper
  (`streamMarketStrip`) which checks each marketplace directly → a real for-sale answer in ~12s instead
  of an 80s spinner. Diagnose a domain with `/research/api/diag?source=domainscout_lookup&domain=<d>`
  (`pending:true` = DomainScout hasn't scanned it). Cache-bust `?v=20260805dsfallback`.
- **TODO (this session):** historical backfill — POST every domain ever researched
  (distinct `domain` in `domain_research_runs`) into DomainScout so the existing
  corpus is tracked too.

## Company vitals — "how alive are they" block in the Domain Owner report (2026-07-13)

A dedicated card in the Domain Owner report (`#company-vitals`, below the for-sale
strip) that reads how ALIVE the owning company is → gauges whether a name is pry-able.
Answers "how big are they / employees / revenue / VC raised / is the site active / when
last updated."

- **API** `api/company-vitals.js` (gated `domain_owner`, maxDuration 30): `GET
  ?domain=&reveal=1&refresh=1`. Two tiers:
  - **Aliveness (FREE, always):** newest **Wayback** snapshot + age (single CDX
    `limit=-1` call), **MX** active + provider (reuses the exported `dnsMx` from
    `lib/whois/lookup.js`), quick **live-site** reachable/parked/active fetch.
  - **Company profile (PAID, `reveal=1`):** `firmographicsApollo(domain)` (~1 credit) →
    employees + headcount growth, revenue, total **VC funding raised** + stage + last
    round, founded year, industry, HQ.
  - **`pryVerdict`** = deterministic read (very_hard / hard / possible / unclear) from
    size+funding+site+MX+recency. Cache-first by DOMAIN (kind **`cv`** in
    `domain_research_tool_lookups`, `KIND_MODULE` added in `api/lookup.js`) so a re-view
    / the deep pass never re-spends; `refresh=1` forces.
- **UI** (`public/app.js` `loadCompanyVitals`/`renderCompanyVitals`; `.cv-*` styles):
  `renderReport` calls it with `report.phase` — the **deep pass auto-reveals**
  firmographics (it's already the paid pass); a **free report** shows aliveness + a
  "Reveal company size (Apollo · ~1 credit)" button. Cache-bust `app.js?v=20260713vitals`.
- **No new table / permission** — reuses `domain_research_tool_lookups` + `domain_owner`
  + `APOLLO_ENRICH_API_KEY` (fail-open: no key → aliveness still shows, company null).

## Atom appraisal — second-opinion valuation (2026-06-27)

A second valuation shown ALONGSIDE Appraise.net in the Appraisal tool (Atom.com /
ex-Squadhelp). Source `lib/sources/atom_appraise.js` → `atom_appraise`.

- **Endpoint** `GET https://www.atom.com/api/marketplace/domain-appraisal` with
  **query-param auth**: `api_token` (= the account's **appraisal_api_key**, NOT the
  general api_key) + `user_id` + `domain_name`. Env: `ATOM_APPRAISAL_KEY` +
  `ATOM_USER_ID`. Errors come back as HTTP 200 `{message:…}` (bad token / missing
  param / **daily limit**); a real result carries `atom_appraisal`.
- **Response** → normalized `{value (USD), score (0–10), positive_signals[],
  negative_signals[], tm_conflicts, date_registered, is_listed, bin_price, usage}`.
- **⚠️ HARD DAILY CAP (~10/day, `user_level:B`).** So: (1) the source is
  `agentExcluded: true` — the autonomous research agent NEVER sees it (a run can't
  exhaust the quota), enforced by a `!s.agentExcluded` filter in `getToolSpecs`;
  (2) the UI is **cache-first** (lookup kind **`at`**, module `appraisal`) so a
  re-view never re-spends. Only the Appraisal tool calls it (via `api/lookup`),
  cached per domain.
- **UI** (`public/app.js`): `loadAtomAppraisal`/`renderAtomAppraisal` render a
  `#ap-atom` panel below the Appraise.net card (value + score + TM-conflict chip +
  signals + "N/10 left today" quota). Key not set → panel stays hidden; daily-limit
  / error → a quiet note. `.ap-atom-*` styles. Cache-bust `app.js?v=20260626atom`.
- **Gating:** `moduleForSource('atom_appraise') = 'appraisal'`, category `Valuation`.
  NOT in PAID (no per-call $ meter; the constraint is the daily cap, not credits).
- **Verified live 2026-06-27:** spanglish.com $97,500/score 10; arx.com
  $1,339,000/score 9. **One-time setup:** set `ATOM_APPRAISAL_KEY` + `ATOM_USER_ID`
  in Vercel (research project).

## SNAP Eval — should-we-buy-it acquisition/resale scorecard (2026-06-28)

A new module that takes ONE domain (+ optional purchase price) and returns a
defensible **buy / don't-buy** verdict for investment/resale: a fair RESALE value
range and five price bands (**immediate buy → decent → neutral → would avoid → bad
purchase**). UI at **research.snagged.com/research/evaluate**, gated by the new
`research.evaluate` module permission. Branded **SNAP Eval** (top-level **SNAP**
menu in the admin hub, alongside Research/Admin/Reports — see snagged-admin).

- **Comprehensive signal gather** (`lib/evaluate/signals.js` `gatherSignals`): runs
  everything in parallel, each fail-open — SLD/TLD quality, RDAP age, live-site use
  (parked/active), DomainScout for-sale + asking, Appraise.net + Atom appraisals,
  comps (below), **NamePros** forum chatter, **straight Google** of the exact domain
  AND the SLD term (who's using it / competition), and a **Gmail sweep** (has anyone
  emailed us about it — via the admin internal endpoint, 12s-capped).
- **Master Txns List comps (real sold prices)** (`lib/evaluate/trackerComps.js`):
  pulls comparable REAL transaction prices from the Snagged Domain Tracker's
  **"Master Txns List"** tab via snagged-admin's internal endpoint
  `/api/internal/sales-comps` (shared-secret `RESEARCH_INTERNAL_SECRET`, columns
  auto-detected by content, 5-min cached). Matches by `same_sld` (the exact word on
  any TLD — strongest) / `same_tld` (same extension, similar length). This is the
  gold-standard comp (verified prices, not asking) → value anchor weight 2.4
  (discount 0.85) + counts as STRONG confidence. Reuses the existing internal-secret
  + Google SA (no new env). Leads the comps UI section.
- **Comps = four more sources** (`lib/evaluate/comps.js` + `lib/db/dealComps.js`):
  **NameBio exact** sales of the domain (`namebio_sales`, 1 credit), **NameBio
  comparable sales** (`namebio_comps` → the Comps engine, ~25 credits, up to 25
  recorded RETAIL sales of SIMILAR names — the real comp set when there's no exact
  sale; `agentExcluded`, SNAP-Eval-only), **internal asking comps** (structurally-
  similar priced ROWS from `name_universe` + Master with their marketplace source —
  discounted to realizable), and **Snagged's own deal history** (real offers/budgets
  from `marketplace_deal_reports`, read DIRECTLY via `getDb()` since that table lives
  in the SAME main project — no cross-app call). **Appraisals** (Appraise.net + Atom)
  are pulled per name and shown as their own block. The comps section lists ACTUAL
  rows (domain · price · date/venue · source), not just a distribution. NameBio
  comparable sales feed a value anchor (weight 2.0, discounted 0.75 to realizable).
- **Quality** (`lib/evaluate/quality.js` + `tld.js`): deterministic 0–100 SLD score
  (length, dictionary class, word-count, pronounceability, cleanliness) × TLD
  liquidity tier × SLD/TLD synergy. Pure + inspectable.
- **Valuation = deterministic, LLM nudges** (`lib/evaluate/score.js` →
  `lib/evaluate/verdict.js`): `computeValuation` builds weighted value ANCHORS
  (NameBio×3, deal-history×2.5, internal comps, appraisals discounted, listing as a
  ceiling, quality baseline) → realizable mid → the 5 bands as fractions of mid
  (immediate ≤0.35 · decent ≤0.6 · neutral ≤0.95 · avoid ≤1.4 · bad >1.4). The LLM
  (`EVALUATE_MODEL`||`OUTREACH_MODEL`, default sonnet) reads the full evidence + the
  buyer pool, writes the narrative (headline/rationale/reasons_for/against/
  buyer_summary), and may apply ONE **clamped [0.6,1.6]** adjustment to mid; bands
  recompute from the adjusted mid. No key → pure-deterministic fallback narrative.
- **Buyers/competition** (`lib/evaluate/buyers.js`): reuses Sales Research standalone
  — `anglesForSeed` (LLM buyer angles + firmographic-verified headliners) +
  `discoverUpgrade` (same SLD across extensions/affixes; `active` ones = who's
  already using the term).
- **API** (`api/evaluate.js`, gated `research.evaluate`, maxDuration 60): `GET
  ?domain=&price=&refresh=` → `{evaluation, price_overlay}`; `GET ?list=1`. **Cache-
  first by DOMAIN** (kind `ev` in `domain_research_tool_lookups`) — the heavy paid run
  happens once per domain; changing the PRICE just re-overlays the band instantly
  (`bandForPrice` over the cached mid), never re-spends. `refresh=1` forces fresh.
  Cost posture = "one pass" (every fresh run gathers paid comps/appraisals/
  firmographics) but cached per domain.
- **UI** (`public/app.js` `ev*` helpers; `#view-evaluate` + `#nav-evaluate`; `.ev-*`
  styles): verdict banner (colored band pill + fair value + max bid), price-band
  ladder, reasons-for/against, comps tables (+ "how the fair value was built"
  anchors), buyer angles, the-domain-today, and a collapsible evidence/chatter block.
  Cache-bust `app.js?v=20260628snapeval`.
- **No new table / migration** — reuses `domain_research_tool_lookups` (kind `ev`,
  KIND_MODULE `evaluate` added to `api/lookup.js` for the recent-list). Uses existing
  env keys (SERPER, NAMEBIO, APPRAISE_NET_*, ATOM_*, DOMAINSCOUT, APOLLO, ANTHROPIC,
  and ADMIN_INTERNAL_BASE/RESEARCH_INTERNAL_SECRET for the email sweep) — each
  optional + fail-open. **One-time setup: grant `research.evaluate`** per-user in the
  snagged-admin Users editor (admins auto-pass).

## Naming Exercise — "Build around a word" variations mode (2026-07-09)

Second mode of the Naming Exercise (`/research/naming`), for a client who's LOCKED
their name and wants the domain landscape around it (Sentinel engagement drove this).
The existing theme search matches the marketplace corpus by `semantic_keywords` and
can NEVER hold a specific word fixed — so it returned public-safety-*themed* names
(convict.ai) instead of `sentinel*` variants. This mode enumerates instead of searches.

- **Engine** `lib/variations/{enumerate,sweep,affixes}.js`: `enumerateVariations(seed,
  {excludeTlds,prefixes,suffixes})` builds friction-clean candidates — `PREFIXES`+seed /
  seed+`SUFFIXES` on `.com`, plus the exact word across `TLDS` — dropping any **seam-doubled**
  SLD (`sentinel`+`labs`→double-L) and excluded TLDs. **Word-aware affixes** (`pickAffixes`,
  Haiku, fail-open to full lists): one cheap call filters the affix set to what reads
  naturally for THIS word (`goswimming` ✓ / `gobathroom` ✗) + may add a few word-specific ones.
- **Three independent for-sale/disposition signals per candidate** (`sweepVariations`,
  bounded-concurrency, all fail-open) — we do NOT trust any one alone:
  (1) **nameservers** (`dns.resolveNs` → `MARKETPLACE_NS` map: dan/atom/afternic/sedo/…) =
  listed NOW, immediate, no scan; (2) **live page crawl** (`inspectSite` → `fetchText` +
  `extractClues`) catches an owner's **custom "for sale" page** + marketplace redirects,
  classifies **active vs parked vs no-resolve**, AND reads the **asking price off the page**
  (`extractPrice`; gets HugeDomains/Atom/custom-page prices, misses JS-only Afternic/Dan
  landers); (3) **DomainScout** is a **targeted price-only fallback** — called ONLY for
  for-sale names the crawl couldn't price, returns data only for names it ALREADY monitors
  (**`track:false` — never ADDS names to the watchlist**), does NOT gate results and adds
  ~nothing for a fresh word (the crawl is the real price source). Merged into one `category`
  (`for_sale`/`available`/`active`/`parked`/`registered`) + `for_sale_source` + `evidence`.
  Ranks for-sale (cheapest first) → available → parked → active → registered; `.com` first.
  `api/naming.js` `maxDuration` bumped to 60 for the crawl.
- **API**: `api/naming.js` action `variations` (`POST {action:'variations', seed, exclude_tlds?}`
  → `{seed, domainscout, count, results:[{domain,kind,affix,status,for_sale,price,currency,marketplace,link}]}`).
  Same `research.naming` gate; no run persisted. `withCategory('naming')`.
- **UI** (`public/app.js`): a **mode toggle** (`#naming-mode`, 🔍 Find by theme / 🎯 Build
  around a word) swaps the input hint + `runNaming()` branches to `runVariations()`; results
  render in `#naming-variations` (`renderVariations`, `.nmv-*` styles) with a category pill
  (for sale / available / active / parked / registered) + evidence line + price + marketplace
  + CSV download. `.ai` excluded by default (public-safety buyers). Cache-bust `?v=20260709variations2`.
- **Saved like a theme run** — persisted to `naming_runs` (`filters.mode='variations'`,
  seed in `brief`, rows in `buy_ready`, `criteria` in filters); shows in Recent, deep-links
  `/research/naming/:id`, reopens via the variations branch in `openNamingRun`. In variations
  mode the theme parsed-filters panel is hidden; a **criteria panel** (`nmv-criteria`) shows the
  actual prefixes/suffixes/extensions used + exclusions. **active vs parked** requires a real
  branded `<title>` (a GoDaddy/registrar lander renders no server title → `parked`, not active).
- **No new permission / table / env** — reuses the naming gate + DomainScout key.
- **"Export to Google Sheet" now works — via admin's SA (2026-08-27).** The button was dead: it
  needed `GOOGLE_SERVICE_ACCOUNT_JSON` in THIS project (never set — research holds no Google creds),
  so `handleExport` returned 501. Fixed by routing through admin (which owns the service account):
  `lib/gsheet.js` `createSheet({title, values, shareWith})` POSTs the rows to admin's internal
  `/api/internal/naming-sheet` (`x-internal-secret == RESEARCH_INTERNAL_SECRET`, `ADMIN_INTERNAL_BASE`),
  which creates the sheet in the "Snagged Pipeline" shared drive + shares it to the user + returns the
  URL (admin side: snagged-admin `lib/gsheets.ts` + that route). `api/naming.js` `handleExport` now
  builds the same 7-col values (Domain/Price/Source/Status/Relevance/Bucket/Link) and calls it — dropped
  the old `@googleapis/*` dynamic import + `NAMING_EXPORT_SHEET_ID` path. Client contract unchanged
  (`{url, count, warning?}` → opens the sheet in a new tab), no cache-bust. **No new env** —
  `RESEARCH_INTERNAL_SECRET` + `ADMIN_INTERNAL_BASE` already set. Same pattern reusable by any research
  surface that needs a Sheet (Sales Hub, portfolio, etc.).
- **Marketplace price extraction (2026-07-09).** The crawl now prices the two big
  JS-lander gaps directly (both free, no key), so DomainScout is rarely needed:
  (a) **Afternic BIN** (`afternicBin` — `"buyNow":<micros>`/1e6); (b) **Sedo**
  (`sedoPrice`) — Sedo's lander is a JS shell that IP-allowlist-blocks scrapers, but
  the SAME data the browser reads sits behind a plain JSON endpoint
  `GET sedo.com/api/domain-details/information/<domain>` → `buynow.priceOptions.{price,
  priceMin,currency}` (in **cents**; `isBuyNowPlus` = an offer floor→buy-now ceiling
  RANGE, shown only when the floor is ≥20% of the ceiling); a `makeoffer`-with-no-buynow
  = offer-only (row flagged `make_offer`, UI shows "Make offer"). Currency preserved
  (€/£/$). Order in the price fallback: afternicBin → sedoPrice → DomainScout.
- **Buy-now vs minimum-offer (Spaceship).** A Spaceship lander (served in-place on the
  domain) embeds `window.DOMAIN_CONFIG` — `parseSpaceship` reads it to tell a FIRM
  buy-now (`buyItNowOnlyEnabled`/`ltoConfig.totalPrice`, e.g. heysentinel.com $16k) from
  a **minimum-offer FLOOR** (`offerEnabled`+`minOfferPrice`, NO buy-now — e.g. nolan.ai
  "requires a minimum $69,500 offer", a name you canNOT just buy). The floor rides a
  distinct `min_offer` field (never `price`), UI renders it as the number + a "min offer"
  tag, CSV gets a **Price type** column (buy now / min offer / make offer). `mktName`
  now recognizes Spaceship (was showing a bare "view").
- **Availability confirmed via RDAP (2026-07-09).** A DNS NS lookup that throws
  NXDOMAIN marked a name "available" — but a registered-but-**undelegated** name
  (atlas.tech: taken, no active nameservers) throws the SAME error, so it showed
  Available when GoDaddy says "Domain Taken". The sweep now RDAP-confirms the
  (small) available set against the **registry's authoritative RDAP**
  (`rdapDomainStatus` in `lib/nameserver/query.js`, IANA bootstrap + ccTLD overrides
  — NOT rdap.org, which false-404s `.io`/`.me`): `registered` → reclassify (not free),
  `available`/`unknown` → keep. Only the DNS-NXDOMAIN names are checked (bounded).
- **Industry personalization (2026-07-09).** An optional **Company industry** field
  (Beast-Mode-only input `#naming-industry`) personalizes the affix + TLD sets:
  `pickAffixes(seed, env, {industry})` has the Haiku pass ALSO add industry-relevant
  prefixes/suffixes (healthcare → health/care/med/clinic → DartHealth / HealthDart)
  AND pick fitting REAL niche TLDs from `INDUSTRY_TLDS` (a curated ~140-entry pool in
  enumerate.js) → `dart.health`/`.care`/`.clinic`. Returned TLDs are validated against
  the pool (no hallucinated extensions). `sweepVariations` merges them via `extraTlds`
  into the base tier-1/2 set (+ criteria panel shows them as filterable chips).
  `industry` rides `filters.industry` (persisted + restored on reopen) and the response
  (summary shows "for <industry>"). Empty industry → unchanged behavior. An optional
  **Current website** field (`#naming-website`) does the same: `pickAffixes` fetches it
  (`siteSummary` — fetchText+extractClues, https→http, ≤700 chars) and feeds the
  title/description/excerpt into the Haiku prompt so it infers the product/positioning
  and proposes sharper affixes + niche TLDs. Both fields are optional + independent;
  `filters.website` persists/restores. Fail-open (unreachable site → no sharpening).
- **Renamed to "Beast Mode" (2026-07-09).** The mode toggle label is "🦾 Beast Mode"
  (internal `data-mode="variations"` unchanged). Added a **Type** filter facet
  (Prefix/Suffix/Extension toggle chips) — `variationsFilter.kind`, OR within, AND
  across the affix/tld facets.
- **Prefix/suffix combos on EXTRA TLDs — opt-in TLD picker (2026-08-10).** The affix
  (prefix/suffix) combos ran ONLY on `.com`, so a `.ai`-relevant seed missed `findtechno.ai` /
  `technolabs.ai` (the real upgrades for a `.ai` name). `enumerateVariations` gained an **`affixTlds`**
  option (default `['com']`) that runs the prefix/suffix combos on EACH listed TLD (de-duped, honors
  `excludeTlds`); `sweepVariations` accepts `affixTlds` and always unions `com` + the picks, exposing
  them as `criteria.affix_tlds`. `api/naming.js` `handleVariations` reads `body.affix_tlds` (≤8) →
  `sweepVariations`, persists them in `filters.affix_tlds` (restored on reopen). UI: a Beast-Mode-only
  **`#naming-affix-tlds`** input ("Also run prefix/suffix combos on these TLDs — e.g. ai, io; .com always
  included"); `runVariations` splits it on comma/space → `affix_tlds`. Off by default (adds ~one crawl
  round per extra TLD). Shared engine, so the Sales-Hub Beast Mode surface can adopt the same param
  later. Cache-bust `?v=20260810affixtld`.
  - **Collapsible checkbox dropdown, not a text field (2026-08-10).** The affix-TLD input is a
    **collapsible multi-select dropdown** (`#naming-affixtld-toggle` → `#naming-affixtld-menu` of
    `.naming-affixtld-opt` checkboxes, options `AFFIX_TLD_OPTIONS` = ai/io/co/net/org/app/dev/tech/
    xyz/me/so/us/gg/inc; `.com` always included so it's not offered). `affixTldsSelected()` reads the
    checked boxes → `affix_tlds`; `setAffixTlds()` restores on reopen; the toggle shows a `(N)` count +
    closes on outside click. **Display bug fixed same commit:** `prettyVarDomain` used the RAW seed, so
    a full-domain seed ("monkey.ai") rendered combos as "UseMonkey.ai.com" / "Monkey.aiLab.ai" — now it
    strips the seed to its SLD first (the enumerated domains were always correct; only the label was
    garbled). Cache-bust `?v=20260810tldpicker`.
- **Cross-references OUR corpora (2026-07-09).** The sweep now ALSO batch-looks-up the
  enumerated set against `name_universe` + the `Master Domain List` (`lib/variations/
  corpus.js` `lookupInternal`, one exact-domain `.in()` per corpus, parallel to the live
  sweep, fail-open). Each row gets `r.internal` — `in_universe`/`in_master`, our stored
  `best_price`/`price` + source, and an `owner` (owned-feed universe → Snagged/Rob, or a
  Master attribution). UI shows a "📇 In our corpus · $X · afternic" / "🏷 <owner>" badge
  under the domain; CSV gains In-our-corpus / Owner / Our-price columns. Two safe
  behavior changes from the corpus signal (2026-07-13): (1) a FOR-SALE row the live
  crawl couldn't price is filled from our stored price (`price_internal`, tagged "our
  corpus"); (2) a **registered/parked** row is **PROMOTED to `for_sale`** when our corpus
  has a PRICED listing for it (`for_sale_source:'corpus'`, `cleanMktLabel(source)` →
  Afternic/Sedo/BrandBucket/…, + a marketplace deep-link for Afternic/Sedo) — a name
  listed on a marketplace with an asking price IS for sale even when the live crawl only
  saw a registrar/holding page (JS landers, geo/UA gating, stale caches hide many
  marketplace landers). We still NEVER flip an `available` (free) or `active` (real live
  site) row on corpus data — only registered/parked, and only with an actual price.
- **Premium / reserved availability — Porkbun-authoritative (2026-07-09).** RDAP can't
  tell a registerable name from a registry-RESERVED / PREMIUM one (dart.app: no
  registration record → looks "available", but GoDaddy blocks it). A heuristic first
  flags `premium_risk` on AVAILABLE names on premium-prone TLDs (not com/net/org) with
  a short (≤5) or dictionary SLD (`filterDictionaryWords`, fail-open). Then
  **Porkbun `checkDomain`** (`lib/variations/availability.js` `porkbunCheck`, reuses
  `PORKBUN_API_KEY`/`PORKBUN_SECRET_KEY`) authoritatively resolves the flagged subset →
  reserved/taken reclassifies to `registered`, a premium keeps `available` + shows the
  ~$/yr price, a clean one clears the flag. **checkDomain is rate-limited ~1/10s**, so
  the sweep checks flagged names in order and STOPS on a rate-limit signal — results are
  cached per domain (kind `pkd`), so coverage converges across runs. No keys → the
  heuristic stands (UI shows "Available*" + "verify"). UI: premium-risk pill gets a `*`
  + a Comments note (premium price when known).
- **Clickable criteria chips = filters (2026-07-09).** The prefixes/suffixes/extensions
  chips in the criteria panel are now toggle buttons that narrow the table (extension
  → only that TLD, e.g. `.com`; prefix/suffix → only that affix). Within a facet = OR,
  across facets (affix × extension) = AND; a "✕ clear filter" resets. Client-side over
  the loaded `variationsLast` (no re-fetch); the count shows `N / total`; the CSV export
  respects the active filter (`rowMatchesFilter`). State in `variationsFilter`.
- **active vs parked — content rescue (2026-07-09).** A branded `<title>` alone
  wrongly demoted real personal SPAs that title themselves after their own name
  (nolan.so→"Nolan", nolan.dev→"nolan.dev"). `inspectSite` now ALSO rescues to `active`
  on real page CONTENT — an `<h1>` that isn't the domain/SLD, a meta description, or a
  navigable page (≥5 links + real text). A registrar holding has none (empty body, or
  h1 == the domain, ≤1 link), so it stays `parked`. Multilingual "under construction"
  (`en construction`/`im aufbau`/…) + builder-default titles ("My Company", title-only
  `HOLDING_TITLE_RE`) still force parked. Cache-bust `?v=20260709variations11`.
- **active-rescue tightened for bare-name placeholders (2026-08-06).** delegatecloud.com /
  delegatehub.com showed as `active` in Beast Mode but don't load in a browser. Two gaps in
  `inspectSite`: (1) delegatecloud.com serves a "This domain is brand new" placeholder — added
  `brand[- ]?new|new` + `(brand[- ]?new|newly registered|newly created|recently registered) domain`
  to `HOLDING_RE`; (2) delegatehub.com is titled only after its own SLD with nav links but no real
  h1/description — a builder/registrar placeholder. The `richNav` rescue now also requires the title
  NOT be a bare domain/SLD (`titleIsBareName = isName(title)`), so nav links ALONE no longer rescue a
  bare-name placeholder to active (a real minimal site still has a real h1/desc/branded title).
  Shared with the naming exercise (backend-only, no cache-bust).

## Nav sections — research SPA (config-driven, 2026-06-28)

The SPA's chrome is two layers: the **top header** (Research · Admin · SNAP ·
Reports, in `index.html` `.topbar__nav` — `topbar-research/-snap/-admin/-reports`)
and the **sub-nav** (per-section button groups). Both are config-driven so adding a
section / moving a tool is small + local. Mirrors snagged-admin's `lib/navigation.ts`
(keep the two in sync — same sections, same cross-app membership).

- **Sub-nav groups** in `index.html`: each section's buttons are wrapped in a
  `<span id="nav-<section>-group" class="nav-group">` (`nav-research-group` /
  `nav-snap-group` / `nav-reports-group`). `.nav-group { display: contents }` so the
  wrapper doesn't disturb the flex tab layout; `[hidden]` collapses the whole group.
- **Config** (`public/app.js`): `SECTION_NAV` maps each section → its `{group, topbar}`
  element ids; `VIEW_SECTION` maps a view → its section (default `research`; e.g.
  `evaluate→snap`, `portfolio/portfolio-runs→reports`). `showView` reads these to swap
  the visible group + light up the section in the top header (replaced the old
  hard-coded `inSnap` toggle). `VIEWS.<tool>.nav` points at the tool's button id.
- **Gating:** `gateNavByPermissions` hides per-button by permission; section topbar
  links are gated in `checkAuth` (`topbar-snap` by `evaluate`; `topbar-reports` by
  reports access **or** `portfolio`). A tab whose `href` is `/research/*` is SPA-routed
  (needs an `els.nav*` click handler); a cross-app `href` (`/reports/*`) just full-navs.
- **Runbook — move a tool to another section:** add it to `VIEW_SECTION` and move its
  `<a class="nav-btn">` into the target `nav-*-group` span (+ gate it).
  **Add a section:** add a `SECTION_NAV` entry + its `nav-*-group` span + a `topbar-*`
  header link (gated in `checkAuth`).

**Corporate Portfolios → Reports (2026-06-28):** moved `nav-portfolio` out of the
research group into `nav-reports-group` (alongside cross-app analytics links to the
admin Reports tabs); `VIEW_SECTION.portfolio = 'reports'`. So viewing it lights up
Reports + shows the Reports sub-nav. Admin side: `research.portfolio` added to that
repo's permissions + `REPORTS_TABS` (see snagged-admin CLAUDE.md).

## ⌘K palette — universal + type-ahead (2026-07-22)

The Cmd/Ctrl-K quick-switch (`public/app.js`, `#cmdk`) is now a universal, filtering command
palette (was: an unfiltered list of the domain tools for the typed domain). Two behaviors from
one box: type a **domain** (has a dot) → the domain tools, to run that name in any of them; type
**anything else** → a fuzzy search over EVERY accessible destination across the whole portfolio.
- **Universal list built LIVE from the DOM** (`cmdkNavDests`): every `.topbar__nav a` (Research /
  Admin / SNAP / Reports / Deals) + every `.nav-btn` sub-tab, skipping `hidden` (permission-gated)
  ones and the domain-tool routes (covered by `cmdkDomainTools`). No separate registry to sync —
  it mirrors exactly what the user can reach. Selecting a nav dest `.click()`s the real element
  (SPA-routes in-app, full-navs cross-app).
- **Ranking** (`cmdkScore`): exact-prefix > word-prefix > substring > subsequence, so "app" →
  Appraise to the top. Live-filters on `input`; ↑↓/Enter over the filtered `cmdkView`.
- A domain tool chosen in search mode runs for the `activeDomain` (or just opens the tool if none).
  Cache-bust `?v=20260722cmdk`.
- **Focus the lookup field on a ⌘K jump (2026-07-23).** After a ⌘K jump the cursor now lands in
  the tool's main lookup field so you can type immediately. Two fixes in `runCmdkItem` +
  `focusActiveLookup` (`?v=20260723cmdkfocus2`): (1) a domain tool picked **by name** (search
  mode, no domain typed) now OPENS the tool + focuses its field instead of silently re-running on
  a stale `activeDomain` (which left the field un-focused); only a REAL typed domain runs the
  tool. (2) `focusActiveLookup(preferId)` prefers the tool's known field via `TOOL_INPUT`
  (research→`domain`, whois→`whois-domain`, appraisal→`ap-domain`, trademark→`tm-query`,
  dbscreen→`db-domain`, nameserver→`ns-domain`, beeper→`beeper-domain`), scans `<textarea>` too
  (the Owner field is a textarea — the old input-only scan could never focus it), and retries a
  few frames since the view paints a beat after the nav click.
- **Cross-app Reports tabs in the palette (2026-07-24).** The palette found nothing for e.g.
  "Client Overlap" on a research page while the admin app's ⌘K did — because the admin **Reports**
  sub-tabs live in the Next.js app (not this SPA's DOM), the research DOM's few reports links are
  individually `[hidden]` (so the DOM scan skips them), and `CMDK_CROSS_APP` only listed Admin + Deals.
  Fixed by enumerating the FULL Reports set in `CMDK_CROSS_APP` (Site analytics / Marketplace Reports /
  Marketplace CMS / Chat / Cost & usage / **Client Overlap** / Social Sweep / Content / Corporate
  Portfolios) + the missing Deals·Owners, each gated by its section's topbar visibility (like the
  existing Admin/Deals entries). Now the research palette mirrors the admin palette's coverage. Keep
  `CMDK_CROSS_APP` in sync with admin `REPORTS_TABS`/`SNAP_TABS` (lib/permissions.ts). SNAP Eval/Bulk
  Eval + SNAP Opportunities/Names stay DOM-sourced (their nav-btns aren't individually hidden).
  Cache-bust `?v=20260724cmdkreports`.
  - **SEO + Email Health added to `CMDK_CROSS_APP` (2026-08-10).** The new admin **Reports · SEO**
    (`/reports/seo`) + **Reports · Email Health** (`/reports/email-health`) are admin-app pages (not in
    the research DOM), so the research ⌘K couldn't find them (SEO showed under the admin/Reports palette
    but not from Research). Added both rows so the hotkey is universal from any section. Keep this list
    synced with admin `REPORTS_TABS`.
- **Focus the lookup after a ⌘K jump that RELOADS onto research (2026-07-24).** The in-SPA
  `focusActiveLookup` can't survive a full page reload, so a ⌘K selection that full-navigates onto
  the research app (a `/research/*` cross-app href, OR a jump from the ADMIN app's palette) landed
  with no cursor in the search bar. Fix: a one-shot `sessionStorage['cmdkFocus']` flag (same-origin
  `app.snagged.com`, so it survives admin→research) — `runCmdkItem` sets it before a `/research`
  `window.location.assign`; the admin `command-palette.tsx` sets it before its `/research` assign;
  and `cmdkBootFocus()` (run at DOMContentLoaded) consumes the flag and calls `focusActiveLookup`
  with a LONGER poll (60×100ms — auth + first render is async). `focusActiveLookup` gained
  `(preferId, maxTries, intervalMs)`. Cache-bust `?v=20260724cmdkfocus3`.

## Notification bell — cross-app deep-links + wrapping (2026-07-23)

`openNotifLink` (public/app.js) used to `pushState + route()` for EVERY non-hash link — which for
a cross-app link (a deal notification's `/deals/<id>#comments`, an absolute app.snagged.com URL)
just re-routed the SPA to its home (Domain Research). Fixed: resolve the link to a pathname; only
`/research/*` routes in-place, everything else (`/deals`, `/admin`, `/reports`) does a real
`window.location.assign` — so clicking a deal/@mention notification lands in the deal (and the
admin deal-client scrolls to `#comments`). Also widened the dropdown (`.notif-menu`
`width:min(440px,…)`) and forced `.notif-item-title/-body` to wrap (`white-space:normal;
overflow-wrap:anywhere`) — long titles were getting cut off. Cache-bust `?v=20260723notif`.

## Expired-session → clear message on tool lookups (2026-08-11)

When the login session lapses, a gated `/api/lookup` (etc.) call returns the **login page HTML**
(or a 401), so the client's bare `await res.json()` threw the browser's cryptic **"The string did
not match the expected pattern."** — which surfaced verbatim in the tool status (reported on the
Appraisal tool for teleport.org; logging back in fixed it). Fix (`public/app.js`): a shared
**`apiJson(res)`** helper — on a 401/403 or a body that isn't JSON it calls `checkAuth()` (which
flips `els.login` on → shows the login panel) and throws a friendly **"Your session expired — log
in again."** (tagged `err.sessionExpired`). Wired into the main tool lookups: `runAppraisal` +
`pollAppraisal` (the poll now STOPS on `sessionExpired` instead of spinning to timeout), `runWhois`,
`runTrademark`, and `runEvaluate` (its `res.text()`→`JSON.parse` path now maps a 200-non-JSON /
401 to the same message). Other fetches that already `.catch(()=>({}))` are unaffected. Cache-bust
`app.js?v=20260811sessionexpired`.

## Appraisal tool — Pricing strategies ladder (2026-08-11)

The Appraisal report now shows a **Pricing strategies** strip (Aggressive / Balanced / Patient /
My Price / Conviction / Moonshot) mirroring Appraise.net's own dashboard — but computed CLIENT-SIDE.
**Why client-side:** the Appraise.net API (`appraise.net/api/v1`) only returns `estimatedValue {low,
high}` + `adjustedEstimatedValue` + `recommendation` + `confidence` + `factors`/`strengths`/`weaknesses`/
etc. (verified against a cached `ap` payload) — it does NOT return the pricing-strategy tiers; their
dashboard derives them from the range (their middle tiers come from a sell-through-rate model we don't
receive). We reproduce the ladder off the **`high`** value (the "retail" anchor — matches their "75% of
$225,000"). `public/app.js` `AP_STRATEGIES` (per-tier anchors) + `apRetailHigh(a)` + `apTierMult(s,high)`
+ `apNice(n)` + `apStrategiesHtml(a)`, rendered in `renderAppraisal` after the value row; `.ap-strat*`
styles.
- **CALIBRATED against their dashboard on THREE live examples (2026-08-11)** — SolInvictus.com (high
  $73k), EndZone.com (high $220k), Splitter.com (high $225k). Their tier prices **scale UP with value**
  (a premium name commands a higher fraction of retail: Aggressive ~27%→29%, Balanced ~34%→39%, Patient
  ~48%→54%, Conviction ~82%→101%), so each middle tier's multiplier is a **LOG-LINEAR ramp** in
  `apTierMult` anchored at $73k (`AP_LOG_LO`) and the ~$222k cluster (`AP_LOG_HI`) with `{lo,hi,min,max}`
  per tier, then clamped. Prices round to the **nearest $5k** (`apNice`, matching their UI). **My Price
  (0.75× high) and Moonshot (2× high) are shown EXACT** (`exact:true`, never rounded) — they match their
  dashboard to the dollar (e.g. SolInvictus Moonshot $146,000, not a rounded $150k). Verified 17/18 middle
  tiers match across the three examples (the one miss is a single $5k step — Splitter Conviction $230k vs
  their $225k — since their exact tier $ come from a sell-through model we don't receive).
- **Recalibrate:** edit the per-tier `lo`/`hi` (fraction of high at $73k / at ~$222k) in `AP_STRATEGIES`,
  or the anchors `AP_LOG_LO`/`AP_LOG_HI`. Cache-bust `app.js`/`styles.css` `?v=20260811pricingcalib`.

## Domain data model — canonical (do not let this drift)

Two domain corpora in **separate Supabase projects**; the search reads both.

- **`name_universe`** — project `snagged-naming-universe` (`SUPABASE_NAMING_URL` /
  `SUPABASE_NAMING_SERVICE_KEY`). **Everything automated**: all SNAP/pipeline +
  marketplace feeds (afternic, atom, sedo, namecheap, owned sheets, BrandBucket
  going forward). One row per `domain`, `sources[]` array, `source_tier` (1 owned,
  2 market). Written only by the snagged-admin pipeline. **TLD stored BARE** (`com`).
  Filters use `num_words` / `is_dictionary_word` (computed at ingest via wordfreq;
  NULL for non-dictionary SLDs). LLM enrichment = `category`, `emotions[]`,
  `keywords[]`, `industries[]` (arrays, separate paid pass).
- **Master Domain List** — project `Master Domain Name List`
  (`MASTERLIST_SUPABASE_URL` / `MASTERLIST_SUPABASE_SECRET_KEY`). **Manual / curated
  owner attributions only** (CSV/portfolio imports + real-owner rows + broader
  `snagged`). One row per `domain`, single `source` text + `owner`. Filters use
  `is_single_word` / `dictionary_word` (TEXT `'Y'`/`'N'`); `emotions`/`keywords` are
  `text[]` (migrated 2026-06; emotions stored Capitalized, so the search
  title-cases the emotion filter). 2026-06 cleanup removed ~3.75M marketplace
  placeholder dupes (backup `master_domain_list_backup`); ≈ 435K rows.

**Boundary rule:** automated/SNAP + marketplace → `name_universe`; manual/curated
owner attributions → Master. BrandBucket → `name_universe`.

**Part-of-Speech on BOTH corpora now (2026-08-05).** Master already carried the LLM-enrich
fields (`category`/`connotation`/`emotions[]`/`keywords[]`/`industries[]`) and `api/dbsearch.js`
`buildMaster` already filters on them — the ONLY gap was `part_of_speech` (Master had no such
column, and the old code SKIPPED Master entirely when a POS filter was active, so a Master-only
dictionary name — e.g. carrot.ai from `manual-image-import` — could never be POS-filtered). Fixed:
(1) `buildMaster` now applies `.overlaps('part_of_speech', pos)`; the 3 "posActive skips Master"
gates are removed and Master routes through a **`runMaster`** wrapper (mirrors `runUniverse`): when a
POS filter is active but the column isn't migrated yet, it returns Master **empty** (never unfiltered
wrong-POS rows) via a `masterPosMissing` flag + `missingMasterPos(42703)`; once the column lands, Master
is POS-filtered + included. `fetchAllMaster` gives the CSV export the same resilience. (2) **Column +
backfill:** `part_of_speech text[]` on the masterlist project + a WordNet backfill —
`backfill_structural.py` `_run_master_pos` (single-word rows only, `pos_for_sld(sld,1)`; sld derived by
stripping the TLD via `_master_sld`; empty `[]` marks non-dict/function words processed). Run via
`pipeline backfill-structural --target master --pos --commit` or the **backfill-quality-master.yml**
workflow's new **`pos`** input. **STILL TO DO (ops):** run the column SQL on the masterlist project +
dispatch the POS backfill (see snagged-admin CLAUDE.md). Until then search degrades gracefully (POS
just excludes Master, as before). NB a Master row is POS-tagged only for its single-word rows; a
multi-word Master SLD stays untagged (same as universe).

**Naming exercise enrichment (2026-06):** `lib/naming/query.js` matches a brief's
`semantic_keywords` against each candidate's enriched `keywords[]` / `industries[]`
arrays FIRST (true semantic match), then falls back to SLD-substring for
not-yet-enriched rows — three priority-merged passes + a general pass. Semantic
matches score 2× substring in relevance. Needs GIN indexes for speed:
`create index if not exists idx_universe_keywords_gin on name_universe using gin (keywords);`
(same for `industries`, `emotions`).

**Heavy-brief timeout (2026-06):** the non-priced keyword/industry passes have no
price filter, so a 50-term GIN overlap matches a huge set and the post-GIN
`ORDER BY quality_score` sort can hit the statement timeout. Per-pass fault
tolerance means a timed-out pass is dropped (the search still returns), and the
broad passes are now capped to the top 24 brief terms (`kwBroad`). Durable fix —
let the planner do an ordered top-N scan + overlap recheck instead of a full
sort: `create index if not exists idx_universe_quality on name_universe (quality_score desc nulls last);`

**Naming exercise = BOTH corpora (2026-06):** `lib/naming/query.js` now queries
`name_universe` AND the Master Domain List together — every Master row is for
sale, so Master is always in the candidate pool. Each corpus runs the same three
passes (enriched keywords[] overlap > industries[] overlap > general top); within
each priority tier the two corpora are interleaved round-robin (so Master isn't
crowded out by the universe's larger row count) then deduped by domain
(universe-first on overlap). Master rows are normalized to the universe row shape
(`normalizeMasterRow`): Master has no `sld` (derived from domain) and no
`quality_score`/`deal_score` (null — relevance ranking handles ordering); its
general pass orders by `price desc`. Master errors are non-fatal (log + continue
universe-only). **Master needs its own indexes** (run on the Master project):
`create index if not exists idx_master_keywords_gin on "Master Domain List" using gin (keywords);`
(same for `industries`), plus `create index if not exists idx_master_tld_price on "Master Domain List" (tld, price desc nulls last);`
and `create index if not exists idx_master_price on "Master Domain List" (price desc nulls last);`
— without them the overlaps/ordered scans over ~435K rows can hit the statement
timeout (the search just falls back to universe-only until they exist).

**Search endpoints:** `api/dbsearch.js` = Domain **Name** Search (filterable browse,
`db=both|universe|master`, gated by `dbsearch`); `api/dbscreen.js` = Domain DB
**Screen** (single-domain lookup, gated by `dbscreen`). Owner of owned-feed domains
is derived in `lib/sources/universe_ownership.js` (snagged/berserk → Snagged,
rob_purchases → Rob Schutz). TLD filters require a single-dot domain.
**Exact-domain lookup bypasses the browse filters (2026-07-09):** a dotted query
(`teamatlas.com`) is an "do we have THIS name" lookup — both `buildUniverse` and
`buildMaster` now short-circuit (exact `domain` match → return) BEFORE applying the
sidebar filters (length/TLD/word-count/price/…). Previously a stale filter (e.g. Max
SLD length 8) silently zeroed a present row (teamatlas SLD = 9 chars), which read as
"the Afternic dump is missing it" when the row was there all along (afternic feed,
best_price $39,999). Bare-keyword browse keeps every filter.

---

# Nameserver Search — domain⇄NS ownership triangulation (2026-06)

UI at **research.snagged.com/research/nameserver** (gated by the `research.nameserver`
module permission; hub tile in snagged-admin `app/page.tsx`). The play: a domain on a
**uniquely-configured** nameserver pair (e.g. a custom Cloudflare pair) is very likely
held by the same owner as everything else on that pair — so a privacy-walled core
domain can be cracked by finding a clearly-related sibling that DOES have public
contact info. Two directions: domain → its NS set; NS set → the domains using them.

**Dedicated zone DB.** Zone data lives in its OWN Supabase project `snagged-zone-index`
(ref `opzqyeuumusbmvqxehgf`, region us-west-2; pooler `aws-1-us-west-2.pooler.supabase.com`),
NOT the naming/master/research projects. App reads it via `ZONE_SUPABASE_URL` /
`ZONE_SUPABASE_SERVICE_KEY` (falls back to the naming project's vars if unset) —
`lib/db/supabase-zone.js` (`getZoneDb` / `isZoneDbConfigured`). **RLS enabled (no
policies) on all zone tables 2026-06-23** — the service key bypasses RLS so the app
is unaffected; closes the Supabase `rls_disabled_in_public` advisor (same fix already
applied to Master + naming).

**Table + partitioning.** `zone_domains(domain text, tld text, nameservers text[])`,
one row per domain, **LIST-partitioned by `tld`**. Live layout:
- `zone_domains_legacy` — the DEFAULT partition (holds the original 5: `dev/org/xyz/ai/co`).
  Partitioning was a **no-copy ATTACH-as-default** (rename old table → attach as default;
  the copy-based migration filled the disk → PANIC, so we abandoned it).
- `zone_domains_com` — `.com` (~163.25M).
- `zone_domains_io` — `.io` (~1.12M).

Counts (2026-06): com ~163.25M · org ~11.9M · xyz ~7.85M · io ~1.12M · ai ~1.08M ·
co ~1.04M · dev ~676K → **~187M domains**. The partitioned **parent has no PK**, so
**every partition needs its OWN two indexes**: a `domain` btree AND a `nameservers`
GIN. Without the btree, a lookup seq-scans the partition (the .com miss = a timeout —
that bit us). `lookupDomain` filters on `tld` so the planner prunes to one partition.

**Adding a TLD (repeatable runbook).** Two source formats: CZDS zone-master
(space-delimited NS records — `.com/.org/.dev/.xyz`) vs Domains-Monitor "detailed"
(semicolon CSV `"domain";"ns1,ns2";…` — `.ai/.co/.io`). Steps:
1. `create table zone_domains_<tld> partition of zone_domains for values in ('<tld>');`
2. Load (partition is index-free → fast COPY, no OOM): snagged-admin `scripts/load_ns.sh
   <tld> <file>` for the semicolon format (or the inline parser); big TLDs (.com) stream
   through the droplet so the file never lands on disk.
3. Build BOTH indexes + analyze (on XL with `maintenance_work_mem='2GB'` for .com; Micro
   `'256MB'` for small ones): `create index idx_zone_<tld>_ns_gin on zone_domains_<tld>
   using gin(nameservers); create index idx_zone_<tld>_domain on zone_domains_<tld>
   (domain); analyze zone_domains_<tld>;`
SQL/notes: snagged-admin `scripts/zone_domains_partition.sql`.

**Query lib** (`lib/nameserver/`):
- `query.js` — `lookupDomain` (tld-pruned), `domainsByNameservers` (`.contains`=@>=AND,
  `.overlaps`=&&=OR; **no ORDER BY** — sorting a huge match set times out, so a bare LIMIT
  lets the GIN stop early and we sort the page in JS), `samePairing` (siblings on the
  EXACT pairing). `liveNameservers` resolves NS for un-loaded TLDs in **three tiers**:
  live DNS NS → `rdap.org` → **authoritative registry RDAP via IANA's bootstrap**
  (`data.iana.org/rdap/dns.json`, cached) + a `CCTLD_RDAP` override map for ccTLDs that
  run RDAP but aren't in the bootstrap (`.io/.sh/.ac` → Identity Digital — this is why a
  SERVFAIL/`rdap.org`-404 `.io` like squeak.io still resolves). `isJunkNs` drops ephemeral
  verification/ACME-challenge NS records that would poison a pairing `@>` set.
- `context.js` — `classifyPair(nameservers)`: `cloudflare_account` (accountUnique — same
  pair == same owner), `generic` (`GENERIC_NS` parking/registrar incl Afternic/Sedo/GoDaddy/
  Namecheap/**Spaceship/Dynadot/Porkbun** — short-circuit, NOT an ownership signal),
  or `shared`. `extractReportContext(run)` distills a Domain Owner report into owner/
  people/email-domains to steer relatedness.
- `relate.js` — `analyzeRelated` LLM pass (max_tokens 8000, `parseJsonLoose` + salvage
  for truncated output); `sweep.js` — `freeSweep` runs the free sources per sibling and
  cross-matches registrants against the linked report's people; `owner.js` — free owner
  dossier (whois+rdap merge).

**API** `api/nameserver.js` (`maxDuration=60`): modes `domain · ns · pairing · relate ·
owner · sweep · reports`. relate/sweep accept a `run_id` to pull report context. UI in
`public/app.js` (the `ns*` helpers): selectable results, free-sweep cards with a
consolidated owner dossier, 🔑 lead / 🎯 match badges, background deep-research that
consolidates back into the screen, and localStorage "recent lookups" chips.

**TLD facet filter (2026-06).** An NS lookup returns a per-TLD breakdown so the results
can be narrowed to one TLD with a click — a custom pair returns mostly `.com`, but the
ownership signal is often the handful of small-TLD names on it (e.g. the 47 `.vc`), which
`.com` would crowd off the first page. `query.js` `nsTldFacets({nameservers,mode})` →
RPC **`ns_tld_counts(p_ns,p_match)`** (group-by-count with an internal 5s
statement_timeout — exact for a selective NS, `→ []` graceful for a huge shared host);
both the `ns` AND `pairing` API modes return `tlds:[{tld,count}]` **only on the unfiltered
(All) query**, and the UI's `.ns-tldbar` chips (a `data-ns-scope` routes the re-run to the
NS-search list vs the domain→same-pairing siblings) re-run the lookup with `&tld=<x>`
(server-side, partition-pruned via the existing `domainsByNameservers` `.eq('tld')`).
**CSV export** pulls the FULL match (not just the loaded first page) via `&full=1` →
`EXPORT_MAX=50000` cap, respecting the active TLD filter (`nsExportPairingCsv` re-fetches
when `listHasMore`). **One-time setup:** run
`snagged-admin/scripts/ns_tld_counts.sql` on the `snagged-zone-index` project (without it
the bar just doesn't render; results still work).

**Open / next:** rotate the exposed zone DB password; give the 5 legacy TLDs their own
partitions (independent refresh); write `update_<tld>.sh` + a cron for periodic refresh
(esp. `.com`); the live-resolve path is now robust but only a fallback — loaded TLDs
answer from the index.

**BACKLOG — marketplace verification-token → owner triangulation (Rob, 2026-07-23).** Marketplaces
issue a UNIQUE per-account verification string that the owner must publish as a DNS **TXT record** to
list a domain — e.g. Afternic's `afternic-verification-<accountToken>` (same token across ALL of that
owner's listed domains). Same idea for a unique verifying **nameserver** an owner sets to prove
control. So a single known token (or NS) → every domain that owner listed, INCLUDING names they've
since moved elsewhere but whose stale TXT record survives. Play: harvest the TXT/NS records for a
seed domain we know the owner of, extract the marketplace verification token, then reverse-search
that token across our zone/DNS corpus (and live DNS) to surface the owner's whole footprint. Strong
signal for Nameserver Search / Domain Owner triangulation. Not built — needs a TXT store or live-TXT
sweep + a token→domains reverse index (the zone DB holds NS, not TXT today).

---

# Beeper — RDAP drop watcher (adaptive cadence, 2026-06-12)

UI at **research.snagged.com/research/beeper** (gated by the `beeper` module permission).
Watches a domain's RDAP status and alerts (bell + email) the instant it changes —
especially the drop to available. **Universal team watchlist** (`listWatches()` returns
every user's watches; each row carries `submitted_by` for the who-added-it chip;
`stopWatch(id)` lets any Beeper user stop any watch).

- **Adaptive cadence** (`lib/beeper/cadence.js`) — the cron still fires every minute
  (`vercel.json`), but a watch is only actually hit when it's **DUE** (`isDue`).
  `checkIntervalMs(watch)` is a pure function of the watch's `expiration` + current EPP
  `last_status`: **pending-delete → 1 min**, redemption/restore/auto-renew → 1h, else
  taper by days-to-expiry (>14d weekly · >7d daily · >2d 12h · >1d 6h · day-of hourly ·
  past-but-clean 6h · **unknown 1h** — bootstraps the date then tapers). So a name on
  the cusp is polled every minute; a name
  months out is polled occasionally and tightens as the date nears. The cron filters to
  due watches and persists `expiration` from RDAP each check; `listWatches` attaches a
  `cadence` summary (`cadenceInfo`: tier/label/days_to_expiry/next_check) for the UI,
  which groups rows into **🎯 Drop watch — live** / **🕒 Long-term** / **✓ Finished** with a
  per-row cadence chip.
- **`expiration` column** is a later add — `addWatch`/`updateWatch` write it best-effort
  and **strip+retry on a column-missing error**, so the app degrades gracefully (cadence
  falls back to a 6h default) before the migration runs. **One-time migration:**
  `supabase/migrations/0010_beeper_expiration.sql` (`alter table beeper_watches add column
  if not exists expiration timestamptz`) on the research project.
- **Safety cap** still applies (`BEEPER_MAX_WATCH_DAYS`, default 60) → auto-stops a watch.

## Drop Campaign — availability poll + auto-register (2026-07-20)

A per-watch add-on for names we're actively trying to LAND (a client's drop). Beeper owns
the registry timeline (RDAP + 1-min cadence in pendingDelete); a Drop Campaign adds the two
signals RDAP can't give, on the SAME due-tick (so cadence gives it increasing frequency):

- **Registerable-now** — `porkbunCheck` (authoritative "can I buy it this second"). On the
  first `avail:yes` it alerts LOUDLY, and if **auto_register** is on, calls
  `attemptRegister` (`lib/beeper/register.js`, **registrar-agnostic** — pick via
  `BEEPER_REGISTER_PROVIDER`, else auto-detect from keys). **Porkbun's API has NO register
  endpoint** (excluded). The CLEAN providers (single call, account-default contact) are
  **NameSilo** (`NAMESILO_API_KEY`) and **Dynadot** (`DYNADOT_API_KEY`) — set one + fund the
  account to ARM. GoDaddy/Namecheap are stubbed (`not_wired`) — they need a full
  contact-profile payload (+ Namecheap a static-IP allowlist); wire on request. No armed
  provider → falls back to an urgent "register manually NOW" alert. Guardrails: fires ONCE,
  skips a PREMIUM over `BEEPER_AUTO_REGISTER_MAX` ($500 default).
- **Listed-for-sale** — `domainscout_lookup` (`track:false`): a catcher grabbed it and put
  it on a marketplace → alert to buy it. None of these read the domain's homepage.
- **Wiring:** `lib/beeper/dropcampaign.js` (`campaignDue` gates it to the delete lifecycle;
  `runCampaign` returns state + newly-fired `alerts[]`). `api/cron/beeper.js` runs it after
  the RDAP block for `drop_campaign` watches and fires `notifyCampaign` (bell + email).
  Columns `drop_campaign`/`auto_register`/`campaign(jsonb)` on `beeper_watches` (migration
  `supabase/migrations/0012_beeper_dropcampaign.sql`; writes strip+retry until migrated).
  API `api/beeper.js` accepts `drop_campaign`/`auto_register`; UI = two checkboxes on the
  Beeper add form (auto-register gated behind the campaign toggle + a confirm). Cache-bust
  `?v=20260720dropcampaign`. **Setup: run 0012 + set `NAMESILO_API_KEY` to arm auto-register.**

## Expiring .ai — SNAP redemption-window report (2026-07-27)

A SNAP-section report (`/research/expiring`, gated `research.expiring`) surfacing GOOD
one-word dictionary **.ai** names that just entered the **redemption / pending-delete**
window — the owner let them lapse (a restore is deliberately expensive), so they're about
to drop and cheap to grab. Sam's ask: "Status = redemption period," stay away from domain
investors. Reuses Beeper's RDAP + adaptive cadence; **no new vendor/env key**.

- **Curation = DICTIONARY-driven, NO DNS gate (Rob 2026-07-27: "just use basic RDAP").**
  `lib/expiring/candidates.js` `curateSlice` keyset-pages the naming `english_words` table
  (`is_root=true` → drops plurals/inflections), enumerating good one-word `<word>.ai` (`/^[a-z]+$/`,
  len 3–12) and inserting them ALL — pure DB work, no per-word lookups, so slices are large
  (`pageSize` 1500; `?curate=N` clamp 10000). **Why not the zone:** a name in redemption has been
  REMOVED from the `.ai` zone (delegation pulled when it lapses), so the zone structurally misses the
  names we want. Cursor (a word) in `domain_research_expiring_ai_meta`; wraps at the end. Tunable
  `EXPIRING_AI_MIN_LEN`/`_MAX_LEN`.
  - **Earlier approach (removed):** a ~26-TLD DNS demand probe gated every word AT CURATION — but
    slow TLD resolvers made each word take 4–5s (timeouts), a 150-word slice blew the 60s function
    budget, ticks timed out mid-slice, and the backfill crawled. The TLD lookup now runs ONLY on
    redemption names (below), and curation is just RDAP-fed.
- **The scan is the only bulk lookup — a plain RDAP call per `.ai`** `lib/expiring/scan.js` `scanDue`:
  pulls the STALEST candidates (`last_checked` nulls-first), `isDue`-filters via **Beeper's
  `checkIntervalMs`**, RDAP-checks the due ones (`rdapStatus` — also returns `nameservers`), writes
  status + **captures `expiration`** so far-out names re-scan rarely (only the ones getting close).
  **Unregistered (404/available) names re-check only WEEKLY** (`dueForCandidate`). `inRedemptionWindow`
  = **redemption period ONLY** (NOT pending-delete/restore/auto-renew).
  - **Surfaced-name re-scan is a SWITCH, OFF by default (2026-07-29).** The transition logic always
    works: on a re-check `phaseOf` flips `in_redemption`→`in_pending_delete`, stamps
    `pending_delete_since`, `demand_ok` carries so no re-gate. The issue is ORDER — a pure
    `last_checked nulls-first` scan lets the ~54k first-scan backlog starve the ~140 surfaced names.
    Rob's call (2026-07-29): **spend every credit draining the 54k backlog FIRST**, then flip the
    switch on. So `scanDue` only pulls `dueSurfacedCandidates()` (rows with `in_redemption` OR
    `in_pending_delete`, `isDue`-filtered) ahead of the backlog when **`EXPIRING_AI_PRIORITIZE_SURFACED=1`**
    (env, no redeploy); off → 100% of the per-tick budget goes to the nulls backlog. Either way, once
    the backlog clears the surfaced names become the stalest and re-check on their own. **Surfaced
    cadence is ~3×/day** (`dueForCandidate` uses `EXPIRING_AI_SURFACED_INTERVAL_MS`, default 8h) — NOT
    Beeper's 1-min pending-delete cadence (that's for one hand-watched drop); a few checks a day catches
    the move to pending / the drop without per-minute nic.ai polling. `dueSurfacedCandidates` (db) is
    the surfaced-first query. Total nic.ai load unchanged (still ≤`limit`/tick).
  - **⚠️ The switch FROZE the pipeline once the backlog drained — fixed 2026-08-03.** The 2026-07-29
    assumption ("once the backlog clears the surfaced names become the stalest and re-check on their
    own") was WRONG. With `never_scanned=0`, `staleCandidates` (still ordered stalest-first, NOT filtered
    to due) returned the ~90 absolute-stalest names — all weekly-cadence `available` words NOT yet due —
    so `dueForCandidate` filtered them to zero, the scan wrote nothing, their `last_checked` never
    advanced, and they permanently CLOGGED the top. The due names (266 surfaced + ~2.7k near-expiry
    registered) sat below the clog and were never reached. Symptom: `last_checked` frozen (stuck at the
    last drain write), no new redemptions, nothing moving to pending/dropping — for days, even though the
    cron kept firing (curate cursor advanced). **Fix (`scan.js` scanDue + `expiringAi.js`):** three
    due-targeted slices filled in priority order, so the ~50k `available` pool can't clog: (1) SURFACED —
    `dueSurfacedCandidates`, ALWAYS re-scanned (switch ungated; `EXPIRING_AI_PRIORITIZE_SURFACED` now
    unread); (2) NEAR-EXPIRY REGISTERED — new **`dueRegisteredCandidates`** (available≠true, not surfaced,
    `expiration < now+90d OR null`, stalest-first) = the source of NEW redemptions, queried on its own so
    it's immune to the `available` clog; (3) GENERAL STALE — remaining budget from `staleCandidates`
    (oversampled `need*6`, due-filtered) for far registered + weekly `available` re-checks. Budget
    self-balances: surfaced drain first (~3 ticks), then near-expiry, then the rest; once surfaced are
    fresh (<8h) they drop out and free budget. nic.ai load unchanged (still ≤`limit`/tick, paced).
    - **Two follow-up bugs in the above fix (both 2026-08-03, now resolved):** (a) the rewrite renamed
      the backlog `due` array to `rest` but left two references to `due` (worker-concurrency `Math.min`
      + the return) → scanDue threw `ReferenceError` every tick, swallowed by the cron's try/catch → no
      writes; fixed to `queue`. (b) `dueRegisteredCandidates` was ordered by `last_checked asc`, which
      buried the past-expiry pipeline source behind far-from-expiry names merely scanned earlier → once
      surfaced drained, the near-expiry slice delivered nothing and the scan stalled again; reordered to
      **`expiration asc nulls first`** (by URGENCY) so past-expiry / lapsing names lead. Verified live:
      past-expiry overdue 115→0, scan steady at 90/tick, redemption→pending + drops flowing.
    - **NOT a bug — the demand gate rejecting high-`tld_count` names is correct.** After the fix, ~50
      names in redemption status showed `demand_ok=false` despite `tld_count` 10-22, which looked like a
      gate failure — but the gate keys off the **bounded ~26-POPULAR-TLD probe** (`popularTldCount`), not
      the full IANA count. DoH-verified: biomolecule = 3 popular TLDs, mesozoic = 5 (both <6) — their high
      full counts are inflated by obscure/cheap TLDs. So niche words (paleocene/oligocene/biomolecule/…)
      correctly fail the ≥6 gate. **0 NEW surfaced in a given window is supply + gate, not a fault:** most
      names lapsing into redemption are low-demand words; good ones surface as they cross and pass ≥6.
  - **⚠️ Redemption stall — registered-only scan budget + 24h fail-safe (2026-08-11).** No new
    redemptions for ~2 days. Diagnosed via read-only SQL: the scan itself was healthy (2,232 checks/24h,
    `last_checked` ~1 min old), but **45 of 54 drops in 7d (83%) NEVER got flagged in redemption**
    (`redemption_since` null) — we were SKIPPING the ~30d redemption window because the ~43k registered
    pool re-scanned on a ~31-day cycle (>30d), and ~37% of the per-tick budget (836/day) was wasted
    re-checking the ~52k `available` dictionary names that never change. Auto-renewed lapsing `.ai`
    names carry a FUTURE expiry in the registered pool until they flip to redemption ~50d after expiry,
    so they hid there and dropped before the slow cycle reached them. **Fix (2 parts):**
    (1) **Registered-only scan budget** — `staleCandidates(limit,{registeredOnly})` adds
    `.not('available','is',true)`; `scan.js` general slice passes `registeredOnly: REG_ONLY`
    (`REG_ONLY = EXPIRING_AI_SCAN_AVAILABLE !== '1'`, default ON) AND takes the STALEST registered names
    regardless of per-expiry cadence (`REG_ONLY || dueForCandidate`), so the registered pool churns fast
    enough to catch the redemption window; the `available` pool is skipped (set `EXPIRING_AI_SCAN_AVAILABLE=1`
    to restore the old mixed behavior). (2) **24h fail-safe** (`lib/expiring/diagnose.js`
    `diagnoseRedemptionStall` + `runStallFailsafe` in the cron) — after each scan, if the newest
    `redemption_since` is >24h old it auto-runs the same triage (scan writing? throttled? unflagged drops?
    registered backlog clogged?), picks the likely cause, and alerts (bell to admin/expiring users +
    email to rob/sam) with a plain-language summary + fix. Deduped to ~once/12h via meta key
    `redemption_stall_alerted_at` (`getCursor`/`setCursor`). `?nofailsafe=1` skips it on a backfill tick.
    So the next silent stall surfaces in hours, not days.
- **TLD lookup runs ONLY on names in the redemption period** (Rob: "cut way down"). On a name's FIRST
  redemption sighting the scan runs the demand check ONCE: the **bounded ~26-TLD probe** (`popularTldCount`,
  `lib/evaluate/tldcount.js`, cache `xt`) decides QUALITY — surface only if **≥ `EXPIRING_AI_MIN_TLDS`
  (default 6)** (validated: dealt 17 · rica 16 · interlaced 12 pass; ferlie 4 · oxeyes 1 don't) — and
  the **full `countRegistrations`** (`lib/expiring/demand.js` `fullTldDemand`, ~1,590 IANA TLDs, cache
  `tc`, SAME as the TLD Count tool → matches exactly, abacus 248) is stored as `tld_count` for DISPLAY.
  Result cached in `tld_count` so re-sightings don't re-probe; reset to null if a name leaves redemption
  (so a re-entry re-checks). `in_redemption` = redemption AND quality-passed. So the only names ever
  DNS-probed are the handful actually in redemption — the 89k watchlist is never gated.
- **Nameservers shown + binary "likely investor" (2026-07-27).** The report shows the actual **first
  two nameservers** (so you can see spaceship / afternic / registrar-default) + a binary **Likely
  investor** chip. Investor = the NS is a **marketplace/for-sale host** (`lib/expiring/investor.js`
  `investorSignal` — Afternic/Sedo/Dan/Atom/HugeDomains/Sav/Bodis/ParkingCrew/…), NARROW by design:
  registrar-DEFAULT DNS (Namecheap `registrar-servers`, GoDaddy `domaincontrol`, Spaceship, Porkbun,
  Dynadot, NameSilo) is NOT flagged (it says nothing about ownership — this fixed dealt.ai being
  wrongly flagged). `parked` (stored) now means this investor signal. The report still SHOWS investor
  names by default; the "Hide likely-investor names" checkbox (`?hideParked=1`) is optional — an
  investor name near renewal may sell cheap, so it's a toggle, not an auto-hide. (Registrar-lander
  for-sale listings on spaceship/porkbun can't be told from NS alone — the shown NS lets a human judge.)
- **Pending-delete window + Metrics tab (2026-07-28).** The report is now a 3-tab view
  (`.xp-tabs`, `xpMode` in app.js): **Redemption** (default) · **Pending delete** · **Metrics**.
  - **Pending delete** = names that moved OUT of redemption into the final ~4–6-day countdown to
    the drop (most imminent — pitch clients now). `redemption.js` `phaseOf(statuses)` →
    `redemption`|`pending_delete`|null (pending takes precedence). `scan.js` now tracks BOTH phases:
    a name is gated ONCE per lapse (`demand_ok` remembers the ≥MIN_TLDS pass so it carries across the
    redemption→pending transition without re-probing), sets `in_redemption`/`in_pending_delete`,
    stamps `redemption_since`/`pending_delete_since` on first entry, and `dropped_at` on the terminal
    drop (keeping the lifecycle timestamps for metrics). A restore/renew resets the cycle.
    `pendingDeleteList` mirrors `redemptionList` (`in_pending_delete=true`, order by
    `pending_delete_since`). API `?phase=pending`; the alert/`entered` set fires on newly-surfaced in
    EITHER window. The digest email is STILL redemption-only (a first-seen-in-pending name isn't
    emailed — a possible follow-up).
  - **Metrics tab** = lifecycle DURATIONS aggregated by registrar (`lifecycleMetrics` in
    `expiringAi.js`, JS aggregation over the small tracked set, fail-open): **Expired → Redemption**
    (2026-07-29 — `redemption_since - expiration`, the auto-renew grace before a lapse, ~52–61d
    across registrars; populates immediately since both fields are already stored), **Redemption →
    Pending** and **Pending → Dropped** average observed days (+ n) per registrar + an all-registrars
    weighted row + current in-redemption/pending counts. API `?metrics=1` → `{metrics:{rows,overall}}`.
    Approximate (measured from our scan cadence), sharpens as full cycles are observed.
  - **Migration:** `supabase/migrations/0014_expiring_ai_pending_delete.sql` (adds `in_pending_delete`,
    `pending_delete_since`, `dropped_at`, `demand_ok` + partial index + backfills `demand_ok=true` for
    current redemption rows). App degrades gracefully pre-migration (staleCandidates/windowList/
    updateCandidate strip-and-retry the new columns; pending tab just shows empty until 0014 runs).
    Cache-bust `?v=20260728expiringphases`.
- **Tech/AI scan prioritization + expansion (2026-07-28).** .ai is a tech/AI TLD but the
  watchlist is seeded from a general dictionary, so `neural.ai` waited behind thousands of obscure
  words. Fix = a `priority smallint` (2 = tech-relevant, 0 = plain dict) that reorders the scan:
  `staleCandidates` now pulls `last_checked asc nulls first, priority desc` — among never-scanned
  names the tech ones go FIRST (no dict words dropped, they just wait — Rob's call). Two expansion
  sources feed priority 2:
  - **Curated lexicon** `lib/expiring/techTerms.js` (~345 AI/ML/data/infra/security/science terms,
    `TECH_VERSION`-gated). `techScore(sld)` boosts a matching dict word at curation; `seedTechLexicon`
    (cron, version-gated upsert via `upsertTechCandidates`) SEEDS the non-dict terms as new `<term>.ai`
    AND lifts existing dict rows to priority 2 without touching scan state. This is the reliable source.
  - **name_universe tech pull** `curateTechUniverse` — keyset-pages single-word SLDs in the tech
    CATEGORIES (`Technology & Software`/`Internet & Web`/`AI & Data`/`Crypto & Web3`/`Science & Research`)
    from name_universe (same naming project as english_words) → priority-2 candidates. **BEST-EFFORT /
    fail-open: name_universe has NO (category,sld) index, so this query times out and no-ops today.**
    Unlock the broader expansion with `create index on name_universe (category, sld);` on the NAMING
    project — then it lights up with no redeploy (it's already wired into the cron).
  - **Migration 0015** (`priority` col + `idx_expiring_ai_scan_order` on `(last_checked asc nulls first,
    priority desc)`). Degrades gracefully pre-migration (insert/stale/upsert strip-and-retry priority).
  - Cron `expiring-ai.js` runs `seedTechLexicon` + `curateTechUniverse` after curate, before scan
    (`?notech=1` to skip). The **demand gate is unchanged** (≥6 popular TLDs) — a tech-NATIVE coinage
    registered on few TLDs can still fail it; a tech-aware gate is the deferred Phase 3 (Rob chose 1+2).
- **Namecheap Market auction cross-reference (2026-07-28).** The last lifecycle stage — "listed
  on Namecheap." A public daily CSV (`Namecheap_Market_Sales.csv`, ~180MB / 1M rows, ~5.6k of them
  `.ai`) lists every Namecheap Market auction. `lib/expiring/namecheap.js` `fetchNamecheapAiAuctions`
  STREAMS the file (never loads it whole — web-stream reader + line split + a cheap `\.ai` prefilter
  + minimal CSV parser), returns `{domain,sld,price,end,url}` per `.ai` (~7s, fail-open). Daily cron
  `api/cron/expiring-namecheap.js` (vercel.json `45 8 * * *`, separate from the 5-min scan since the
  fetch would blow that tick's budget; `?dry=1` to preview) → `syncNamecheap` (expiringAi.js):
  **ANNOTATE-ONLY** (Rob 2026-07-28) — it cross-references the feed ONLY against the names we're
  already tracking as about-to-drop (`in_redemption` OR `in_pending_delete`, ~dozens) and stamps their
  `namecheap_price/end/url` + `namecheap_listed_at` (first-seen). It does NOT seed new candidates — the
  watchlist stays dictionary/tech-driven; NC is just a signal ON the surfaced set. (An earlier cut
  seeded all ~5.6k .ai auctions as candidates → bloated "names watched" by ~5.6k and stole scan budget;
  reverted. Cleanup for that run: `delete from domain_research_expiring_ai where namecheap_listed_at
  is not null and last_checked is null and coalesce(in_redemption,false)=false and
  coalesce(in_pending_delete,false)=false;`) **A name can hit a Namecheap auction BEFORE it formally
  drops** (Namecheap auctions its own expiring inventory during the grace window), so
  `namecheap_listed_at` is a PARALLEL signal, not strictly after `dropped_at`. Surfaced: a **🔨 $price ↗**
  column on the row tables (links to the NC listing, sortable), an "on Namecheap" stat (surfaced-only),
  and Metrics-tab columns **On Namecheap** (count) + **Pending → Namecheap** (avg days, positive-only).
  A session-authed **🔨 Sync Namecheap** button on the report runs it on demand (no CRON_SECRET);
  `api/expiring.js` `action:'sync-namecheap'`. **Migration 0016** (`namecheap_listed_at/price/end/url`
  + index); degrades gracefully pre-migration. No new env/key (public CSV).
- **Tech-aware demand gate (2026-07-28).** `.ai` is a tech TLD, so a clearly tech-relevant word doesn't
  need to prove demand across as many extensions — the redemption demand gate is **≥4 popular TLDs for
  tech words vs ≥6 otherwise** (`MIN_TLDS_TECH`/`EXPIRING_AI_MIN_TLDS_TECH` default 4 in scan.js). Tech =
  `techScore(sld)===2` (lexicon) OR the candidate's `priority>=2`. Only the fresh gate uses it (legacy
  demand_ok-inferred rows unchanged).
- **⚠️ nic.ai RATE-LIMIT — the scan MUST be paced (2026-07-28).** nic.ai (Identity Digital, the .ai
  RDAP registry) throttles hard: an unpaced scan (500/tick, concurrency 4, + the rdap.org fallback
  that proxies to the SAME backend) got **~96% failed reads** (`last_http` null) — which is why the
  redemption count stayed stuck at 7 (only the ~0.9% that answered could be classified). Fix in
  `scan.js` + `rdap.js`: (1) `rdapStatus(domain, {single:true})` skips the rdap.org fallback for the
  bulk scan (registry-only — the fallback just double-loads nic.ai for zero new info; Beeper + the
  manual "Watch now" seed still pass no opts → keep the fallback); (2) low concurrency + a per-call
  delay + a budget-safe per-tick cap, ALL env-tunable: `EXPIRING_AI_SCAN_CONCURRENCY` (default 3),
  `EXPIRING_AI_SCAN_DELAY_MS` (300), `EXPIRING_AI_SCAN_LIMIT` (130). A tick that times out mid-scan is
  harmless (each name is stamped as checked, stalest-first, idempotent → the rest retry next tick).
  **2 / 90 (~1,080/hr) is the ceiling that holds.** Tried 3 / 130 (2026-07-28): held for ~10 min
  then nic.ai's rolling rate limit tripped and reads collapsed to 100% failure (0 ok / 130 fail),
  so it was reverted. Don't push past 2 / 90 without expecting throttling. First-scan backlog
  (~86k) clears in ~3 days at this rate; redemption names surface as they're reached, not in a lump.
- **Scan/curate cron** `api/cron/expiring-ai.js` (vercel.json `*/5 * * * *`, CRON_SECRET): curate a
  slice (`pageSize` 1500) + scan due (`scanDue` — paced, see above) + fire an in-app **bell**
  (only) to `expiring`/admin users when good names enter redemption. Query knobs
  `?curate=N&scan=N&nocurate&noscan` for backfill/tuning.
- **Digest email cron** `api/cron/expiring-ai-digest.js` (vercel.json `0 6,10,13,16,19,22 * * *` = ~6×/day,
  CRON_SECRET): emails **only the NEWLY-entered** redemption names (non-parked, `emailed_at is null`)
  to **rob@ + sam@** (env `EXPIRING_AI_EMAILS`, comma-separated) then stamps `emailed_at` (via
  `unemailedRedemption`/`markEmailed`) — so it's a stream of updates as names cross in, never
  re-sent. `?dry=1` previews without sending/stamping. Email is the ONLY email channel (the scan
  cron is bell-only) so rob (admin) isn't double-emailed. **No Slack yet** — Slack lives in the
  admin project; a pending follow-up if wanted.
- **API** `api/expiring.js` (gated `expiring`): `GET` → `{configured, stats, rows}` (in-redemption
  ONLY — `redemptionList` filters `in_redemption=true`; available/dropped names are tracked but NOT
  shown, since they're either already gone or a gated word whose .ai was never registered);
  `?hideParked=1` to hide investor-parking NS, `?dismissed=1` to include dismissed;
  `POST {action:dismiss|undismiss, domain}`; **`POST {action:seed, domains}`** → manually add +
  immediately RDAP-scan specific names (bypasses the alphabetical curation walk + gate; ≤25), so a
  human can validate/watch a name now. UI: a "＋ Watch now" input on the report.
- **DB** `lib/db/expiringAi.js` + table `domain_research_expiring_ai` (domain pk, sld, tld_count,
  nameservers[], parked, expiration, last_status[], in_redemption, redemption_since, available,
  last_checked, emailed_at, dismissed) — RLS auto-enabled by the `domain_research_%` loop.
- **Where it lives:** the dashboard is the **5th SNAP submenu** ("Expiring .ai"). `SNAP_TABS`
  (admin `lib/permissions.ts`) points at `/research/expiring`, so it renders in BOTH the admin SNAP
  sub-nav (cross-app link) and the research SPA SNAP nav — the report itself is the research SPA page.
- **UI** (`public/app.js` `expiring*` helpers; `#view-expiring` + `#nav-expiring` in the SNAP
  group; `.xp-*` styles): stats header, **TLDs** (full TLD count, number only — the Phase column
  was removed 2026-07-29 since each tab is single-phase), expiry +
  in-redemption-since, **Registrar** (from RDAP), **first-2 nameservers**, **Likely investor** chip
  (marketplace name), hide-investor toggle, per-row dismiss, CSV, domain → Appraisal deep-link.
  **Wide breakout (2026-07-29):** `#view-expiring` breaks out of the 860px `.wrap` to a centered
  `min(1400px,95vw)` on ≥1080px screens (via a negative margin-left) so the 9-column table has room
  and the registrant email/phone don't wrap mid-address (`.xp-regt` is `nowrap`, each on its own
  line); results/metrics containers are `overflow-x:auto` so mobile scrolls instead of wrapping.
  **Sortable columns (2026-07-28):** every column header is click-to-sort (`XP_COLS` +
  `expiringSortRows`/`xpToggleSort`/`xpSortVal`; blanks always sort last, numeric cols default desc,
  string cols asc, active header shows ▲/▼ + coral highlight). Client-side over the loaded rows
  (`expiringPaint` re-sorts without a refetch); the CSV export respects the active sort.
  Cache-bust `?v=20260728expiringsort`.
- **Registrar column (2026-07-27).** `rdapStatus` (`lib/beeper/rdap.js`) now also returns `registrar`
  (the role=`registrar` entity's vCard `fn` — "NameCheap, Inc." / "Dynadot Inc" — else its IANA id);
  additive, Beeper unaffected. Stored on the candidate (`registrar` column), shown as a report column
  + CSV. `updateCandidate` gained a strip-and-retry so a not-yet-migrated `registrar` column doesn't
  stall the scan. **Migration:** `alter table domain_research_expiring_ai add column if not exists registrar text;`
- **Registrant contact column (2026-07-29).** We already do an individual RDAP read per `.ai`, so
  the scan now ALSO pulls the **registrant contact** off the SAME response (`parseRegistrant` in
  `lib/beeper/rdap.js` → `registrantName/Email/Phone/Private`). PUBLIC vs PRIVATE is decided by the
  **EMAIL domain, not the org string** — private if: a **generic role localpart** (`GENERIC_LOCALPARTS`:
  `privacy@`/`whois@`/`abuse@`/… → catches `privacy@dynadot.com`), a **proxy/registrar domain OR any
  subdomain** of one (`PRIVACY_EMAIL_DOMAINS` incl. `gandi.net`/`dynadot.com`/`namecheap.com`/`godaddy.com`,
  matched with `endsWith` so `…@contact.gandi.net` → private), or a **hash-alias localpart**
  (`HASH_LOCALPART` = 16+ hex, optionally `-id`/`.suffix` — catches Gandi's `3fbcbb…-47512530@contact.gandi.net`).
  A real mailbox that showed through → surface it. When private, name/email/phone are ALL nulled (so a
  registrar's generic shared phone never shows either). **Display-time re-check (2026-07-30):** `emailIsPrivate`
  is exported + re-applied in `api/expiring.js` `registrantFields(shape)` — a row scanned BEFORE the privacy
  rules tightened (e.g. `privacy@dynadot.com` stored as public) reads 🔒 Private immediately without waiting
  for a re-scan (surfaced re-scans are off while the backlog drains); the enrich action re-checks it too so a
  stale privacy row can't spend a RocketReach credit. KEY CASE: nihil.ai's org is "Withheld for Privacy ehf" (Namecheap privacy) but
  its email is a plain `…@gmail.com` + a real UK mobile → we list it (the privacy org string lies; the
  email is real). ombu.ai (Domains By Proxy) → 🔒 Private. `parseRegistrant` prefers the `registrant`
  entity, falls back to administrative/technical; `PRIVACY_FN` drops placeholder `fn`s ("Registration
  Private"/"Redacted"/…). Stored on the candidate (`registrant_email/phone/name/private`), captured in
  BOTH `scan.js` (bulk) and the `api/expiring.js` seed path; surfaced as a **Registrant** report column
  (real email = mailto link + tel link, sortable public>private>unscanned) + CSV
  (`registrant`/`_email`/`_phone`/`_name`). `windowList` selects them with a strip-retry (degrades pre-
  migration). Cache-bust `?v=20260729expiringregt`. **Migration:** `supabase/migrations/0017_expiring_ai_registrant.sql`
  (4 columns, `add column if not exists`) on the research project — until it runs, the scan strip-retries
  the columns and the report just omits the Registrant column.
- **RocketReach enrichment of a public registrant (2026-07-29).** For a row with a PUBLIC registrant
  contact, a **🔍 RocketReach** button (in the Registrant cell) reverse-looks-up the real email AND the
  phone (two separate lookups — `rocketreach_lookup` now accepts a `phone` param, E.164) → ADDITIONAL
  emails/phones + name/employer/LinkedIn, merged + deduped (drops the contacts we already had). On-demand
  (spends a lookup credit; `runTool` records usage), cached in the row's **`rr` jsonb** so a re-view never
  re-spends. `api/expiring.js` POST `{action:'enrich', domain}` → `enrichRegistrant` (503 if
  ROCKETREACH_API_KEY unset, 400 for a private/empty row). Results render under the base contact with a
  "＋ RocketReach" tag; CSV gains `rr_emails/rr_phones/rr_name`. `getCandidate` (db) reads the row; `windowList`
  selects `rr` with a strip-retry. Cache-bust `?v=20260729expiringrr`. **Migration:**
  `supabase/migrations/0018_expiring_ai_rr.sql` (`rr jsonb`, `add column if not exists`) on the research project.
- **Permission:** `research.expiring` in snagged-admin `dashboard/lib/permissions.ts` (MODULES +
  SNAP_TABS + CATALOG group SNAP; stored flat as `expiring`). Grant per-user; admins auto-pass.
- **One-time setup:** run `supabase/migrations/0013_expiring_ai.sql` on the research project.
  Needs the naming `english_words` table (already live) — NOT the zone. Coverage fills in as the
  cron enumerates the dictionary (a few hours to seed all candidates) then RDAP-learns each name's
  status/expiration (first full pass ~1–2 days, paced to respect nic.ai RDAP; then steady-state is
  cheap — only near-expiry names re-check often). Force early: `GET /research/api/cron/expiring-ai?curate=5000&scan=800` with the CRON_SECRET bearer.

---

# SNAP Research — dictionary .com abandonment finder (Phase 1 backend, 2026-08-28)

A SNAP submodule that walks the English dictionary and builds, OVER TIME, a per-word report of
**abandonment + value** clues for the `<word>.com`, to surface **valuable one-word .coms whose owner
has likely let them go** — acquisition candidates for SNAP Deals. Rob's ask; scope locked with him
(TLD-count = VALUE not abandonment; ignore registration date — the signal is long-held-and-let-go).
Mirrors **Expiring .ai** (dictionary-fed candidate table + a paced background cron + a report).
- **Two INDEPENDENT axes** (`lib/snapResearch/score.js`, pure): **VALUE** (0..100 = TLD-count demand +
  word commonness (zipf) + brevity) and **ABANDONMENT** (0..100 = parked/no-resolve .com + live-but-stale
  footer year + unchanged-for-years via Wayback). A **candidate = value ≥42 AND abandon ≥42**; surfacing
  `score = value × abandon / 100` (both must be high). Validated: ledger.com(parked,18 TLDs,common)→cand;
  water.com(valuable but ACTIVE)→skip; zydeco.com(abandoned but rare)→skip.
- **Cost-smart enrichment** (`lib/snapResearch/enrich.js`): the cheap abandonment clues (live-site fetch
  via `fetchText`/`extractClues`, Wayback CDX first/last/count, DoH NS) run first; the **paid TLD-count
  probe (`popularTldCount`, 26 DNS) runs ONLY when the name already looks abandoned** (`abandon ≥38`) AND
  isn't for-sale, so we don't probe 98k words. All fail-open.
- **⚠️ Actively-for-sale = HARD DISQUALIFY (Rob 2026-08-28).** These are dig-up-the-owner BARGAIN buys, so a
  name being **marketed at retail** (Afternic/Sedo/Dan/Atom/HugeDomains/DomainMarket/BrandBucket/Squadhelp
  lander, a custom "for sale"/"make an offer"/"for inquiries" page, a GoDaddy/FD for-sale page) is out of
  range → **never a candidate**. `enrich.js` detects `for_sale` two ways — marketplace **nameservers**
  (`FOR_SALE_NS`, catches a JS-only lander we can't read) AND for-sale **landers/phrases** on the page
  (`FOR_SALE_HOST_HINTS` + `FOR_SALE_PHRASES` + `extractClues` signals) — and `candidate = !forSale && …`.
  `for_sale` contributes 0 to the abandonment score. Ad-only parking (bodis/parkingcrew) is NOT for-sale →
  stays a `parked` candidate (a plain parked page with no sale listing can still be a cheap owner buy).
- **TLDs column = full count for candidates (2026-08-28).** The value SCORE uses the cheap ~26-popular
  `popularTldCount` (keeps the 98k walk fast), but a **candidate**'s displayed `tld_count` is replaced with
  the FULL ~1,590-IANA `countRegistrations` so the "TLDs" column matches the standalone TLD Count tool
  exactly (across → 151, not 20/26). Bounded to candidates (rare) to keep the scan cheap; `countRegistrations`
  is cached (kind `tc`). Existing candidates pick up the full count on their next re-scan.
- **Ordering = most-common-first.** Curation (`candidates.js`) alphabetically keyset-seeds `<word>.com`
  from `english_words` (is_root, letters-only, len 3–15), carrying each word's **`zipf`** (new column —
  see admin `english_words.zipf` backfill). The SCAN (`dueForScan`) prioritises `last_checked nulls-first,
  zipf desc` — so the most-common (highest-value) words get enriched first regardless of seed order.
- **Cron** `api/cron/snap-research.js` (vercel.json `*/5 * * * *`, CRON_SECRET): curate a 1500 slice +
  scan ~30 due (concurrency 3), all env-tunable (`SNAP_RESEARCH_SCAN_LIMIT`/`_CONCURRENCY`/`_CURATE`/
  `_MIN_LEN`/`_MAX_LEN`). Knobs `?curate=N&scan=N&nocurate&noscan`. First seed ~5.5h; enrichment accrues
  over ~weeks, best candidates surfacing first (zipf-ordered).
- **API** `api/snap-research.js` (gated `snap_research`; admins auto-pass): GET → `{stats, rows}`
  (candidates, score desc; `?all=1` includes non-candidates, `?dismissed=1` includes dismissed);
  POST `{action:dismiss|undismiss, domain}`. DB `lib/db/snapResearch.js` + table
  `domain_research_snap_research` (+ `_meta` cursor) — migration **`0022_snap_research.sql`** (run on the
  research project; RLS enabled).
- **Permission:** `research.snap_research` (admin `permissions.ts` MODULES + CATALOG + SNAP_TABS,
  group SNAP, stored flat as `snap_research`).
- **Phase 2 — report UI (2026-08-28, SHIPPED).** SNAP nav tab `#nav-snap-research` +
  `#view-snap-research` (research SPA); `public/app.js` `snapResearch*` helpers (`loadSnapResearch`/
  `snapResearchPaint`/`snrRowHtml`/`snrToggleSort`/`snrExportCsv`) render a **sortable** candidate
  table (Domain · Value · Abandon · Score · Site · Stale © · TLDs · Unchanged-yr · Freq + CSV), default
  sort score desc, `?all=1` toggle for raw progress, stats header (candidates/scanned/seeded). Route
  `snap-research` added to `currentToolRoute` regex + `TOOL_PERMISSION` + `VIEWS` + `VIEW_SECTION` (snap)
  + nav gate `can('snap_research')`. `.snr-*` styles. Cache-bust `?v=20260828snapresearch`. **Also
  broadened the research SPA `topbar-snap` visibility** to any SNAP sub-tool (evaluate/bulk_eval/
  expiring/snap_research or reports access), not just evaluate — so a snap_research-only user can reach it.
- **Phase 3 — one-click → SNAP Deals (2026-08-28, SHIPPED).** A **＋ SNAP Deal** button per candidate:
  `api/snap-research.js` POST `action:'add_deal'` → calls admin internal **`/api/internal/snap-deal`**
  (`x-internal-secret == RESEARCH_INTERNAL_SECRET`, `ADMIN_INTERNAL_BASE`) which find-or-creates a native
  `snap_deal` (dedupe by domain) in Qualifying with the clues in Notes + returns its URL; the row is
  marked `added_deal` (button flips to "✓ In SNAP Deals ↗"). Admin side: `findSnapDealByDomain` +
  `app/api/internal/snap-deal/route.ts` (snagged-admin). Reuses existing `RESEARCH_INTERNAL_SECRET` +
  `ADMIN_INTERNAL_BASE` (no new env).
- **⚠️ CORPUS DISQUALIFIER — the key discriminator (Rob, 2026-08-29).** Live run surfaced the
  crown-jewel premiums (just.com/give.com/look.com/key.com — all abandon 55 because a pro holds them
  DARK, i.e. `no_resolve`) as the top candidates. These are the *opposite* of let-go bargains. Rob's
  fix: once a name is a would-be candidate, cross-check it against **our corpus** — `name_universe`
  (written only from the marketplace/owned feeds: Afternic/Sedo/Atom/Namecheap/owned sheets) OR the
  **Master Domain List** (curated owner attributions). **Present in either → DISQUALIFIED** (we already
  list it for sale / track / own it, so it's not a hidden bargain; and the premiums are all in the
  Afternic feed). `lib/snapResearch/corpus.js` `corpusListedSet(domains)` (wraps `lib/variations/
  corpus.js` `lookupInternal`, fail-open). Applied in TWO places: (1) **`enrich.js`** — checked only for
  a would-be candidate (rare → one point-lookup), flips `candidate=false` (gates future scans, before
  the expensive full-TLD-count); (2) **`api/snap-research.js` GET** — live-filters the returned
  candidate rows (+ adjusts the `candidates` stat) so the EXISTING ~117-candidate backlog cleans up
  immediately without waiting for each row to re-scan (they sit at the bottom of the scan queue). No new
  column/migration (reuses the existing `candidate` flag + a live filter).
- **Free report on SNAP-Deal add (Rob, 2026-08-29).** `add_deal` now also kicks a FREE Domain Owner
  pre-flight report for the name (`kickFreeReport` in `api/snap-research.js` — dedupes against an
  existing run, `createRun` + `inngest.send(RUN_REQUESTED, phase:'shallow')`, mirrors
  `api/internal/kick-research.js`), best-effort, so the acquisition target has owner intel to dig up.
  - **BACKGROUND priority + concurrency throttle (Rob, 2026-08-30).** A bulk of SNAP-Deal adds must NOT
    overload the pipeline or starve a human's manually-requested report. Both auto-kick paths
    (`api/snap-research.js` `kickFreeReport` + `api/internal/kick-research.js`) now send
    `RUN_REQUESTED` with **`data.background:true`**. `runResearch` (`lib/inngest/functions.js`) is
    configured to (1) **concurrency**: a global cap (`RESEARCH_CONCURRENCY`, default 6 — overload guard)
    PLUS a lower cap on the shared `'snap-bg'` key (`RESEARCH_BG_CONCURRENCY`, default 2) so background
    runs use at most a couple slots and always leave headroom for manual runs (which key on their unique
    `runId`, so only the global cap binds); (2) **`priority.run`**: a manual run is factored **+600s**
    ahead of background (0), so when both are queued the human's report jumps in front of the background
    backlog. Net: manual reports run right away; SNAP-Deal free reports drain in the leftover capacity
    until complete. Env-tunable, no migration. NB Inngest priority orders the QUEUE (it doesn't preempt
    an already-running background job — fine, that's "just runs in the background until complete").
- **"SNAP Deal Board" nav link in the research SPA + rename (Rob, 2026-08-30).** The admin SNAP sub-nav
  showed the board (from `SNAP_TABS`) but the **research-SPA** SNAP nav group (`index.html`
  `nav-snap-group`) had NO link, so on research SNAP pages (SNAP Research/Eval/Expiring/Names) the tab
  was missing. Added `#nav-snap-deals` → cross-app `/snap-deals` (full-navs, no JS handler needed like
  the other cross-app SNAP links), gated `can('snap.deals')` (`els.navSnapDeals` + gateNav), and
  broadened `topbar-snap` visibility to include `permissions['snap.deals']` so a snap.deals-only user
  can reach SNAP. **Renamed "SNAP Deals" → "SNAP Deal Board"** everywhere user-facing (admin
  `SNAP_TABS` label + CATALOG + board H1/back-link/denied messages; research SPA nav link + the SNAP
  Research "✓ On SNAP Deal Board" chip). The perm key `snap.deals`, route `/snap-deals`, and
  `snap_deals.sql` are UNCHANGED. Cache-bust `?v=20260830snapdealnav`.
- **Setup:** run `0022` on the research project; `english_words.zipf` must be backfilled first (admin
  `backfill-english-zipf.yml`, done 2026-08-28). Reuses existing keys (no new vendor). Grant
  `research.snap_research` per-user; admins auto-pass.
- **⚠️ STILL OPEN — dark-held premiums NOT in our corpus.** The corpus filter catches every premium
  that's on a marketplace we feed (nearly all of them). A genuinely off-market, never-listed premium
  held dark would still score high on both axes (value + `no_resolve` abandonment) and survive. If that
  shows up, the next lever is scoring: `no_resolve`/`parked` shouldn't SOLO-qualify — gate the high
  abandonment on a Wayback signal that the name once had a REAL site (built-then-walked-away), so a
  name that was always dark/parked (investor inventory) doesn't read as "abandoned." Not built yet —
  watch the live candidates after the corpus filter lands.

---

# Sales Research Agent (Phase 1A — Upgrade) — 2026-06-05

Find companies that would BUY a domain we're selling. UI at **research.snagged.com/research/sales**
(gated by the `research.sales` module permission). Full design in `domain-research/SALES_RESEARCH_SPEC.md`.

- **Cancel a running discovery (2026-08-10).** A stuck/mis-typed discovery run had no way to stop it.
  Added a **✕ Cancel** button in the run status (`setSalesStatus(msg, isErr, cancellable)` appends
  `.sr-cancel` while `Working…`); `cancelSalesRun()` halts the poll immediately + re-enables the form +
  best-effort POSTs `action:'cancel'` → `api/sales.js` `handleCancel` sets the project status
  `cancelled` (so a reopened run shows "Run cancelled.", not a stuck "Working…"). The poll handles the
  new `cancelled` terminal status. (The Inngest job may finish its current step server-side; the
  terminal status just keeps it out of the way.) Cache-bust `?v=20260810salescancel`.

- **Spine:** seed domain → DISCOVER (free: enumerate TLD/affix variations × Clearbit
  autocomplete, `lib/sales/discovery/upgrade.js`) → RESOLVE+CLASSIFY+RANK
  (`lib/sales/resolve.js`: names companies via firmographics with an og:site_name/title
  fallback; CLASSIFY reuses livesite `extractClues` parking detection; ranks by
  `abilityToPay`; dedupes by company) → persist → human selects → ENRICH contacts
  (RocketReach, on-demand) → CSV.
- **Firmographics = the one paid slot** (`lib/sales/enrich/firmographics.js`): Apollo
  (default) / PDL / `merged`, via `FIRMOGRAPHICS_PROVIDER`. Captures size + headcount
  growth, funding amount/stage/recency/history, revenue, departments → `abilityToPay(rec)`
  → `{tier: strong|medium|low|unknown, signals, reasons}`. **Cost control: enriches ACTIVE
  candidates only + per-run company cache.** Needs `APOLLO_ENRICH_API_KEY` (paid plan;
  ~1 credit/company); contacts use `ROCKETREACH_API_KEY`.
- **Pipeline/API/UI:** `runSalesResearch` Inngest fn (event `SALES_RESEARCH_REQUESTED`) ·
  `api/sales.js` (create/poll/select/enrich, gated by `research.sales`) ·
  `domain_research_sales_{projects,candidates,contacts}` tables (RLS via the trailing loop —
  **run the new tables on the research project**) · `/research/sales` tab (`#view-sales`,
  the `sales*` helpers in app.js, `.sr-*` styles).
- **Keyword path is Phase 1B (design-only):** additive — `category`/`angle` columns +
  mode-agnostic spine already in place, so it adds rows, not a fork.
- **Product-named angle (2026-06):** `enumerateAngles` (`discovery/angles.js`) always
  emits a special `product_named` angle (flagged `product:true`, floated first, auto-
  checked) — companies whose PRODUCT/app/service is literally named the seed (the
  company itself is usually named something else, e.g. playmaker.com → a company whose
  product is "Playmaker"). When selected, `expandAngle` (`discovery/keyword.js`) branches
  on `angle.product` to hunt by product name, not industry. These ride the angle-research
  path (`api/sales.js` `handleResearchAngles`), which does NOT run `gateRelevance` — so a
  product holder with an unrelated company name isn't wrongly demoted.
- **Grounding the discovery — product-name VERIFICATION + TLD-aware buyers (2026-08-05).** Two
  accuracy fixes after the LLM was confabulating buyers (carrot.ai surfaced tractorventures.com /
  helixa.ai as having a "Carrot" product — a `site:` search finds nothing; and non-tech rewards
  companies via a carrot-and-stick metaphor).
  - **Product angle was self-certifying.** The "✓ exact product-name match" badge was set by
    `norm(c.product) === norm(sld)` — comparing the LLM's OWN claimed product string to the seed
    (circular); the only real check was `classifyDomain` (liveness, not product existence). Fix in
    `lib/sales/discovery/keyword.js` `verifyProductNamed(domain, word, env)`: a Serper
    `<word> site:<domain>` search that requires a result ON the company's own domain whose
    title/snippet actually uses the word. In `discoverAngles`, product candidates are verified with
    bounded concurrency (8): **checked-and-absent → DROPPED**; **verified → kept** (exact badge now
    meaningful); **unverifiable** (no `SERPER_API_KEY` / API error) → fail-open, downgraded from
    `product_named_exact` to `product_named` (soft "similar name", never a false "exact"). Needs
    `SERPER_API_KEY` (already set).
    - **Site-presence check was too weak for a COMMON noun → LLM adjudication (2026-08-05).** `<word>
      site:<domain>` false-passed instacart.com ("carrot" the vegetable is all over a grocery site) +
      snowflake.com, so fabricated product claims still showed "exact". Replaced with
      `lib/sales/discovery/verifyproduct.js` `verifyProductNames(candidates, env)`: a broad Serper search
      per candidate (`"<Company>" "<word>"` + knowledge-graph) → ONE batched Haiku call (`SALES_VERIFY_MODEL`,
      default `claude-haiku-4-5-20251001`) that must tell a REAL product name from the word merely appearing
      (store SELLING the item / blog / metaphor / person's name). Per-candidate `verified` true (keep) /
      false (**drop** — fabricated) / null (keep, not "exact"). `discoverAngles` batches all product
      candidates through it; fail-open (no ANTHROPIC/SERPER key → all null → soft). Replaced the old
      site-presence `verifyProductNamed`.
  - **Keyword angles ignored the TLD.** A `.ai`/`.io`/… name reads as an AI/tech brand, so a non-tech
    company tied only by a metaphor (an HR rewards program for carrot.ai) is not a real buyer. New
    `tldGuidance(tld, word)` in `lib/sales/discovery/upgrade.js` (TECH_TLDS = ai/io/dev/app/tech/ml/
    cloud/sh/gg/so) returns a directive threaded into BOTH the angle enumeration (`angles.js`
    `enumerateAngles`→`userPrompt`) and the per-angle company expansion (`keyword.js` `expandAngle`,
    keyword branch only) — for a tech TLD, EXCLUDE non-tech companies whose only tie is a theme/metaphor
    (a metaphor is fine only when the company is itself tech/AI). Neutral TLDs (.com) → no constraint,
    word meaning drives fit. Product branch is grounded by on-site verification instead, not the TLD gate.
- **Exact-SLD TLD variants were collapsed by the dedupe (2026-08-05).** For carrot.ai the upgrade path
  surfaced NONE of carrot.com / carrot.io / carrot.net — all real, live, same-SLD "Carrot" companies.
  Root cause: `discoverUpgrade` DOES enumerate the exact SLD on every TLD (`tldVariants`) and classify
  each, but `resolve.js` `resolveCandidates` then dedupes by **normalized company name** — and all
  three resolve to the name "Carrot", so they merged into ONE row (losers buried in `alt_domains`). The
  dedupe assumes same-name = same-company (right for `usepiston.com`+`piston.io`), but for a common-word
  seed carrot.com/.io/.net are DIFFERENT companies that merely share the name — each owns the exact name
  on another extension, so each is a first-class buyer. Fix: an exact-SLD `tld_variant` row is NEVER
  deduped by name (keyed `null` → standalone); affix/name_match rows still merge. Also broadened `TLDS`
  (`upgrade.js`) to `com/ai/io/net/co/org/xyz/app/dev/tech`. Verified with a dedup simulation: old =
  `carrot.com` only; new = carrot.com/.io/.net all surface + the piston affix pair still merges to one.
  (Backend-only — re-run a Sales Research report to pick it up.)
- **Permission:** `research.sales` in snagged-admin `dashboard/lib/permissions.ts`
  (MODULES + CATALOG; stored flat as `sales`). Grant per-user in the Users editor.
- **Contact enrichment = a VENDOR WATERFALL (2026-08-05).** RocketReach-only enrichment missed /
  over-filtered smaller + international companies (Carrot Insurance UK, Carrot General Insurance KR —
  only Instacart resolved). `lib/sales/enrich/contacts.js` `enrichCompany` is now a waterfall: (1)
  **Apollo people-search BY DOMAIN** (`lib/sales/enrich/apollopeople.js` `apolloPeopleByDomain` +
  `apolloRevealEmail`, reuses `APOLLO_ENRICH_API_KEY`) — domain-authoritative discovery (no fuzzy
  employer-name matching), reveals emails via `people/match`; (2) **RocketReach** fills more
  decision-makers when still thin (its strict same-company `pickProfile` stays, to avoid wrong-company
  contacts); (3) **FullEnrich** (`FULL_ENRICH_API_KEY`) fills an email for a found-but-unreachable
  person — capped to ONE time-budgeted lookup (it polls up to 40s; keeps a single enrich under the 60s
  API cap). Deduped across vendors by name; contacts with an email/phone sort first; `source` records
  the chain (e.g. `apollo+fullenrich`). Every vendor fail-open. Optional `SALES_VERIFY_MODEL` for the
  product check is separate.
  - **Apollo people API — the two-step shapes (verified live 2026-08-05).** `mixed_people/search` is
    DEPRECATED (HTTP 422) → use **`mixed_people/api_search`** (`x-api-key`, `q_organization_domains_list:[domain]`
    array — NOT `organization_domains`, which is ignored + returns the whole DB; `person_titles`; `per_page`).
    api_search returns LIGHTWEIGHT rows — `{id, first_name, last_name_obfuscated, title, organization.name,
    has_email, has_direct_phone}` — NOT the full name/email. The full name + VERIFIED email come from the
    REVEAL: **`people/match {id, reveal_personal_emails:true}`** → `person.{name,email,linkedin_url,phone_numbers}`
    (1 credit; phone often async-empty). So `apolloPeopleByDomain` returns id+title+has_email rows and
    `apolloReveal(id)` unlocks each — the waterfall reveals only `has_email`/`has_phone` rows (cap
    `maxContacts`), reachable-first. A `person_titles` filter can SHRINK coverage at a small company, so
    the leg adds a title-less pass when thin. Verified: carrotinsurance.com → 4 contacts (Katie Thorley
    katie.thorley@…), carrotins.com → 6; carrotsearch.com → 0 (no Apollo coverage → RR/FullEnrich fallback).

## Sales Hub — per-name persistent target list (2026-08-05)

Evolves Sales Research from *run-and-export-a-CSV* into a durable **per-name hub**: a saved,
curated **target list** you build up, shortlist, enrich, share, and append over time. Full
design in `domain-research/SALES_HUB_SPEC.md`. Additive to the existing module — same
`research.sales` gate + the three `domain_research_sales_*` tables. NO HubSpot/CRM.

- **Two surfaces** under the name's hub (`#view-sales`, surface toggle `#sr-surface`):
  **Explore** (the existing Upgrades + Explore-by-category discovery, now with a checkbox
  **＋ Add to target list** bulk action) and **Target list** (`#sr-targets` — the curated set).
  Explore cards show a **✓ on list** chip once added.
- **Target list (Surface B):** promote candidates OR **add a company manually**
  (`#sr-t-addform`, company required, domain/contact optional), **remove** (demote — stays a
  candidate in Explore), **⭐ mark up to 5 top fits** (best-fit-for-this-name human judgment,
  pinned Top 5 up top), **per-target + bulk Enrich** (RocketReach on demand), **inline
  notes/comments**, **date added**. **🔗 Share** button copies a gated deep-link
  (`/research/sales/<id>` — internal, any `research.sales` teammate).
- **INVARIANT (hold the build to this):** a target's worth is independent of its contact
  info — a great target (incl. a #1 top fit) STAYS on the list with zero contacts; enrichment
  is strictly additive/optional. `is_target`/`shortlist_rank` are set by fit, never gated on
  contacts; no-contact targets never sort below lesser ones with an email; nothing expires a
  target for lacking contacts.
- **Data** (migration `supabase/migrations/0019_sales_targets.sql`, run on the research
  project): `domain_research_sales_candidates` +`is_target`/`manual`/`shortlist_rank`
  (1-5)/`notes`/`added_at`/`shortlisted_at` + 2 indexes. All writers in `lib/db/sales.js`
  (`addToTargets`/`addManualTarget`/`removeTargets`/`setShortlistRank`/`updateTarget`,
  `updateCandidatesSafe`) **strip-and-retry 42703** so it degrades gracefully pre-migration
  (target features are simply off until 0019 runs).
- **API** (`api/sales.js`): actions `add_to_targets`/`add_target`/`remove_target`/`shortlist`
  (max-5 enforced server-side)/`update_target` + **bulk `enrich {ids[]}`**; GET returns
  `{candidates, targets}` (targets = is_target, top fits first). `angles`/`research_angles`
  power Explore's by-category mode (unchanged).
- **UI** (`public/app.js` `salesTargets`/`salesSurface`/`renderTargetList`/`targetCardHtml`/
  `toggleTopFit`/`enrichTarget` etc.; `.sr-surf-*`/`.sr-t-*` styles). Cache-bust
  `?v=20260805saleshub`.
- **Category pills + filter/sort on the target list (2026-08-05).** Each target shows a
  **category badge pill** (`targetCat` → Upgrade/Product/Keyword/Manual). A filter/sort bar
  (`#sr-t-filterbar`): filter by category (chips w/ counts) + sort by Date added / Top fit /
  Category / Employees / Funding / Revenue / Founded / Company. Employees/funding/revenue/founded
  come from Apollo firmographics, so a **"Qualify selected"** button was added to the target list
  (mirrors Explore's — `qualify` API action, chunked) to fill them; blanks sort last. CSV gains
  Category/Revenue/Founded columns. Cache-bust `?v=20260805targetlist`.
- **Prominence via Open PageRank + on-list chip relocation (2026-08-05).** Traffic proxy: `lib/openpagerank.js`
  `openPageRank(domains, env)` — FREE DomCop API (header `API-OPR`, env `OPENPAGERANK_API_KEY`), batched
  100/req, fail-open. NOT true visits — a 0–10 domain-authority + global rank that correlates with traffic
  (Ahrefs org-traffic is the paid upgrade, pending a key). API action `prominence {project_id}` batch-looks-up
  the target domains; the client (`salesOprCache`/`loadProminence`/`applyOpr`) fetches once per session when
  the Target surface opens, caches per domain, shows an **OPR chip** + a **Prominence (OPR)** sort option +
  CSV cols (OPR / OPR rank). **On-list chip** moved to the FRONT of the Explore card name line (green, by the
  checkbox) so it's a scannable fixed-left column instead of trailing a variable-length name. Cache-bust
  `?v=20260805opr`. **Live-verify OPR on deploy** (key is Vercel-only, not in the sandbox).
- **Extensions surface — Beast-Mode TLD sweep (2026-08-05).** A third Sales Hub surface (`#sr-surface`
  toggle Explore / 🌐 Extensions / 🎯 Target list) that sweeps the EXACT seed SLD across every TLD and
  shows taken / for-sale (+ asking price + marketplace) / available / active-site — reusing the naming
  exercise engine (`lib/variations/sweep.js` `sweepVariations` with `prefixes:[], suffixes:[]` →
  extensions only). API action `extensions {domain}` in `api/sales.js` (gated `research.sales`; reads
  `swept.results` — sweepVariations returns `{seed,count,criteria,results}`, NOT a bare array — and
  filters `kind==='tld'`, the label enumerate.js tags exact-SLD-on-a-TLD rows). UI (`public/app.js`
  `loadExtensions`/`renderExtensions`, cached per session;
  `.sx-*` table styles) — status pills, price, marketplace link, register link, refresh, CSV.
  Complements Upgrades (which resolves TLD siblings to COMPANIES): Extensions shows each domain's
  DISPOSITION (buyable / parked / active / price). Cache-bust `?v=20260805ext`.
  - **Cards + checkboxes + add-to-target (2026-08-05).** Extensions renders as Explore-style cards
    (`.sx-card` left-border by disposition). An **ACTIVE-site extension IS a real company** on the
    exact name (a prime buyer), so `handleExtensions` resolves those rows' **firmographics** (Apollo,
    bounded, fail-open) → company/employees/revenue/founded/industry/linkedin/tier on the card, plus a
    **checkbox** + a **"＋ Add to target list (N)"** action (`add_ext_targets` → `addExtensionTargets`
    upserts a `tld_variant` candidate per domain carrying the firmo + marks `is_target`; promotes an
    existing candidate by domain instead of duplicating). For-sale/available/parked rows stay
    disposition-only (not buyers → no checkbox). An already-a-target extension shows a ✓ on-list chip.
    Cache-bust `?v=20260805extadd`.
  - **Renamed to 🦾 Beast Mode + full affix sweep (2026-08-05).** The surface is now "Beast Mode" (was
    "Extensions") and runs the FULL naming-exercise sweep — `sweepVariations(domain)` with the DEFAULT
    prefixes/suffixes (get/try/use/hi/hello/go… + labs/hq/inc…), not just the exact SLD on TLDs — so
    prefix/suffix brand combos (getcarrot.com, carrotlabs.com) are checked for live sites too. Rows carry
    `kind` (`tld`/`prefix`/`suffix`) shown as a small chip. Active-site rows of ANY kind resolve
    firmographics (capped 16) + get the add-to-target checkbox. `api/sales.js` `maxDuration` bumped
    60→120 for the bigger sweep. Cache-bust `?v=20260805beastmode`. (Explore also now floats on-list
    rows to the TOP of each category via `byScore`.)
  - **Extra-TLD affix picker (2026-08-10).** Beast Mode ran the prefix/suffix combos only on `.com`;
    now it has the same collapsible TLD checkbox picker as the naming exercise (`#sr-ext-affix` toggle →
    `#sr-ext-affix-menu`, options `AFFIX_TLD_OPTIONS`), so a `.ai` name also checks `findcarrot.ai` /
    `carrotlabs.ai`. `salesExtAffixSelected()` → `loadExtensions` sends `affix_tlds`; `handleExtensions`
    reads `body.affix_tlds` → `sweepVariations(domain,{affixTlds})` (engine already supports it). Changing
    the picker **re-sweeps** (`loadExtensions(true)`, since the extra TLDs need a fresh crawl; `.com`
    always included). Shared engine with the naming exercise. Cache-bust `?v=20260810salesbeast`.
  - **Beast Mode filters + defaults (2026-08-05).** Kind filter chips (All / Extension / Prefix /
    Suffix — `salesExtKindFilter`, counts over the visible set) + a per-row kind chip (`sx-kind`;
    prefix/suffix also show the affix). Disposition hide-toggles (`#sr-ext-hide-forsale/-avail/-taken`,
    all **checked by default**) so the default view is **only active sites** (real content); for-sale,
    available, and parked/registered/**doesn't-resolve** are hidden until toggled (a non-resolving name
    isn't a real target). On-list ✓ chip now leads the card name line (matching Explore) for any
    already-a-target row. Cache-bust `?v=20260805beastfilters`.
  - **Top-fit ⭐ is now UNCAPPED (2026-08-05)** — star as many best fits as you want (was max 5). Removed
    the cap in `api/sales.js` `handleShortlist` + client `toggleTopFit`; `shortlist_rank` just preserves
    starring order. Section header "⭐ Best fits for <name>" with a count (was "Top 5").
- **One-time setup:** run `0019_sales_targets.sql` AND `0020_sales_dismissed.sql` on the research
  project. No new permission/env. **Out of scope (v1):** public no-login share (a token'd Top-5 view is a
  later add), CRM push, auto-outreach, cross-name rollups, per-company threaded comment log.
- **Canonical per-name hub — the master target list (2026-08-05).** The target list is now a
  DURABLE PER-NAME asset, independent of research runs. `createSalesProject` (`lib/db/sales.js`) is
  **find-or-create by normalized `seed_domain`** — re-running research REUSES the same project (hub)
  instead of forking a fresh empty list; it resets run status but keeps the row + its candidates/
  targets. Legacy duplicate projects for a name consolidate onto the one holding the most `is_target`
  rows (never orphans a curated list), else newest. `insertSalesCandidates` now **dedupes by
  domain (then company) against existing candidates on the project**, so a re-run appends only
  genuinely-new companies and never touches existing targets/notes/shortlist. No migration/schema
  change (reuses the unique-ish name lookup). Recent-runs effectively becomes one row per name.
  (Deferred #2/#3 from the design: a pipeline STAGE per target + a cross-name pipeline board.)
- **Master-list DIRECTORY (2026-08-05).** The Sales Research recent/"View all" list is now framed as the
  master directory of NAMES (not a run log): `listSalesProjectsWithCounts` (`lib/db/sales.js`, fail-open
  pre-migration) attaches `target_count`/`top_fit_count` per hub; the GET `?list=1` returns them.
  `salesProjectRow` shows **name · N targets · M top fits**; clicking a name deep-links straight to its
  **Target list** surface (`openSalesProject(id,'targets')` via a `salesPendingSurface` hook applied in
  `renderSalesResults`). "View all" (`#view-sales-projects`, `/research/sales/all`) is a flat searchable
  name directory (`.sr-dir-*` styles); headers relabeled "Your names · master target lists" / "Target
  lists". Reachable **within admin** via the existing Research → Sales Research nav tab (already in
  `snagged-admin` RESEARCH_TABS → `/research/sales`) — no admin change. Cache-bust `?v=20260805masterdir`.
- **Directory orders by LAST-WORKED-ON, not created-at (2026-08-07).** Re-running research on an
  OLD name (Rob re-did gush.ai) reuses its hub (`createSalesProject` find-or-create) but the list
  ordered by `created_at desc`, so the freshly-worked name stayed buried. Fix = a new nullable
  `domain_research_sales_projects.last_activity_at` (migration `0021_sales_last_activity.sql`,
  `add column if not exists` + `idx_sales_proj_activity` + a one-time backfill from `max(candidate.added_at)`
  ‖ `created_at`). `touchSalesProject(id)` (best-effort, strip-safe) bumps it; called from
  `createSalesProject` (BOTH the reuse-update and the fresh insert — a re-run counts as spending time)
  and the target-add writers (`addToTargets`/`addManualTarget`/`addExtensionTargets` — curation counts too).
  `listSalesProjects` now orders `last_activity_at desc nulls last, created_at desc`, with a strip-and-retry
  fallback to plain `created_at` pre-migration (so it works before 0021 runs; a hub untouched since the
  migration sorts by created_at until next touched). No UI change (the directory just reflects the new order).
- **Dismiss / hide a not-a-fit candidate (2026-08-06).** Working down Explore + Beast Mode as a
  triage list, you either ADD a name to targets or DISMISS it (e.g. askdelegate.com is garbage). A
  dismissed row is hidden by default + restorable. `domain_research_sales_candidates.dismissed`/
  `dismissed_at` (migration `0020_sales_dismissed.sql`); `dismissCandidates(ids, dismissed)`
  (`lib/db/sales.js`, strip-and-retry 42703 → degrades pre-migration) — dismiss also demotes the row
  off the target list (`is_target=false`, clears shortlist), restore just un-hides. API action
  `dismiss {ids, dismissed}` (`api/sales.js`). UI (`public/app.js`): a per-card **✕** dismiss button
  (↩ Restore when viewing dismissed) on Explore cards; `salesVisible()`/`updatePathFilter` hide
  `dismissed` by default; a **"Show dismissed (N)"** toggle (`#sr-show-dismissed`, `salesShowDismissed`)
  flips to a dismissed-only review view (→ "← Back to Explore"). Optimistic (`dismissCandidate`),
  falls back to a refresh on failure. Cache-bust `?v=20260806dismiss`.
- **Beast Mode: SAVED sweep + dismiss (2026-08-06).** Beast Mode is a heavy live crawl, so its
  results are now PERSISTED per name and loaded instantly; a **↻ Refresh** re-sweeps. Stored in
  `domain_research_sales_projects.ext_results` (jsonb) + `ext_swept_at` (migration `0020`;
  `saveExtResults`/`getExtResults`, strip-and-retry). `handleExtensions` reads saved unless
  `refresh:true`; the client (`loadExtensions`) passes `project_id`+`refresh`, shows a "Last swept …"
  stamp. **Dismiss on Beast Mode** persists BY DOMAIN so a Refresh returning the same name stays
  hidden: `dismissExtensionDomain(projectId, row, dismissed)` flags an existing candidate or UPSERTS a
  minimal dismissed one (category `tld_variant`/`prefix`/`suffix`); API action `dismiss_ext`. UI: a
  per-card ✕ / ↩ Restore, a Beast Mode "Show dismissed (N)" toggle (`#sr-ext-show-dismissed`), and
  `renderExtensions` unions the DB dismissed set (`salesCandidates.dismissed` by domain) with a
  session set + hides them by default. Cache-bust `?v=20260806beastdismiss`.
- **Enrich/Qualify "searched, nothing found" state (2026-08-06).** A card that was ENRICHED or
  QUALIFIED but came back empty read identically to one never run. Now they differ: the TARGET card
  shows **"✓ Searched · no contacts found · ↻ Try again"** (enrich) / **"✓ Qualified · no
  firmographics found"** (qualify) instead of the "🔓 Enrich" / "tick + Qualify" prompt; a `failed`
  enrich shows "⚠ Enrichment failed · ↻ Retry". Enrich already carried `enrich_status`
  (`pending|done|failed`); qualify now records **`qualify_status`** (`done` matched / `empty` searched-
  nothing) on the candidate — `updateCandidateQualification` sets it + routes through
  `updateCandidatesSafe` (strip-and-retry, so it degrades pre-`0020`). Explore's `contactsBlock`
  already had the done-empty state; the gap was the target card + qualify. Migration `0020` adds
  `qualify_status text`.
- **Contact enrichment lever #4 — SITE SCRAPE (2026-08-06).** Many small/early companies have NO
  Apollo/RocketReach/FullEnrich coverage but print a real contact in the footer / About / Contact page
  (godelegate.com → hello@godelegate.com; delegatespace.com → info@ + phone). New FREE, no-key leg
  `lib/sales/enrich/sitescrape.js` `scrapeSiteContacts(domain)` — fetches homepage + about/contact/team
  (`fetchText`, `maxPages` 3), extracts mailto: (with adjacent name text) + bare-text emails + tel:
  phones, drops vendor/tracking junk (`JUNK_EMAIL_RE`), names a person from the anchor label or a
  `first.last@` localpart, keeps role inboxes (info@/hello@/…) as labelled "Company inbox" contacts,
  on-domain + named first. Wired as step 4 of the `enrichCompany` waterfall in
  `lib/sales/enrich/contacts.js` — runs only when the paid vendors left us with <2 reachable people AND
  there's time budget (<22s in, to stay under the 60s API cap). A site-sourced contact shows a **🌐 site**
  chip in both Explore + Target contact cards. Live-verified: godelegate.com/delegatespace.com return
  real footer contacts. Fail-open (unreachable/JS-only site → nothing, vendors unaffected).

---

# Corporate Portfolios — reverse-WHOIS a company → its premium domains (2026-06-11)

A Reports module that takes a **company name** (or registrant **email**) and pulls
that entity's WHOLE registered-domain portfolio from Whoxy reverse-WHOIS, then
skims off the **premium** names (short + dictionary-word .coms) for outreach.
Productionizes Rob/Sam's `premium_portfolio_check_master.py` script (NLTK + a
hardcoded API key) — same proven premium rules, but configurable, no bundled
dictionary, no key in code. UI at **research.snagged.com/research/portfolio**,
gated by the `research.portfolio` module permission.

- **Shared Whoxy client** (`lib/whoxy.js`): `reverseWhoisAll({company|email|name|
  keyword}, {env, maxPages, delayMs})` paginates EVERY page (the `whoxy_reverse`
  source only grabs page 1), 0.5s apart, with a `maxPages` credit cap (default 100)
  + a running credit count. Returns `{domains[], total_results, credits_used,
  capped}`. One credit per page; ~$10/1000. Env: `WHOXY_API_KEY` (already set).
- **Premium filter** (`lib/portfolio/premium.js`): `classifyPremium`/`selectPremium`
  — pure, configurable (`DEFAULT_FILTER` = .com only, no hyphens, 2–4 char short OR
  5+ char dictionary word — the script's exact rules). Knobs: `tlds[]` (blank=any),
  `minShort`/`maxShort`, `requireDictionary`, `allowHyphens`. Dictionary check is a
  caller-supplied predicate, NOT a bundled wordlist.
- **Dictionary reuse** (`lib/db/dictionary.js`): new `filterDictionaryWords(slds[])`
  — one batched `.in()` pass over the naming project's `english_words` table (the
  same table the Appraisal definitions use). Fail-open → empty Set (then only shorts
  qualify, mirroring the script's no-NLTK path). NO NLTK.
- **Async pipeline** (`runCorporatePortfolio` Inngest fn, event `PORTFOLIO_REQUESTED`):
  pull → filter (batch dict check + classify) → persist. Async because a big
  registrant paginates past the 60s API cap.
- **API** (`api/portfolio.js`, gated `research.portfolio`): `POST {action:'create',
  company?|email?, filter?}` → `{run_id}`; `GET ?id=` → `{run, domains}`; `GET
  ?id=&format=csv` → CSV; `GET ?list=1&q=` → recent runs. An `@` in the query ⇒
  email (precise) else company.
- **Storage** (`supabase/schema.sql`): `domain_research_portfolio_{runs,domains}`
  (RLS auto-enabled by the trailing `domain_research_%` loop). **One-time migration:
  run the two new tables on the research project before first use.**
- **UI**: `/research/portfolio` tab (`#view-portfolio` + `#view-portfolio-runs`;
  the `cp*` helpers in app.js; `.cp-*` styles). Company/email box, a collapsible
  premium-filter `<details>`, polled run, results table, **Download CSV**, recent
  + searchable past-runs list. Nav `#nav-portfolio` gated by `can('portfolio')`.
- **Still TODO in snagged-admin (separate repo):** add catalog/module key
  `research.portfolio` to `dashboard/lib/permissions.ts` (MODULES + CATALOG; stored
  flat as `portfolio`) so it's grantable in the Users editor, and (optional) a hub
  tile in `app/page.tsx`. Admins auto-pass without it.
- **Future (Sam's full ask):** "pull emails for execs" — wire the existing
  RocketReach enrichment (`lib/sales/enrich/contacts.js`) as an on-demand second
  step per company. Not in v1 (portfolio-only).

---

# Person deep-dive — social-URL → identity + VIP + contacts (2026-07-09)

Takes ONE **social-profile URL** (LinkedIn / X / Facebook / Instagram / Quora /
YouTube / …) **or an email address** and produces a dossier on that person. UI at
**research.snagged.com/research/person**, gated by the `research.person` module
permission. Reuses the existing enrichment stack — **no new vendor/env key**.
Deterministic pipeline (not the agent).

- **Email seed (2026-07-27).** Paste an email instead of a URL. `identifyByEmail`
  (`lib/person/orchestrate.js`): (1) **RocketReach reverse-lookup by email** (`rocketreach_lookup`
  now accepts an `email` param → name / LinkedIn / phone in one paid call); (2) miss → **web-search
  the email** (`"<email>"`, then `<local-part> <domain>`) and recover a first+last name from the
  results (`nameFromWebResults` — LinkedIn result title / knowledge-graph); (3) name-but-no-LinkedIn →
  free `rocketreach_search` to place the profile. Then the SAME triangulate/synthesize/VIP path runs.
  Any phone/LinkedIn the reverse-lookup surfaced is returned as `dossier.contacts` and stored via
  `setPersonContacts` (run marked `revealed`) so it shows without a separate paid reveal.
  `api/person.js` accepts an email in `email` or pasted into `url` (`cleanEmail`; `input_url` holds
  the seed, platform `email`); `runPersonDeepDive` detects an email seed and branches. FullEnrich
  stays the contact fallback in `revealContacts` (needs a name, so it runs after we have one). **Free-first + reveal:** the auto pass is free-ish (search/read_url/
rocketreach_search + one LLM synth); the **paid** contact lookup is a separate
button.
- **Auto-run RocketReach; Reveal = FullEnrich ONLY (2026-08-13, Rob).** RocketReach `lookup` (~1
  credit, emails/phones) now runs AUTOMATICALLY inside the deep-dive so contacts surface on submit —
  it was previously behind the Reveal button. `runPersonDeepDive` calls new `rrLookupContacts(subject,env)`
  (by linkedin_url ‖ name+company) after synth and stores the result in `dossier.contacts` (with
  `found:true` + Twilio line-types). The **Reveal button is now the FullEnrich escalation ONLY** (much
  pricier): `revealContacts` dropped its RocketReach step, ALWAYS runs FullEnrich, and takes an
  `existing` param (the auto-RR contacts from `run.result.contacts`) so a reveal MERGES onto them
  rather than dropping them (`api/person.js` handleReveal passes `existing: run.result.contacts`). UI
  (`public/app.js`): the dossier shows `d.contacts` (auto-RR) automatically; the button relabeled
  **"🔓 Reveal via FullEnrich"** with a "deeper email + mobile (premium, higher cost)" note;
  `prContactsHtml` now treats "has emails/phones" as found (auto-RR objects lack an explicit `.found`
  otherwise). **Cost note:** every person research now spends ~1 RR credit (Rob's call — worth it to
  see emails immediately). Cache-bust `?v=20260813personrr`.
- **Appraisal async job-ack never shows raw (2026-08-13).** The Appraisal tool sometimes surfaced the
  raw Appraise.net message *"Appraisal job created. Poll /api/v1/appraisal/status/job_… for updates."*
  when the initial `appraise_lookup` returned the job-ack but the client didn't find `d.job_id` in the
  expected field (so it never routed to `pollAppraisal`, which shows the friendly "Appraising… (Ns)"
  spinner). Fix in `runAppraisal` (`public/app.js`): route to `pollAppraisal` when a `job_[a-z0-9]+`
  id appears ANYWHERE in the response (extracted from the poll-URL message text itself), so the raw
  job-ack is never shown. Same cache-bust.
- **Wrong-person guard on the EMAIL path (2026-08-17).** `alan.rutledge@gmail.com` (name "Alan
  Rutledge") returned **Saif Abuhashish's** title/company/LinkedIn/contacts under Alan's name — a
  personal gmail reverse-lookup mapped to a different person in RocketReach, and the code kept the
  user-typed name while applying the mismatched record. Same class as the Net Worth namesake bug.
  Fix in `lib/person/orchestrate.js` (`FREEMAIL` + `nameMatches` helpers, ≥2 shared tokens): (1)
  `identifyByEmail` DISTRUSTS the `rocketreach_lookup {email}` record when the user-provided name
  doesn't match it (`rrMismatch` → don't apply title/company/LinkedIn/contacts, flag
  `subject.low_confidence`); (2) the name-only `rocketreach_search` fallback only applies a name-matched
  hit; (3) `rrLookupContacts` (the auto-contacts path) rejects a name-only lookup whose name mismatches;
  (4) a freemail seed with no trusted match flags low-confidence. UI (`public/app.js` `renderPerson`):
  a **⚠️ Low-confidence identity** banner (`.pr-warn`) when `subject.low_confidence`. A LinkedIn-URL /
  work-email seed stays exact. Cache-bust `?v=20260817personid2`.

- **Engine** `lib/person/orchestrate.js`:
  - `runPersonDeepDive({url,name?,company?,env})` — the FREE pass. (1) IDENTIFY:
    `read_url` the profile (Scrape.do for bot-walls) + `rocketreach_search`
    (FREE, accepts `linkedin_url`) → name/title/employer/linkedin/location. (2)
    TRIANGULATE: a broad `web_search` (harvest platform links + knowledge_graph) +
    targeted `site:` searches for the platforms not yet placed, then `read_url`
    each to read **follower/subscriber/connection counts** (best-effort — X/LinkedIn
    often gate them). (3) SYNTHESIZE + ADJUDICATE IDENTITY: one LLM call
    (`PERSON_MODEL`||`OUTREACH_MODEL`, default sonnet) writes the dossier AND returns
    an `identity` object (`confirmed_platforms`, `wikipedia_is_subject`,
    `knowledge_panel_is_subject`) — the anchor is the input profile; findings pulled
    by NAME search that belong to a **namesake** (e.g. an actor with the same name)
    are EXCLUDED. (4) VIP band is computed AFTER, from the CONFIRMED signal set only:
    `computeVip` is **follower-dominant** with **per-platform VIP floors**
    (`PLATFORM_VIP_FLOOR`: X/YouTube/LinkedIn/IG/Facebook/TikTok all **25K** — a count
    at/above a platform's floor = VIP standalone), plus a general max-follower scale
    (500K+ = VIP) and 100K+Wikipedia = VIP; <2.5K = low.
    Wikipedia/knowledge-panel are secondary, cross-platform breadth is heavily
    discounted (+1 only at 8+ platforms), and **job seniority is ignored**.
    Bands `low`/`notable`/`high_profile`/`vip`; every firing signal listed. All
    steps fail-open (no key → keep all findings, no adjudication).
  - `revealContacts({subject,includePhone,env})` — the PAID step. `rocketreach_lookup`
    (by linkedin_url) → emails/phones; `fullenrich_lookup` fallback when RR is empty.
    De-duped. Bounded → runs inline (sync).
- **Async pipeline** `runPerson` (Inngest, event `PERSON_REQUESTED`) runs the free
  pass past the 60s API cap; the reveal is a sync API action. Registered in the
  `functions` array. Usage tagged `withCategory('person')`.
- **API** `api/person.js` (gated `research.person`, maxDuration 60): `POST
  {action:'create',url,name?}` → `{run_id}`; `POST {action:'reveal',run_id,phone?}`
  → `{contacts}` (paid); `GET ?id=` poll; `GET ?list=1&q=` recent.
- **Storage** `domain_research_person_runs` (single table; free dossier in `result`
  jsonb, paid contacts in `contacts` jsonb + `revealed` flag; RLS auto-enabled by the
  `domain_research_%` loop). **ONE-TIME MIGRATION: run the table on the research
  project before first use.**
- **UI** (`public/app.js` `pr*` helpers; `#view-person` + `#view-person-runs`; `.pr-*`
  styles): URL box + optional name, dossier card (VIP pill + signals + cross-platform
  presence with follower counts + contact panel with a **🔓 Reveal email & phone**
  button + best-way-to-reach), saved + deep-linkable runs, recent list. Research-group
  tab `#nav-person`. Cache-bust `?v=20260709person1`.
- **WhatsApp / Telegram links on revealed phones (2026-08-08).** The person dossier's revealed
  contact panel (`prContactsHtml`) now renders each phone as a `tel:` link + one-tap **WhatsApp**
  (`wa.me/<digits>`) and **Telegram** (`t.me/<digits>`) launchers via `prMsgLinks(p)` — mirrors the
  Domain Owner report's `msgLinks`. RocketReach/FullEnrich person phones carry NO mobile-vs-landline
  type (`revealContacts` keeps only `{value, source}`), so links show on any valid mobile-length
  number (10–15 digits) and skip a phone explicitly noted as fax/landline/office (`p.note`/`p.type`)
  — the user picks which number is a good fit. Reuses the existing `.msg-links` style. Cache-bust
  `?v=20260808prmsg`.
- **Phone line-type enrichment → auto-gate the launchers to mobiles (2026-08-08).** `lib/phone/linetype.js`
  runs each revealed phone through **Twilio Lookup v2 (Line Type Intelligence)** → `{line_type, carrier}`
  (mobile / landline / nonFixedVoip / …). `enrichLineTypes(phones, env)` is called in BOTH person contact
  paths (`revealContacts` after dedupe + the email-seed `identifyByEmail`), cache-first per E.164 (kind
  `lt` in `domain_research_tool_lookups`, so a re-view never re-spends ~$0.005/lookup), bounded
  concurrency, fully fail-open (no key / bad number → phone stays untagged). UI: `prContactsHtml` shows a
  mobile/landline/VoIP **pr-tag** (carrier in the title) and `prMsgLinks` gates WhatsApp/Telegram to
  messageable lines (`PR_MSG_LINES` = mobile/voip/personal) when the type is KNOWN, falling back to the
  length+note heuristic when UNKNOWN (no key). Line type is the compliant signal — it does NOT confirm a
  WhatsApp/Telegram account (no clean API for that; clicking the launcher is the real presence check).
  **Setup: set `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`** in the research Vercel project to activate;
  until then it's a no-op and the launchers use the fallback. Cache-bust `?v=20260808linetype`.
- **Permission:** `research.person` added in snagged-admin `dashboard/lib/permissions.ts`
  (MODULES + RESEARCH_TABS + CATALOG; stored flat as `person`). Grant per-user; admins
  auto-pass. Optional model override `PERSON_MODEL`.

---

# Net Worth — standalone ability-to-pay estimate (2026-08-15)

A SEPARATE Research tool (`/research/networth`, own nav tab **Net Worth**), NOT a toggle on the
person deep-dive. Same inputs as the deep-dive — a **LinkedIn/social URL or an email** — and produces
a rough **net-worth estimate** (an ability-to-pay signal for a domain negotiation), with a visible
low/mid/high range, band, confidence, and the weighted components behind it. Uses a **light RocketReach
`lookup` (~1 credit) to identify the person** but NO expensive Apollo/FullEnrich enrichment.
- **Engine** `lib/person/networth.js`:
  - `computeNetWorth({title, firmo, maxFollowers})` — PURE deterministic core, a PRIOR + FLOOR (it
    under-estimates without firmographics, so it is NOT the headline — the LLM is). Weights: **founder
    equity** (stake-by-stage × est. valuation × 0.35 illiquidity discount — `STAGE` table; valuation =
    a direct `firmo.valuation` if known, else ~4–6× total raised, else ~3× revenue, else ~$200K×emp),
    **executive comp** accumulation (seniority band × ~8yr × 0.25 save-rate), **creator/audience**
    proxy (followers×$0.10/yr, only ≥25K), a seniority **baseline floor**, → low/mid/high + `bandFor`
    (`<$1M / $1M–$10M / $10M–$50M / $50M–$250M / $250M+`) + confidence.
  - `identifyPerson({url,email,name})` — identity via the RocketReach **`lookup`** (~1 credit, reliable
    reverse-resolve by email OR LinkedIn URL — the free `rocketreach_search` mis-resolved
    rschutz@gmail.com to a *company* and returned role-less LinkedIn hits). Falls back to `read_url` +
    `web_search` + free `rocketreach_search`. Freemail domains are never treated as the company; a
    LinkedIn URL's `?utm…` is stripped. Still no Apollo/FullEnrich.
    - **Namesake guard + low-confidence flag (2026-08-15).** `Rschutz@gmail.com` resolved to "Ralph
      Schutz — MD at Quintiles" (a namesake). Root cause: a personal freemail isn't in RR's (work-email)
      index, so it fell through to a **name-only** `rocketreach_search` that grabbed the top same-surname
      professional. Fixes: (1) a name-only search hit is applied ONLY when `nameMatches` (≥2 shared
      tokens — "Ralph Schutz" ≠ "Rob Schutz") — else it flags low-confidence, doesn't substitute; (2) an
      RR-email record is distrusted when the user-provided name doesn't match it; (3) `subject.identity_source`
      (`rocketreach_email|rocketreach_linkedin|web|page`) + `subject.low_confidence` (true for a freemail
      seed OR any non-exact match) are returned and the UI shows a **⚠️ Low-confidence identity** banner
      ("add a full name or LinkedIn to disambiguate"). A LinkedIn-URL seed stays exact/high-confidence.
  - `freeCompanyFinancials({company})` — web_search the company + ONE LLM extract → `{fundingAmount,
    fundingStage, valuation, employees, revenueAmount}` from the snippets (replaces Apollo). Fail-open null.
  - `narrate()` — **LLM is the PRIMARY estimator** (recalibration): reads role + company financials +
    web signals and returns its own grounded `estimate_low/mid/high` + `is_individual` + `driver` +
    `confidence`, with a prompt that DEFINES net worth (founder equity in a funded/unicorn company =
    tens of millions; VC partner carry ≠ AUM but a strong HNW signal; disclosed Forbes/filing figure
    overrides; namesake-guarded). Fixes the bug where a unicorn founder + $1B-AUM investor collapsed to
    the deterministic floor (sub-$100K) because the LLM was clamped to a [0.5,2] nudge.
    `estimateForSubject` uses the LLM low/mid/high floored by a solid founder-equity figure;
    `is_individual:false` → a "Not a person" card (no number). Fail-open to the prior when no ANTHROPIC key.
  - **Liquid-vs-illiquid split (2026-08-15).** The LLM also returns `liquid_pct` + `liquidity_note`
    (what share of the mid is cash/accessible vs private-company equity/carry — founder pre-exit ~5–20%
    liquid, salaried exec savings ~60–80%, VC carry illiquid, disclosed Forbes figure mostly paper).
    `estimateForSubject` computes `liquidity{liquid, illiquid, pct, note}` (LLM pct, else a driver-based
    `LIQ_DEFAULT`), rendered as a split bar in the card — the number that actually matters for
    ability-to-pay in a negotiation.
  - `runNetWorth({url,email,name})` / `estimateForSubject({subject})` — the whole flow; returns
    `{ok, subject, band, low, mid, high, confidence, display, components[], liquidity, firmographics, disclosed, rationale, caveat, not_individual?}`.
- **API** `api/networth.js` — **inline/sync** (maxDuration 60, no Inngest, no DB), gated by the existing
  **`research.person`** permission (reused — no admin-repo change; a dedicated `research.networth` perm
  is a possible follow-up). `POST {url|email, name?}` → the estimate. `withCategory('networth')`.
- **UI** (`public/app.js` `nw*` helpers — `runNetWorth`/`renderNetWorth`/`resetNetWorthView`;
  `#view-networth` + `#nav-networth` in the Research group; `.nw-*` styles): URL/email box + optional
  name → an estimate card (band pill, big range + mid, confidence, disclosed callout, rationale,
  "How it was built" components, free company-signals line, caveat). Route `networth` added to
  `currentToolRoute` regex + `TOOL_PERMISSION` (→ `person`) + `VIEWS`. Gated with `can('person')`.
  Cache-bust `app.js`/`styles.css` `?v=20260815networth3`. Auto-appears in ⌘K (DOM-sourced nav-btn).
- **Calibration:** the LLM headline is the main lever now (edit `NW_SYSTEM`'s "what net worth means"
  rules); the deterministic prior/floor knobs (`STAGE` stakes/valMults, the 0.35 illiquidity discount,
  `execComp` bands, creator rate) still bound the low end. If estimates read too high/low for a role
  type, tune the prompt definitions first.
- **No new table / migration** — reuses `ROCKETREACH_API_KEY` (identity lookup, ~1 credit) + free
  web_search + the ANTHROPIC key. DECOUPLED from `runPersonDeepDive`; the only paid spend is the single
  RR identity lookup (no Apollo/FullEnrich).

---

## Session handoff — 2026-06-02 (lessons notifications + permissions)

- **Lesson submitted → notify curators.** `api/lessons.js` `notifyAdminsOfLesson`
  fires on a `pending` create — bell (`createNotification`, kind `'lesson'`,
  link `/research/admin`) + email to each admin (when RESEND set). Best-effort;
  skips the submitter. The admin chrome (snagged-admin) grew a matching bell +
  profile avatar reading the same `domain_research_notifications` table.
- **Lesson curation is now permission-gated, not strict admin.** GET/PATCH/DELETE
  in `api/lessons.js` use `requirePermission(req, res, 'admin.lessons.approve')`
  (admins still auto-pass via `userCan`); self-approve on create uses the same
  check. Granted per-user in the snagged-admin Users editor (catalog key
  `admin.lessons.approve`, stored flat in the `permissions` JSONB).
- **Read-only DB role** `claude_ro` (SELECT-only + BYPASSRLS) exists in this
  project for lookups; connection string is the `RESEARCH_PG_RO_URL` env var in
  the Claude Code web environment (helper: snagged-admin `scripts/db.py`).
- **Security:** Supabase flagged Master/naming for `rls_disabled_in_public` —
  enable RLS with no policies (service key bypasses); main research already has it.
