// Internal-owner attribution for the Domain Owner report — a SLIM read of our two
// internal stores so the report can lead with a prominent "we already have a record
// for this" call-out when our own DB attributes an owner:
//   • Master Domain List  (curated/owned; MASTERLIST_SUPABASE_*)  → owner + source + price
//   • name_universe       (broad market; SUPABASE_NAMING_*)       → owned-feed owner + tier + price
//
// Deliberately gated by `domain_owner` (the REPORT's own permission), NOT `dbsearch`,
// so every report viewer sees the call-out — the full field dump stays on the DB Screen
// (dbsearch). Read-only, fail-open (a corpus that errors just returns null).
//
//   GET /api/db-owner?domain=<d>
//
// Returns { domain, found, owner, corpus, source, price, ownedByUs, master, universe }.

import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getNamingDb, isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../lib/db/masterlist.js';
import { normalizeDomain } from '../lib/util.js';

const MASTER_TABLE = 'Master Domain List';
const UNIVERSE_TABLE = 'name_universe';

// Our owned-inventory feeds in name_universe (source_tier=1) → the owner to attribute.
// Mirrors lib/sources/universe_ownership.js (brokered marketplace feeds are NOT owned).
const OWNER_BY_SOURCE = {
  snagged_snap_sheet: 'Snagged',
  berserk_snap_sheet: 'Snagged',
  rob_purchases_sheet: 'Rob Schutz',
};
const OWNED_BY_US = new Set(['Snagged', 'Rob Schutz']);

const clean = (v) => (v == null ? '' : String(v).trim());
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed — use GET' }); return; }
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module." });
    return;
  }

  const domain = normalizeDomain((req.query.domain || '').toString());
  if (!domain) { res.status(400).json({ error: 'Enter a domain to look up.' }); return; }

  let master = null;
  let universe = null;

  // Master — exact (case-insensitive) domain match; keep only the owner-y fields.
  if (isMasterlistDbConfigured()) {
    try {
      const { data } = await getMasterlistDb()
        .from(MASTER_TABLE)
        .select('domain, owner, source, price')
        .ilike('domain', domain)
        .limit(1);
      const row = data && data[0];
      if (row) master = { owner: clean(row.owner) || null, source: clean(row.source) || null, price: num(row.price) };
    } catch { /* fail-open */ }
  }

  // name_universe — exact lowercase match (the `domain` b-tree index; .ilike would
  // seq-scan millions of rows). Derive the owner from an owned-inventory source.
  if (isNamingDbConfigured()) {
    try {
      const { data } = await getNamingDb()
        .from(UNIVERSE_TABLE)
        .select('domain, sources, source_tier, best_price, best_price_source')
        .eq('domain', domain)
        .limit(1);
      const row = data && data[0];
      if (row) {
        const sources = Array.isArray(row.sources) ? row.sources : [];
        let owner = null; let matched = null;
        for (const s of sources) { if (OWNER_BY_SOURCE[s]) { owner = OWNER_BY_SOURCE[s]; matched = s; break; } }
        universe = {
          owner,
          source: matched || clean(row.best_price_source) || (sources[0] || null),
          tier: row.source_tier ?? null,
          price: num(row.best_price),
        };
      }
    } catch { /* fail-open */ }
  }

  // Headline owner: prefer a named Master owner (a real curated attribution like
  // "Amanda Waltz"), else an owned-feed universe owner (Snagged / Rob Schutz).
  let owner = null; let corpus = null; let source = null; let price = null;
  if (master && master.owner) { owner = master.owner; corpus = 'master'; source = master.source; price = master.price; }
  else if (universe && universe.owner) { owner = universe.owner; corpus = 'universe'; source = universe.source; price = universe.price; }

  const ownedByUs = Boolean((owner && OWNED_BY_US.has(owner)) || (universe && universe.tier === 1));

  res.status(200).json({
    domain,
    found: Boolean(master || universe),
    owner,        // the headline attribution (null when neither corpus names an owner)
    corpus,       // 'master' | 'universe' | null
    source,       // where the attribution came from
    price,        // our recorded price, when any
    ownedByUs,    // strong: an owned feed / Snagged / Rob
    master,       // { owner, source, price } | null
    universe,     // { owner, source, tier, price } | null
  });
}
