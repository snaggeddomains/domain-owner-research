import { getDb, isDbConfigured } from './supabase.js';

// Read Snagged's own deal history for a domain — the real offers / stated budgets
// / sale outcome we've already seen on it. This is the STRONGEST comp we have:
// actual money real buyers put on this exact name.
//
// The data is the cached `marketplace_deal_reports` table that snagged-admin's
// Reports → Marketplace → [domain] deal report writes (jsonb `report`, keyed by
// `domain`). Crucially that table lives in the SAME Supabase project as this app's
// main DB (the admin app's SUPABASE_URL == our SUPABASE_URL), so we read it
// directly with getDb() — no cross-app HTTP, no Gmail/HubSpot/LLM cost. It's a
// pure cached read: the report only exists if someone generated it in the admin
// app, so this is best-effort and fail-open (no history → null).
//
// The `report.offers` rows are OfferRow: { party, email, amount, amountNum, kind:
// 'offer'|'budget', date, origin, channel, outcome }. We surface those plus the
// sale outcome + how long we've represented the name.
const TABLE = 'marketplace_deal_reports';

const tableMissing = (e) =>
  /relation .* does not exist|could not find the table|does not exist|schema cache|PGRST205|42P01/i.test(
    String(e?.message || e?.code || e),
  );

export async function getDealComps(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^www\./, '');
  if (!d || !isDbConfigured()) return null;
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('report,generated_at')
      .eq('domain', d)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.report) return null;
    const r = data.report || {};
    const offers = (Array.isArray(r.offers) ? r.offers : [])
      .map((o) => ({
        amount: o.amount || null,
        amountNum: Number(o.amountNum) || 0,
        kind: o.kind === 'budget' ? 'budget' : 'offer',
        date: o.date || null,
        channel: o.channel || null,
        origin: o.origin || null,
        outcome: o.outcome || null,
      }))
      .filter((o) => o.amountNum > 0)
      .sort((a, b) => b.amountNum - a.amountNum);
    // Nothing actionable if there are no offers AND no sale/representation context.
    if (!offers.length && !r.sale && !r.representingSince && !(r.inbound > 0)) return null;
    return {
      domain: d,
      generated_at: data.generated_at || null,
      offers,
      sale: r.sale || null,                       // { stage, label, opened, closed, txn }
      representing_since: r.representingSince || null,
      inbound: Number(r.inbound) || 0,
      inbound_qualified: Number(r.inboundQualified) || 0,
      active_negotiations: Number(r.activeNegotiations) || 0,
    };
  } catch (e) {
    if (!tableMissing(e)) console.error('getDealComps:', e?.message || e);
    return null;
  }
}

export default { getDealComps };
