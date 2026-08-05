# Sales Hub — per-name target list (spec)

**Goal:** turn Sales Research from a *run-and-export-a-CSV* tool into a persistent
**per-name workspace** where the target list lives, accumulates, and stays curated.
This is the efficiency change that came out of the July 17 Judy sales meeting: whoever's
working a name (Judy, Brian, …) should open it and see the target list they've built up —
with the best-fit companies marked — not re-run discovery and juggle CSVs.

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
6. **No way to mark the best fits** — you get 20 rows with no place to record "these are
   the top fits for this name" as you work through them.

## The Sales Hub (per name)

Enter a name (e.g. `carrot.ai`) → its hub opens (`/research/sales/:id`). The hub has
**two surfaces** and a persistent **target list** that ties them together.

### Surface A — Explore (multi-select → Add to target list)

The discovery side, where you gather candidates. It has the exploration modes the module
already supports, each with **checkbox multi-select + an "＋ Add to target list" button**:

- **Upgrades** — the ranked potential-upgrade companies for the name (`try.com`-style TLD/
  affix variations resolved to companies). Check several → **Add to target list**.
- **By category / angle** — explore product-named and keyword-angle companies (the existing
  `angles` / `research_angles` path — e.g. carrot.ai's "companies whose product is Carrot"
  and keyword-relevant companies). Check the ones that fit → **Add to target list**.

Adding is the *promote* action: the checked candidates get `is_target=true` and move onto
the target list. Explore stays a working scratch surface — you can come back and add more
from either mode at any time; the list accumulates.

### Surface B — Target list (the curated worklist)

Click into the **Target list** to see every company you've added — the shortlisted set for
this name. This is where curation + enrichment happen:

- **Add a company manually** — `company` (required), `domain`/`description`/`location`/
  `notes` (optional). No contact info required. A manual target sits in the list exactly
  like a discovered one (`manual=true`, `is_target=true`).
- **Delete** a company from the list (demote — `is_target=false`; it drops back to a plain
  candidate in Explore, not destroyed).
- **Mark top fits** — highlight the best fits for the name as a **⭐ Top 5 focus**
  (`shortlist_rank` 1-5, max 5, order-able). A human "this is a top fit" judgment made while
  working the list, not an auto-ranking or an assignment. The 5 pin to the top of the list.
