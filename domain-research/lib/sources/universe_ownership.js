import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { normalizeDomain, isValidDomain } from '../util.js';

// Our owned-inventory feeds in name_universe (source_tier=1) → the owner to
// report. When a domain we research came in from one of these SNAP/owned
// sheets, the report should attribute ownership to us. Brokered inventory
// (snagged_marketplace_sheet) is intentionally NOT here — those are owned by
// third parties and merely represented by Snagged.
const OWNER_BY_SOURCE = {
  snagged_snap_sheet: 'Snagged',
  berserk_snap_sheet: 'Snagged',
  rob_purchases_sheet: 'Rob Schutz',
};

const TABLE = 'name_universe';

export default {
  name: 'universe_ownership',
  description:
    'Check our internal name Universe (name_universe) for the domain. If it came ' +
    'in from one of our OWNED-inventory feeds (Snagged SNAP, Berserk SNAP tracker, ' +
    "Rob's purchases) this returns the owner — a strong internal ownership pointer. " +
    'A miss just means it is not in our owned inventory (not evidence either way).',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: [
    'SUPABASE_NAMING_URL',
    ['SUPABASE_NAMING_SERVICE_KEY', 'SUPABASE_NAMING_SECRET_KEY'],
  ],
  async run({ domain }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    if (!isNamingDbConfigured()) throw new Error('Naming universe not configured');

    const { data, error } = await getNamingDb()
      .from(TABLE)
      .select('domain, sources, source_tier, best_price, best_price_source, category')
      .ilike('domain', d)
      .limit(1);
    if (error) throw new Error(`universe_ownership: ${error.message}`);

    const row = data && data[0];
    if (!row) return { found: false, domain: d };

    const sources = Array.isArray(row.sources) ? row.sources : [];
    let owner = null;
    let matched_source = null;
    for (const s of sources) {
      if (OWNER_BY_SOURCE[s]) {
        owner = OWNER_BY_SOURCE[s];
        matched_source = s;
        break;
      }
    }
    return {
      found: true,
      domain: d,
      owner, // null = in the universe but not from an owned feed
      matched_source,
      source_tier: row.source_tier,
      sources,
      best_price: row.best_price,
      best_price_source: row.best_price_source,
      category: row.category,
    };
  },
};
