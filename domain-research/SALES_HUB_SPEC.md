# Sales Hub — per-name target list (spec)

**Goal:** turn Sales Research from a *run-and-export-a-CSV* tool into a persistent
**per-name workspace** where the target list lives, accumulates, and stays curated.
This is the efficiency change that came out of the July 17 Judy sales meeting: Judy
should open a name and see a focused, saved worklist — not re-run discovery and juggle
CSVs.

Scope is deliberately **additive** to the existing `/research/sales` module. No new
project, no CRM/HubSpot mapping, no new permission — reuses `research.sales` and the
three `domain_research_sales_*` tables already in `supabase/schema.sql`.

---

## Core principle — a target's worth is independent of its contact info

**A good target stays a target even when we can't find an executive's contact info.**
The best-fit buyer for a name might be the **#1 overall target** and still have no
reachable contact — that is a *contact-enrichment gap*, never a reason to demote, hide,
or drop them. Concretely, throughout this design:

- `is_target` and `shortlist_rank` (including rank 1) are set **by fit/ability-to-pay**,
  never gated on `enrich_status` or the presence of any `domain_research_sales_contacts`
  row.
- The Top 5 and Targets lists **never** sort a no-contact target below a lesser target
  that happens to have an email. A no-contact target simply shows a "no contact yet —
  Enrich" affordance in place of a contact.
- No cleanup/expiry ever removes a target for lacking contacts. Contact enrichment is a
  strictly *additive, optional, on-demand* layer on top of an already-committed target.

This is the one invariant to hold the whole build to.

---

## The friction today

Each Sales Research run is a dead-end:
1. Seed a domain → discovery returns ~15-20 ranked buyer companies.
2. Checkbox-select → enrich → **download CSV**.
3. The CSV lives in a sheet somewhere; nothing persists on the name.
4. Re-opening the name = re-running discovery from scratch.
5. **No manual adds** — a company you already know wants the name can't enter the
   list unless discovery happens to surface it.
6. **No shortlist** — Judy gets 20 rows, not "the 5 to work first."

## The Sales Hub (per name)

One screen per name (`/research/sales/:id`), organized around a **saved target list**:

### 1. Candidates → Targets (promote, don't export)
- Discovery output is saved to the name (already is — `domain_research_sales_candidates`).
- A candidate is a *suggestion*. **Promoting it makes it a Target** (`is_target=true`) —
  a first-class row that persists and is worked.
- The old "download CSV" stays as an export of the **Targets** (not all candidates), but
  it's no longer the point of the tool.

### 2. Manual targets, contact info optional
- **＋ Add company manually** form: `company` (required), `domain` (optional),
  `description`/`location`/`notes` (optional). No contact info required.
- A manual target is `is_target=true`, `manual=true`, `status='unknown'`,
  `enrich_status=null`. It sits in the list exactly like a discovered target.
- Contact enrichment is a **per-target on-demand button** (RocketReach), not a
  prerequisite — a target can live indefinitely with zero contacts and get enriched
  later, or never.

### 3. Top 5 shortlist
- A **⭐ shortlist** toggle on each target sets `shortlist_rank` (1-5). Max 5 per name;
  toggling a 6th is rejected client-side with a nudge to unstar one first.
- The hub pins a **Top 5** section up top — the focused worklist. Everything else is the
  full target list below it.
- Shortlist order is user-set (drag or up/down), stored in `shortlist_rank`.

### 4. Everything in one place
Research candidates, promoted + manual targets, per-target contacts, per-target status —
all on the name. The loop collapses to: discover → promote/add → shortlist 5 → enrich on
demand. No CSV round-trip.

---

## Data changes (additive, all `add column if not exists`)

Migration on the **research project** — `domain_research_sales_candidates`:

