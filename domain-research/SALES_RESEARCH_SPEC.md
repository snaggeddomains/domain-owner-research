# Sales Research Agent — spec

Internal name **Sales Research Agent** (the agency scoping doc calls it "Snagged
Domain Research Agent" / a "Rosedale app" — same project; we are building it
**in-house**, not as the standalone agency app). Reconciled with the scoping doc +
Rob/Shubham comments on 2026-06-05.

**Status:** Phase 1A (Upgrade discovery) in progress. Architecture designed so
Keyword discovery is **additive**, not a refactor.

## Locked decisions (2026-06-05)

1. **Build in-house** as a research.snagged.com module — reuse the wired enrichment
   (RocketReach/FullEnrich) + classification engine; no standalone app, no new
   repo/Vercel/Supabase project.
2. **CSV export only for v1** — clean CSV now; defer CRM-specific mapping (HubSpot
   per the doc vs Salesforce per Rob) until the discovery/enrich core is proven.
   Both CRMs import CSV.
3. **Two category buckets: Upgrade / Keyword** — fold the doc's stray "Exact Match"
   under Upgrade. Category (why they'd buy) is **separate from** the Active /
   For-Sale / Inactive **status** axis (whether they're a viable target).
4. **Phase 1A = Upgrade first** — full spine on the Upgrade path; Keyword follows.
5. **POC = `try.com`**; Phase-1 target = match/exceed the manual baseline of ~15-20
   high-quality companies per domain (Rob: ">20 assuming relevant results").

## Build status (2026-06-05) — read this to resume

All Sales Research work is on branch **`claude/busy-carson-C7X2Y`** (NOT merged to
main — half-built; main = prod). `git fetch && git checkout claude/busy-carson-C7X2Y`
first.

**Built + committed:**
- `lib/sales/discovery/upgrade.js` — Phase 1A Upgrade discovery (enumerate locked
  prefix/suffix/TLD variations × free Clearbit autocomplete + exact-TLD resolution
  + lightweight classify). Runs standalone: `node lib/sales/discovery/upgrade.js
  artificial.com` → 20 candidates (10 active) at zero paid spend.
- `lib/sales/enrich/firmographics.js` — the one paid slot: `firmographics(domain,
  env)` dispatches to Apollo / PDL / `merged` (default; Apollo primary + PDL gap-fill).
  Captures the full ability-to-pay field set; `abilityToPay(rec)` → tier+signals.
- `lib/sales/resolve.js` — RESOLVE + CLASSIFY + RANK (mode-agnostic spine). Names
  companies via firmographics with an og:site_name/`<title>` fallback for bare
  variants; CLASSIFY reuses livesite `extractClues` (parking detection); ranks by
  `abilityToPay`; dedupes by company. **Cost control: enriches ACTIVE candidates
  only + per-run company cache.** Standalone: `node lib/sales/resolve.js
  artificial.com [--no-enrich]`.
- `lib/sales/enrich/contacts.js` — `enrichCompany()` = RocketReach search→lookup,
  role-targeted by company size (SMB: Founder/CEO/CMO/CTO; Enterprise: legal/finance).
- **FULL SPINE (2026-06-05, on branch — needs deploy + SQL):**
  - DB: `domain_research_sales_{projects,candidates,contacts}` in `supabase/schema.sql`
    (RLS auto-enabled by the trailing loop). **Run the new tables on the research
    project before use.**
  - Pipeline: `runSalesResearch` Inngest fn (`lib/inngest/functions.js`,
    event `SALES_RESEARCH_REQUESTED`) — discover → resolve → persist.
  - API: `api/sales.js` — `create` (enqueue) · GET poll · `select` · `enrich` (sync,
    per-candidate). Gated by `research.sales`.
  - UI: `/research/sales` tab (`public/index.html` `#view-sales`, `app.js` sales block,
    `.sr-*` styles) — seed → poll → ranked table (tier/status badges, ability-to-pay
    reasons) → checkbox-select → Enrich selected (RocketReach contacts inline) →
    Download CSV. Active-only by default; "Show for-sale/inactive" toggle.
  - Permission: `research.sales` added to snagged-admin `dashboard/lib/permissions.ts`
    (MODULES + CATALOG; stored flat as `sales`). Grant per-user in the Users editor.
  - **Validated offline + live discovery/resolve** (artificial.io → STRONG at top of
    the ranked table). DB/Inngest/API/UI glue is syntax-checked + pattern-matched but
    needs a deploy to exercise end-to-end (sandbox has no node_modules / Inngest /
    live research Supabase).

**Firmographic bake-off — DONE (2026-06-05).** Both keys live in the Claude Code web
env. `lib/sales/enrich/bakeoff.js` runs Upgrade discovery for a seed then enriches every
candidate through BOTH providers and scores them (`node lib/sales/enrich/bakeoff.js
artificial.com`). Result on the 20 `artificial.com` candidates:
- **Near-dead-heat; Apollo the default.** Viable set (active+for_sale, n=12): Apollo
  matched 9/12 @ 52% cell fill · PDL 9/12 @ 50%. All-20: Apollo 14 matched / 48% · PDL 15
  matched / 45%. PDL matches one more (caught `intelli-science.com`); Apollo's employee
  counts are fuller and casing is cleaner (PDL lowercases everything). They agree on every
  company name + location. **Keep Apollo as the `FIRMOGRAPHICS_PROVIDER` default** (it
  also doubles as the cheap-email source for the ENRICH waterfall); PDL stays the wired
  swap-in.
- **Funding is ~empty (1/20, both)** — only `artificial.io`=Artificial Labs (£72M) returns
  it, because the rest of this set is small grass/lawn/media shops that never raised. Not a
  provider weakness — funding will populate for fundable targets. `industry`+`location`
  fill strongly on both; `employees` ~55%.
- **tld_variant naming (the load-bearing Q): firmographics-by-domain names a bare variant
  ONLY when that exact domain is the company's indexed primary domain.** Both named
  `artificial.io → Artificial Labs` (1/6); both correctly MISS `artificial.co` — it's a
  "Welcome!" holding page, not a business (the spec's old `artificial.co → Artificial Labs`
  example had the TLD wrong; it's `.io`). **Implication for RESOLVE:** a per-domain
  firmographic call is necessary but NOT sufficient for bare variants — add a fallback
  (livesite `<title>`/`og:site_name`, or follow the redirect → enrich the target). And
  `artificial.co` landing as `active` on a bare 200 reconfirms CLASSIFY needs the heavier
  `marketplace_check`/`livesite_inspect` check, not the lightweight HTTP probe.

**Funded-seed re-test (2026-06-05) — funding is structurally sparse, not a seed/vendor
gap.** Re-ran the bake-off on funded-tech-skewing seeds (`ramp`/`loop`/`scale`) to find
the true funding ceiling. Funding fill stayed low everywhere: ramp 0/13, loop 3-4/31,
scale 3/26 — ~10-15% of *matched*. Why: name-match autocomplete surfaces every company
whose name/domain *contains* the word, which is dominated by micro/SMBs ("Get Looped",
"HiLoop", 1-2 employees) regardless of seed; the funded ones are always the minority.
They ARE captured richly when present (loop.com: Loop $126M, OpenLoop $26M, Loop.AI $124M,
Native Instruments $55M) — funding is a **ranking signal that floats fundable buyers to
the top, not a fill-rate target.** Three actionable findings:
- **Union Apollo+PDL for funding recall — their coverage is complementary.** On loop.com
  Apollo caught Loop/OpenLoop/Native Instruments/LoopLab; PDL caught Loop.AI's $124M that
  Apollo *missed*. Querying both and merging beats either alone for the load-bearing
  funding field (cost is fine — firmographics is on-demand per selected company).
- **Ability-to-pay ranking must coalesce funding → employee_count → revenue.** Funding is
  null for most real-but-bootstrapped companies; `employees` fills ~55-60% of matched and
  is the usable size proxy. Don't let funding-null sink a viable target.
- **Apollo rate-limits (429) under burst; PDL is tolerant.** Three back-to-back seeds at
  concurrency 6 made Apollo return 0/26 on `scale.com` (works fine in isolation). The
  pipeline's firmographic call needs 429 backoff/retry (PDL is the resilient fallback).
- **PDL returns no revenue on our plan** (the `inferred_revenue` field is absent) → Apollo
  is the only revenue source; another reason Apollo stays the default + PDL the union/fallback.

**Enrichment depth + ability-to-pay qualifier (2026-06-05).** Goal: capture enough signal
to judge whether a target is realistically at a stage to spend on a domain upgrade. We were
mapping ~4 fields; Apollo actually returns far more, all now captured in the normalized
record (`firmographics.js`): `employees`, `headcountGrowth{sixMo,twelveMo,twentyFourMo}`,
`departments` (non-zero head counts), `revenue`/`revenueAmount`, `funding`/`fundingAmount`,
`fundingStage`, **`latestFundingDate`** (recency — a recent raise = cash on hand, the best
"can spend now" signal), `fundingRounds`, `lastRound{date,type,amount,investors}`,
`foundedYear`, `phone`, industry/location/linkedin/description.
- **`abilityToPay(rec)`** turns that into `{tier: strong|medium|low|unknown, signals[],
  reasons[]}` — transparent + tunable (final RANK weights still Shubham's; this is the
  inspectable signal layer). e.g. `artificial.io` → **STRONG**: raised £71.3M (Series B) ~4mo
  ago · £5.6M revenue · 110 employees · +50% headcount/12mo. `artificiallawyer.com` → **LOW**
  (3 employees, no funding). On a loop.com sample: Loop.AI/LOOP.co/looperman = medium
  (revenue + headcount growth), the micro-shops = low. Exactly the spend-readiness sort the
  sales team needs.
- **`merged` is now the default provider** (`FIRMOGRAPHICS_PROVIDER`): field-priority union
  of Apollo (primary) + PDL (gap-filler), since their funding coverage is complementary.

**Provider quotas (operational — BOTH free tiers are now fully tapped):**
- **Apollo**: the binding limit is a **monthly enrichment-credit cap — 95 credits/mo on the
  free plan, 1 credit per org-enrich.** Validation testing exhausted it (dashboard showed
  98/95, all Enrichment usage; renews ~Jun 19). On top of that, per-window rate limits of
  50/min · **200/hour** · 600/day (verified via response headers). `firmographics.js` honors
  `Retry-After`: retries only short per-minute waits, fails fast on the hour/day/credit
  window so the pipeline degrades to discovery-only instead of blocking.
- **PDL**: company-enrich quota **also exhausted** (`402 "all matches used"`) — small free
  allotment spent, and returns no revenue on our plan. Top-up only.
- **Implication — validated but not yet operable.** The free credits were enough to PROVE the
  stack (enrichment fields + `abilityToPay` qualifier confirmed working) but not to run it.
  To operate we need a **paid Apollo tier** (the workhorse; PDL credits a secondary top-up).
  Until then firmographics returns null and the pipeline runs discovery-only. Regardless of
  tier, enrich **on-demand, per selected company** (the spec's intent) — never auto-enrich a
  30+ candidate set, or one project torches the monthly credits in a single run.

**Next step — the Phase 1A spine (below).** Bake-off settled the vendor (Apollo default + the
`abilityToPay` qualifier, PDL union top-up); build RESOLVE on Apollo + a title/redirect
fallback for bare variants, a size-coalesced ranking off the `abilityToPay` signals, and
on-demand (not bulk) enrichment to respect the 200/hr cap.

**Then (Phase 1A spine):** wire RESOLVE (firmographics → name the `tld_variant`
rows, e.g. `artificial.co` → Artificial Labs; dedupe by company) + a real CLASSIFY
(reuse `marketplace_check`/`classifyPair`/`livesite_inspect` instead of the
lightweight HTTP check — the first run mis-marked a Dan-parked lander as active) →
`domain_research_sales_*` tables → `runSalesResearch` Inngest fn + `research.sales`
permission + `/research/sales` UI → select → enrich (RocketReach + FullEnrich) → CSV.

## What it does

Input a domain **we are selling** (e.g. `try.com`). Output a vetted, ranked,
CSV-exportable list of **companies who would plausibly buy it**, each with
decision-maker contacts, for the sales team to outreach. Replaces a manual process
that takes hours/domain for only 15-20 companies.

Despite the name, the v1 "agent" is a **deterministic Inngest pipeline** with LLM
sub-steps (concept expansion, company resolution, ranking) — predictable + debuggable.

## Where it lives

- **Pipeline:** new Inngest fn `runSalesResearch` alongside `runResearch`
  (`lib/inngest/functions.js`).
- **Discovery/classify tools:** new entries in the `lib/sources/` registry (ride the
  same `runTool` + PAID-gating framework).
- **Storage:** new `domain_research_sales_*` tables in the **main research** Supabase
  project (RLS auto-enabled by the `domain_research_%` loop in `supabase/schema.sql`).
- **Permission:** new module key `research.sales` (granular, per the FORWARD RULE).
- **UI:** new `/research/sales` tab. Baseline UI reference:
  `project-domain-search-dashboard-524.magicpatterns.app` (the agency prototype).

## Two axes (don't conflate)

- **Category — why they'd buy** (the doc's bucket): `upgrade` | `keyword`.
- **Status — is it a viable target** (the prototype's tabs): `active` |
  `for_sale` | `inactive`. **For-Sale landers (Afternic/Sedo/Spaceship) are bad
  targets** — a domainer, not an operating business — surfaced but excluded by default.

## The spine (shared by every discovery mode)

```
seed (domain we're selling, + optional industry/geo filter)
  → DISCOVER   (pluggable modules → raw candidates, tagged with category)
  → RESOLVE    (domain → company name / category / description / size / funding)
  → CLASSIFY   (status: active | for_sale | inactive)
  → RANK       (funding, size, traffic, recency — formula TBD)
  → [human selects fits]               ← Rob's "Phase 1A" intermediate display+select
  → ENRICH     (decision-maker contacts, on demand)
  → EXPORT     (CSV)
```

RESOLVE, CLASSIFY, ENRICH, EXPORT are **mode-agnostic** and mostly already built here:

- **CLASSIFY** = parked-lander detection from Nameserver Search: `marketplace_check`
  + `classifyPair` (Afternic/Sedo/**Spaceship** NS = parked) + `livesite_inspect`
  + `dns`/`whois`.
- **ENRICH** = the swappable enrichment stack (see "Enrichment stack" below); on
  demand per selected company. **Role targeting by company size:**
  - SMB/mid: Founder, CEO, CMO, CTO, CFO.
  - Enterprise: functional/legal leaders — Assoc. General Counsel, anyone with
    "IP"/"Trademark" + legal in title, CFO/SVP Finance, GMs/SVPs of tech/finance/legal.
    (A premium-domain buy at a big company is a legal/brand/IP decision.)
- **RESOLVE/enrich fields** (doc "Ideal Output"): company name + website, category,
  employee count, HQ location, funding status; ranking fields (funding raised, size,
  traffic, recency). Contact: name + title, email + phone, LinkedIn.
- **EXPORT** = CSV (CRM-agnostic v1).

## Enrichment stack (swappable roles — shared by both apps)

Enrichment is **three decoupled roles**, each a slot in `lib/sources/`, each
independently hot-swappable so the Domain Owner app AND the Sales Research Agent
inherit any upgrade. Never couple phone-accuracy to discovery quality — different
vendors win each role.

| Role | Does | Current | Status |
|---|---|---|---|
| Company discovery + firmographics | find companies; size/funding/location/desc | — | open (discovery bake-off) |
| People discovery | decision-makers at a company | **RocketReach** | locked |
| Contact verification | verified email + mobile for a known person | **FullEnrich** | open to replace |

**Cost-tiered waterfall** (bakes the "$1.50 only when we mean it" rule into the
architecture, not just a UI button): cheap email first (RocketReach / Apollo email,
near-free) → paid verified phone **only on demand**, only on the execs the user
selects. The verified-phone vendor is the swappable terminal step.

**FullEnrich replacement candidates** (parallel **contact bake-off**, scored
hit-rate × cost on the same real execs): LeadMagic (dev-first, cheap), BetterContact
(apples-to-apples waterfall), Prospeo/Datagma (budget), Cognism (premium verified
mobile, intl/EU), Apollo (bundled, cheapest, weakest phone). Decision posture:
**decouple, don't consolidate** — keep RocketReach for people; swap the
verified-phone slot on cost × hit-rate.

## Discovery modules — the extensibility seam

Every mode implements one interface so the pipeline just iterates configured modules:

```js
// lib/sales/discovery/<mode>.js
export default {
  mode: 'upgrade' | 'keyword',
  async discover(seed, ctx) {       // seed = { domain, sld, tld }, ctx = { env, project, filters }
    return /* Candidate[] (unresolved): { domain?, company_hint?, category, angle?, reason } */;
  },
};
```

Candidates from any module share the **same** RESOLVE→CLASSIFY→RANK→select→ENRICH
spine and the **same** `domain_research_sales_candidates` table. `category`
('upgrade'/'keyword') and optional `angle` (Keyword only) are columns — Keyword adds
rows, not schema branches or pipeline forks.

### Phase 1A — Upgrade discovery (build now)

Three sub-problems, three sources — only the third has volume, and it does NOT come
from the zone index:

| Sub-type | Example (try.com) | Source | Volume |
|---|---|---|---|
| Same SLD, other TLD | `try.io`, `try.ai` | **Enumerate** TLD list → resolve | 7 TLDs |
| SLD + affix | `gettry`, `tryapp`, `tryhq` | **Enumerate** affix dict → resolve | low thousands |
| Keyword in a brand name/domain | companies "…try…" / *with 'try' in the name* | **Company DB**, filtered active | the bulk |

**Locked variation dictionaries (from the doc):**
- Prefixes: `Try, Use, Get, The, Meet, Open, Hi, Hello`
- Suffixes: `App, Labs, Hub, HQ`
- TLDs: `com, ai, xyz, org, co, net, io`

**Why not the zone index for sub-type 3:** it's a *registration* list (knows what
exists, not what's a live business); "contains try" is millions of junk rows,
un-liveness-checkable at volume, and you can't enumerate your way to arbitrary brand
names. A **company DB** has "real, live, operating business" natively → collapses the
junk to a few hundred real companies before any liveness check.

**Sources:**
- **Enumeration** (sub-types 1-2): generate the bounded TLD/affix candidate list →
  resolve via `whois`/`rdap` + `livesite_inspect` (+ web). Zone index = an *instant
  registration check* for the 6 doc TLDs we already hold (`com/ai/xyz/org/co/io`);
  only `.net` needs a live resolve. No external spend.
- **Company DB name-match** (sub-type 3, the bulk): query the discovery vendor for
  companies whose **name or domain contains the SLD**, filtered active. This is the
  **same vendor** Keyword will use — onboard it here on the easy query first.
  Crunchbase is too startup-skewed for traditional spaces; **PDL/Apollo/Clay** cast
  wider. *(Vendor still TBD — see Dependencies.)*

Liveness is enforced downstream by CLASSIFY regardless of source.

**First codeable slice (no new vendor needed):** enumeration (1-2) + resolve +
classify + existing enrich + CSV. The company-DB name-match (3) lands when a vendor
key is secured.

### Phase 1B / 2 — Keyword discovery (design only)

A seed is a **polysemous seed**, not a topic — `doe` → {finance/"dough", baking,
legal anonymity, wildlife, surname}; the doc's own Phase-2 example is `try` →
try-on/virtual clothing (Doji.com, Google Try-On). So Keyword is:

1. **Angle enumeration** (cheap LLM): N interpretation clusters, each with concept
   vocab + likely industries. `pizza` ≈ 1; `doe`/`try` ≈ several. Seed from universe
   enrichment (`keywords[]`/`industries[]`/`category`) when the domain is in our corpus.
2. **Angle gate** (human checkpoint): show angles first; the salesperson picks which
   to research **before** the expensive fan-out → cost control + precision.
3. **Per-angle discovery:** each chosen angle runs its own corpus query + web-scan →
   `angle`-tagged candidates.
4. **Per-angle ranking** (LLM over name + description + products); recall-first then
   rank+filter — opposite of Upgrade's precision-first tuning.

The doc distinguishes a *simple* keyword (description literally contains the word)
from *product-relevance* (the term is what they build); we target the richer
semantic version (angles cover both).

## Data model (main research project)

```sql
create table if not exists domain_research_sales_projects (
  id          uuid primary key default gen_random_uuid(),
  seed_domain text not null,
  seed_sld    text not null,
  filters     jsonb,                                -- optional industry/geo
  status      text not null default 'pending',     -- pending|running|done|failed
  created_by  uuid,
  created_at  timestamptz not null default now(),
  angles      jsonb                                 -- Keyword phase; null in 1A
);

create table if not exists domain_research_sales_candidates (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references domain_research_sales_projects(id) on delete cascade,
  domain        text,
  company       text,
  company_url   text,
  description   text,
  employee_count int,
  location      text,
  funding       text,
  category      text not null,                      -- 'upgrade' | 'keyword'
  angle         text,                               -- keyword only
  status        text,                               -- 'active' | 'for_sale' | 'inactive'
  match_reason  text,                               -- why it surfaced (audit/UX)
  score         numeric,                            -- rank
  selected      boolean not null default false,
  enrich_status text,                               -- null|pending|done|failed
  created_at    timestamptz not null default now()
);
create index if not exists idx_sales_cand_project on domain_research_sales_candidates (project_id);
create index if not exists idx_sales_cand_status  on domain_research_sales_candidates (project_id, status);

create table if not exists domain_research_sales_contacts (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references domain_research_sales_candidates(id) on delete cascade,
  name         text,
  title        text,
  email        text,
  phone        text,
  linkedin     text,
  source       text,                                -- rocketreach|fullenrich|...
  created_at   timestamptz not null default now()
);
create index if not exists idx_sales_contacts_cand on domain_research_sales_contacts (candidate_id);
```

## Phase plan (reconciled with the doc's phases)

- **Phase 1A — Upgrade** *(now)*: tables + `research.sales` permission + `/research/sales`
  shell; enumeration discovery (TLD/affix) → resolve → classify → display → select →
  enrich → CSV. Company-DB name-match added when a vendor key lands.
- **Phase 1B — Keyword**: angle enumeration + angle gate + per-angle discovery + ranking
  (the doc's "Phase 2: term relevant to product offering"). Same spine/tables.
- **Phase 2 — CRM + value props** (doc Phase 2): auto-generated value-prop bullets;
  HubSpot/Salesforce-mapped CSV or direct push.
- **Phase 3 — Monitoring**: background re-surface of new prospects on funding/events.
- **Phase 4 — Ability-to-pay** signals + outreach hooks.

## Non-goals (from the doc)

No HubSpot/CRM email automation (later), no LinkedIn automation/bots, no
exhaustive/perfect revenue enrichment.

## Probe findings (2026-06-05) — the discovery engine can be free

Tested `artificial.com` / `pizza.com` against the free web-search baseline and a free
structured source (Clearbit autocomplete, name→domain, no key):

- **Bare-word web search returns the *category*, not buyers** — "artificial" → the AI
  industry; couldn't surface the brands or the `.com` owner. Web-LLM **fails** clean
  name-match on common SLDs.
- **Angle-scoped web search is clean + high-recall + free** — "artificial grass"/
  "artificial diamonds" each returned ~10 real companies, ~zero junk. The **angle-gate
  is load-bearing**: it's what makes the free baseline work for Keyword.
- **Structured name-match recovers what web-LLM can't, also free** — Clearbit
  autocomplete on "artificial" → Artificial Grass GB, Artificial Lawyer,
  `artificialintelligence-news.com`… the *exact rows in the baseline app's screenshot*.
  So the baseline is already powered by autocomplete, not a paid DB. High-precision but
  recall-capped (~5/query) → enumerate variations × autocomplete ≈ the full name-match
  layer (explains the 39).
- **Validated:** a thin 13-variation pass × autocomplete returned **14 unique clean
  companies** for `artificial.com` (matching baseline rows) at zero paid spend — at the
  15-20 target's doorstep; a full enumeration + free angle-scoped Keyword clears 20. The
  pass also surfaced a For-Sale lander (`openartificialintelligence.com`→Dan.com),
  confirming CLASSIFY is load-bearing.

**Conclusion — the paid footprint is much smaller than the doc implies.** The
discovery *engine* is free end-to-end: Upgrade = enumerate × Clearbit autocomplete;
Keyword = angle-gate + web-LLM. The **only** thing worth paying for is
**firmographics** (employee count, funding, location, traffic) — needed for RANKING
(ability-to-pay) and the enrich columns, and only as an **on-demand, per-selected-
company** lookup, not a bulk discovery license. Wrap autocomplete behind the source
interface (logo.dev / The Companies API as swap-ins) since it's an undocumented
free endpoint.

## Dependencies & open decisions

1. **Firmographic enrichment vendor** *(the only real paid footprint — see Probe
   findings)* — bake off Apollo / PDL / paid-Clearbit on **cost-per-enriched-company
   × firmographic fill rate**, NOT discovery recall. Used on-demand for ranking +
   enrich fields. Discovery itself runs free (autocomplete + web-LLM); a paid name-
   search API is only needed if the free autocomplete recall ceiling proves too low.
2. **Ranking formula** — inputs known (funding, size, traffic, recency); weights "Need
   to define" (Shubham). Lean toward ability-to-pay (funding/size) heavy.
3. **Angle-gate UX** — pick interpretations up front (cost control) vs auto-run all +
   filter on results. Leaning up-front.
4. **Seed concept override** — always the literal SLD, or allow a human-supplied
   concept (sell `dough.com`, target baking)?
