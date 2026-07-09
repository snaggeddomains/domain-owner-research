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
- **TODO (this session):** historical backfill — POST every domain ever researched
  (distinct `domain` in `domain_research_runs`) into DomainScout so the existing
  corpus is tracked too.

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
- **Cross-references OUR corpora (2026-07-09).** The sweep now ALSO batch-looks-up the
  enumerated set against `name_universe` + the `Master Domain List` (`lib/variations/
  corpus.js` `lookupInternal`, one exact-domain `.in()` per corpus, parallel to the live
  sweep, fail-open). Each row gets `r.internal` — `in_universe`/`in_master`, our stored
  `best_price`/`price` + source, and an `owner` (owned-feed universe → Snagged/Rob, or a
  Master attribution). UI shows a "📇 In our corpus · $X · afternic" / "🏷 <owner>" badge
  under the domain; CSV gains In-our-corpus / Owner / Our-price columns. Behavior change
  is minimal + safe: a FOR-SALE row the live crawl couldn't price is filled from our
  stored price (`price_internal`, tagged "our corpus"); we never flip an available/active
  row on stale corpus data.
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

# Person deep-dive — social-URL → identity + VIP + contacts (2026-07-09)

Takes ONE **social-profile URL** (LinkedIn / X / Facebook / Instagram / Quora /
YouTube / …) and produces a dossier on that person. UI at **research.snagged.com/
research/person**, gated by the `research.person` module permission. Reuses the
existing enrichment stack — **no new vendor/env key**. Deterministic pipeline (not
the agent). **Free-first + reveal:** the auto pass is free-ish (search/read_url/
rocketreach_search + one LLM synth); the **paid** contact lookup is a separate
button.

- **Engine** `lib/person/orchestrate.js`:
  - `runPersonDeepDive({url,name?,company?,env})` — the FREE pass. (1) IDENTIFY:
    `read_url` the profile (Scrape.do for bot-walls) + `rocketreach_search`
    (FREE, accepts `linkedin_url`) → name/title/employer/linkedin/location. (2)
    TRIANGULATE: a broad `web_search` (harvest platform links + knowledge_graph) +
    targeted `site:` searches for the platforms not yet placed, then `read_url`
    each to read **follower/subscriber/connection counts** (best-effort — X/LinkedIn
    often gate them). (3) Roll up a transparent **VIP band** (`low`/`notable`/
    `high_profile`/`vip`) from max-followers × platform-count × Wikipedia/knowledge-
    panel × title seniority — every firing signal is listed. (4) SYNTHESIZE: one LLM
    call (`PERSON_MODEL`||`OUTREACH_MODEL`, default sonnet) writes summary/role/
    prominence/notable/reach_recommendation. All steps fail-open.
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
- **Permission:** `research.person` added in snagged-admin `dashboard/lib/permissions.ts`
  (MODULES + RESEARCH_TABS + CATALOG; stored flat as `person`). Grant per-user; admins
  auto-pass. Optional model override `PERSON_MODEL`.

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
