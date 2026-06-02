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

**Search endpoints:** `api/dbsearch.js` = Domain **Name** Search (filterable browse,
`db=both|universe|master`, gated by `dbsearch`); `api/dbscreen.js` = Domain DB
**Screen** (single-domain lookup, gated by `dbscreen`). Owner of owned-feed domains
is derived in `lib/sources/universe_ownership.js` (snagged/berserk → Snagged,
rob_purchases → Rob Schutz). TLD filters require a single-dot domain.
