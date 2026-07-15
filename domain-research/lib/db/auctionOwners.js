import { getDb } from './supabase.js';

// Auction-handle → owner registry. Maps a marketplace bidder/auction HANDLE
// (e.g. Namecheap "keepquiet") to the owner we've identified behind it + the
// domains we've tied to that handle. When a new domain's auction shows the same
// handle, the report surfaces the known owner instantly. One row per
// (marketplace, handle). Best-effort throughout: a missing table (pre-migration)
// degrades to empty rather than throwing.
const TBL = 'domain_research_auction_owners';

const norm = (s) => String(s || '').trim();
const normHandle = (s) => norm(s).toLowerCase();
const normMarket = (s) => normHandle(s) || 'namecheap';
const normDomain = (s) => norm(s).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

// Records whose domains[] contains this exact domain → known owners for it.
export async function ownersForDomain(domain) {
  const d = normDomain(domain);
  if (!d) return [];
  try {
    const { data, error } = await getDb().from(TBL).select('*').contains('domains', [d]).limit(20);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

// Single (marketplace, handle) lookup.
export async function getAuctionOwner(marketplace, handle) {
  const m = normMarket(marketplace); const h = normHandle(handle);
  if (!h) return null;
  try {
    const { data, error } = await getDb().from(TBL).select('*').eq('marketplace', m).eq('handle', h).maybeSingle();
    if (error) return null;
    return data || null;
  } catch { return null; }
}

// Browse/search the registry.
export async function listAuctionOwners({ q = '', limit = 200 } = {}) {
  try {
    let query = getDb().from(TBL).select('*').order('updated_at', { ascending: false }).limit(Math.min(limit, 500));
    if (q) { const s = norm(q); query = query.or(`handle.ilike.%${s}%,owner_name.ilike.%${s}%`); }
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  } catch { return []; }
}

// Record/merge a handle → owner mapping. If the (marketplace, handle) row exists,
// merge the new domain into domains[] and update any provided owner fields;
// otherwise insert. Owner fields left blank on an existing row are preserved.
export async function saveAuctionOwner({ marketplace, handle, owner_name, owner_type, confidence, notes, evidence_url, domain, added_by }) {
  const m = normMarket(marketplace); const h = normHandle(handle);
  if (!h) throw new Error('A handle is required.');
  const d = normDomain(domain);
  const existing = await getAuctionOwner(m, h);
  const domains = new Set(existing ? (existing.domains || []) : []);
  if (d) domains.add(d);
  const row = {
    marketplace: m,
    handle: h,
    owner_name: owner_name != null && norm(owner_name) ? norm(owner_name) : (existing ? existing.owner_name : null),
    owner_type: owner_type != null && norm(owner_type) ? norm(owner_type) : (existing ? existing.owner_type : null),
    confidence: norm(confidence) || (existing ? existing.confidence : 'likely'),
    notes: notes != null && norm(notes) ? norm(notes) : (existing ? existing.notes : null),
    evidence_url: evidence_url != null && norm(evidence_url) ? norm(evidence_url) : (existing ? existing.evidence_url : null),
    domains: [...domains],
    added_by: added_by || (existing ? existing.added_by : null),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getDb().from(TBL).upsert(row, { onConflict: 'marketplace,handle' }).select('*').single();
  if (error) throw new Error(`saveAuctionOwner: ${error.message}`);
  return data;
}

export async function deleteAuctionOwner(id) {
  if (!id) return false;
  try { await getDb().from(TBL).delete().eq('id', id); return true; } catch { return false; }
}

export default { ownersForDomain, getAuctionOwner, listAuctionOwners, saveAuctionOwner, deleteAuctionOwner };
