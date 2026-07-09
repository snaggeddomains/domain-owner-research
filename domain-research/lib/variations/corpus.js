// Cross-reference the enumerated variation set against OUR internal corpora —
// name_universe (automated + marketplace feeds we track) and the Master Domain
// List (curated owner attributions). One batched exact-domain lookup per corpus,
// fail-open (a missing/broken client just yields no internal signal). Lets the
// variations table flag names we already own, already track, or have owner intel
// on — instead of treating every candidate as a cold external lookup.
import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../db/masterlist.js';

const UNIVERSE = 'name_universe';
const MASTER = 'Master Domain List';
const CHUNK = 300; // keep each IN(...) under the URL-length cap

// Owned-inventory feeds → the owner to attribute (mirrors lib/sources/
// universe_ownership.js). A domain carrying one of these sources is OURS.
const OWNED_SOURCE = {
  snagged_snap_sheet: 'Snagged',
  berserk_snap_sheet: 'Snagged',
  rob_purchases_sheet: 'Rob Schutz',
};
function ownerFromSources(sources) {
  for (const s of sources || []) if (OWNED_SOURCE[s]) return OWNED_SOURCE[s];
  return null;
}

function chunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }

// domains[] → Map<domain, { universe?, master? }>. Best-effort; never throws.
export async function lookupInternal(domains) {
  const out = new Map();
  const list = [...new Set((domains || []).map((d) => String(d || '').toLowerCase()).filter(Boolean))];
  if (!list.length) return out;

  // name_universe — best_price / best_price_source / sources[] (owned-feed → owner).
  if (isNamingDbConfigured()) {
    try {
      const db = getNamingDb();
      for (const c of chunk(list, CHUNK)) {
        const { data } = await db.from(UNIVERSE).select('domain,best_price,best_price_source,sources').in('domain', c);
        for (const r of data || []) {
          const e = out.get(r.domain) || {};
          e.universe = {
            price: r.best_price != null ? Number(r.best_price) : null,
            source: r.best_price_source || (Array.isArray(r.sources) ? r.sources[0] : null) || null,
            owner: ownerFromSources(r.sources),
          };
          out.set(r.domain, e);
        }
      }
    } catch { /* fail-open */ }
  }

  // Master Domain List — price / owner / source (curated attributions).
  if (isMasterlistDbConfigured()) {
    try {
      const mdb = getMasterlistDb();
      for (const c of chunk(list, CHUNK)) {
        const { data } = await mdb.from(MASTER).select('domain,price,owner,source').in('domain', c);
        for (const r of data || []) {
          const e = out.get(r.domain) || {};
          e.master = {
            price: r.price != null ? Number(r.price) : null,
            owner: r.owner || null,
            source: r.source || null,
          };
          out.set(r.domain, e);
        }
      }
    } catch { /* fail-open */ }
  }
  return out;
}

// Flatten a per-domain internal record into the row-attached shape the UI reads.
export function internalForRow(info) {
  if (!info) return null;
  const u = info.universe || null;
  const m = info.master || null;
  if (!u && !m) return null;
  return {
    in_universe: !!u,
    universe_price: u ? u.price : null,
    universe_source: u ? u.source : null,
    in_master: !!m,
    master_price: m ? m.price : null,
    master_source: m ? m.source : null,
    // A concrete owner if we have one (owned-feed universe row OR a Master attribution).
    owner: (u && u.owner) || (m && m.owner) || null,
  };
}

export default { lookupInternal, internalForRow };