- **Enrich** — kick the contact-enrichment (RocketReach) here, per-target on demand (or
  bulk over the selected/whole list). Enrichment is **strictly optional and additive** — a
  target (including a #1 top fit) stays on the list with zero contacts; see the invariant
  above.

### The hub persists everything (shareable, returnable, appendable)

All of it — the added targets, the top-5 marks, the notes, the enriched contacts — is saved
in the name's hub. You can **share it** (§ below), **come back to it** later, and **append**
more targets (from Explore or manually) over time. Nothing is a throwaway run; the hub is
the durable home for the name's sell-side target work.

### Link-shareable
The hub has a **🔗 Share** button that copies a clean, stable URL to *this name's hub*
(`https://app.snagged.com/research/sales/<id>`) — so a target list can be handed to a
teammate (e.g. Judy) with one link instead of a CSV.

- **Access model — internal, gated (default).** The link opens the hub for any teammate
  with `research.sales` (the same gate the tool already uses); it is **not** a public
  no-login page. A sales target list is internal competitive intel, so unlike the Domain
  Owner *report* share (which is public with an OG preview), this share stays behind auth.
  A logged-out visitor hits the normal login wall, then lands on the hub.
- **Stable slug.** Reuse the existing `buildSlug`-style shape so the URL is readable:
  `/research/sales/<seed_domain>-<id>` (the id is regex-extracted on open, mirroring the
  report slug so a bare `/research/sales/<id>` also works). Deep-link + recent-runs already
  resolve by id — the share URL is just that route made copyable.
- **Optional (not v1): public read-only view.** If you later want to share a shortlist
  *outside* the team, add a per-hub `public` flag + a token'd public route (like `api/r.js`)
  that renders the Top 5 read-only, no contacts. Flagged out of scope below; the gated share
  covers the internal share workflow.

---

## Data changes (additive, all `add column if not exists`)

Migration on the **research project** — `domain_research_sales_candidates`:

```sql
alter table domain_research_sales_candidates
  add column if not exists is_target       boolean not null default false,
  add column if not exists manual          boolean not null default false,
  add column if not exists shortlist_rank  smallint,     -- 1..5, null = not a top fit
  add column if not exists notes           text,         -- free-text comments per company
  add column if not exists added_at        timestamptz,  -- when promoted onto the target list
  add column if not exists shortlisted_at  timestamptz;  -- when marked a ⭐ top fit

create index if not exists idx_sales_cand_target
  on domain_research_sales_candidates (project_id, is_target);
create index if not exists idx_sales_cand_shortlist
  on domain_research_sales_candidates (project_id, shortlist_rank)
  where shortlist_rank is not null;
```

**Per-company metadata.** `added_at` is stamped when a company is added to the target list
(via `add_to_targets` or a manual add), `shortlisted_at` when it's first marked a top fit —
so the list can show/sort by "date added" and "date shortlisted." `notes` is the free-text
**comments/notes on each company** (edited inline on Surface B). A single notes field covers
v1; if a threaded comment *log* per company is wanted later, it's an additive child table
(`domain_research_sales_notes`) — out of scope here.

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

New/changed POST actions (existing `create`/`select`/`angles`/`research_angles`/`enrich`/
`qualify` unchanged — the `angles`/`research_angles` path already powers Explore's
by-category mode):

- `add_to_targets` `{project_id, ids[]}` → **the "Add to target list" bulk action** from
  Explore (upgrades or by-category): promotes the checked candidates (`is_target=true`,
  stamps `added_at`).
- `add_target` `{project_id, company, domain?, description?, location?, notes?}` →
  inserts one **manual** target (`manual=true, is_target=true`, `added_at=now()`). Returns
  the new candidate.
- `remove_target` `{ids[]}` → **delete from the list** (demote `is_target=false`; the row
  stays a candidate in Explore, not destroyed).
- `shortlist` `{id, rank|null}` → set/clear the **⭐ Top-fit** `shortlist_rank` (server
  enforces max-5 per project; a rank collision reorders rather than duplicating; stamps
  `shortlisted_at` on first mark).
- `update_target` `{id, notes?, company?, domain?, ...}` → edit a target's editable fields.
- `enrich` `{candidate_id}` — unchanged single-target enrich; **`enrich {ids[]}`** added for
  bulk enrich over selected targets. The primary way contacts get added, from Surface B.

GET `?id=` returns the project + candidates + contacts, split so the UI can render both
surfaces: `targets` (is_target, shortlisted first) and `candidates` (the Explore pool).
CSV export (`?id=&format=csv`) exports the **target list** by default (`&all=1` for every
candidate).

DB helpers (`lib/db/sales.js`): add `addToTargets(ids)`, `addManualTarget(...)`,
`removeTargets(ids)`, `setShortlistRank(id, rank)`, `updateTarget(id, patch)`,
`listTargets`/`listCandidates` — each strip-and-retry on 42703.

---

## UI changes (`public/index.html` `#view-sales`, `app.js` `sales*`, `.sr-*`)

Two surfaces under the name's hub, with a toggle/tab between them (the seed → poll flow
into Explore is unchanged):

**Surface A — Explore** (the existing discovery UI, extended):
- **Upgrades** table + a **By category / angle** view (product-named + keyword companies,
  the existing angles UI). Both get a **checkbox column** and a sticky **"＋ Add to target
  list (N)"** button that fires `add_to_targets` for the checked rows. "Show for-sale/
  inactive" toggle stays. A row already on the list shows an "✓ on list" chip.

**Surface B — Target list** (new view, click in from a "🎯 Target list (N)" tab):
- **⭐ Top 5** pinned at the top — best-fit cards (company · domain · tier · best contact
  or "no contact — Enrich" · notes), order-able.
- The full target list below: per-row **⭐ top-fit toggle**, **Enrich** (single) / **Enrich
  selected** (bulk), **edit notes/comments** (inline), **date added** (+ date shortlisted),
  **✕ remove from list**, contacts inline. Columns are sortable (incl. by date added / tier).
- **＋ Add company manually** button (opens the manual-target form).
- **Download target-list CSV**.

Both surfaces live under the hub header (name + **🔗 Share**). Recent-runs list + deep-link
(`/research/sales/:id`) already exist; the hub *is* the opened run, now durable + appendable.
Cache-bust `app.js`/`styles.css` on ship.

---

## Explicitly out of scope (this pass)
- HubSpot / CRM field mapping or push (CSV export only, as v1 always intended).
- Auto-outreach / email sequencing from the hub.
- Cross-name rollups (a "all my names" board) — each name is its own hub for now.
- Buy-side Deals CRM integration — this is the **sell-side** target list; keep them
  separate (the Deals CRM in snagged-admin is buy-side).
- **Public (no-login) read-only share** — the v1 share link is internal/gated
  (`research.sales`). A token'd public Top-5 view can come later (see §5).

## Build order
1. Migration SQL (the 4 columns + 2 indexes) — run on the research project.
2. `lib/db/sales.js` helpers (+ strip-and-retry) and `api/sales.js` actions.
3. UI: Top 5 / Targets / Suggestions regions + manual-add form + promote/shortlist wiring.
4. 🔗 Share button (copyable gated deep-link) + CSV → targets-only. Cache-bust.
5. CLAUDE.md memory note in the same commit as the code.
