# Domain Owner Research — Working Rules & Project State

Source of truth for any Claude Code session picking up work on this repo. **Read this first.** The SessionStart hook will surface it on every new session.

---

## Working rules — read before committing

1. **Feature branches, not `main`.** Develop on `claude/<your-session-slug>` (Claude Code on the web names one automatically). Merge into `main` only at a clean, tested checkpoint. **`main` deploys directly to production (research.snagged.com) with no preview** — every push to main is an immediate live deploy.
2. **`git fetch` before any work.** The SessionStart hook does this and warns if your branch is behind. If it warns: read the new commits (`git log --oneline HEAD..origin/main`) before changing anything, or you'll duplicate work or conflict with another session.
3. **One session is primary.** If multiple sessions are open on this repo, designate one as the merger; others stay on their own feature branches and don't push to `main` without coordination.
4. **Push often.** A frozen session loses chat memory but not pushed work. Commit + push at every reviewable checkpoint.
5. **Decisions live in the repo, not chat.** When architectural decisions change, update this file (and/or `domain-research/SPEC.md`). Don't rely on prior conversation transcripts being available.
6. **Don't reinvent existing sources.** ~26 sources are already wired in `domain-research/lib/sources/index.js`. Check there before adding a new one.

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

---

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
`lib/db/supabase-zone.js` (`getZoneDb` / `isZoneDbConfigured`).

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

---

# Sales Research Agent (Phase 1A — Upgrade) — 2026-06-05

Find companies that would BUY a domain we're selling. UI at **research.snagged.com/research/sales**
(gated by the `research.sales` module permission). Full design in `domain-research/SALES_RESEARCH_SPEC.md`.

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
- **Permission:** `research.sales` in snagged-admin `dashboard/lib/permissions.ts`
  (MODULES + CATALOG; stored flat as `sales`). Grant per-user in the Users editor.

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