```sql
alter table domain_research_sales_candidates
  add column if not exists is_target      boolean not null default false,
  add column if not exists manual         boolean not null default false,
  add column if not exists shortlist_rank smallint,   -- 1..5, null = not shortlisted
  add column if not exists notes          text;

create index if not exists idx_sales_cand_target
  on domain_research_sales_candidates (project_id, is_target);
create index if not exists idx_sales_cand_shortlist
  on domain_research_sales_candidates (project_id, shortlist_rank)
  where shortlist_rank is not null;
```

Notes on existing columns we reuse (no change):
- `selected` stays as the transient checkbox state for bulk actions; `is_target` is the
  durable "on the list" flag. (Promote = set `is_target=true`; unchanged rows stay
  candidates.)
- `enrich_status` already drives the per-candidate enrich; the on-demand button just
  moves from the selection flow to a per-target action.
- Manual targets: `insertSalesCandidates` already inserts rows; a manual add is one row
  with `manual=true, is_target=true` and null firmographics/status.

**Degrade-gracefully:** all writers strip-and-retry the new columns on a 42703 (same
pattern as `is_plural`/`registrar`/`part_of_speech` elsewhere) so the module works
before the migration runs; the hub's target/shortlist features light up once it's
applied.

---

## API changes (`api/sales.js`, gated `research.sales`)

New/changed POST actions (existing `create`/`select`/`enrich`/`qualify` unchanged):

- `add_target` `{project_id, company, domain?, description?, location?, notes?}` →
  inserts one manual target (`manual=true, is_target=true`). Returns the new candidate.
- `set_target` `{ids[], is_target}` → promote/demote candidates to/from the target list.
- `shortlist` `{id, rank|null}` → set/clear `shortlist_rank` (server enforces the max-5
  per project; a rank collision reorders rather than duplicating).
- `update_target` `{id, notes?, company?, domain?, ...}` → edit a manual (or any) target's
  editable fields.
- `enrich` `{candidate_id}` — unchanged, but now the primary way contacts get added
  (per-target button).

GET `?id=` already returns the project + candidates + contacts; it additionally sorts so
shortlisted targets lead, then other targets, then un-promoted candidates. CSV export
(`?id=&format=csv`) exports **targets only** by default (`&all=1` for every candidate).

DB helpers (`lib/db/sales.js`): add `addManualTarget`, `setTargetFlag(ids, v)`,
`setShortlistRank(id, rank)`, `updateTarget(id, patch)` — each strip-and-retry on 42703.

---

## UI changes (`public/index.html` `#view-sales`, `app.js` `sales*`, `.sr-*`)

The seed → poll → ranked-table flow is unchanged for discovery. The results view gains
three regions:

1. **⭐ Top 5** (pinned) — the shortlisted targets, each a compact card: company · domain ·
   tier · best contact (or "no contact — Enrich") · notes. Reorderable.
2. **🎯 Targets** — every `is_target` row, with per-row: demote, ⭐ shortlist toggle,
   Enrich (on-demand), edit notes, contacts inline.
3. **Suggestions** — the un-promoted discovered candidates (the current ranked table),
   each with a **＋ Promote to target** action. "Show for-sale/inactive" toggle stays.

Plus an **＋ Add company manually** button (opens the manual-target form) above the
Targets region, and **Download targets CSV**.

Recent-runs list + deep-link (`/research/sales/:id`) already exist; the hub *is* the
opened run. Cache-bust `app.js`/`styles.css` on ship.

---

## Explicitly out of scope (this pass)
- HubSpot / CRM field mapping or push (CSV export only, as v1 always intended).
- Auto-outreach / email sequencing from the hub.
- Cross-name rollups (a "all my names" board) — each name is its own hub for now.
- Buy-side Deals CRM integration — this is the **sell-side** target list; keep them
  separate (the Deals CRM in snagged-admin is buy-side).

## Build order
1. Migration SQL (the 4 columns + 2 indexes) — run on the research project.
2. `lib/db/sales.js` helpers (+ strip-and-retry) and `api/sales.js` actions.
3. UI: Top 5 / Targets / Suggestions regions + manual-add form + promote/shortlist wiring.
4. CSV → targets-only. Cache-bust.
5. CLAUDE.md memory note in the same commit as the code.
