// Expiring .ai — daily Namecheap Market cross-reference. Fetches the public auction CSV,
// keeps the .ai rows, and (1) refreshes price/end/url + seeds new .ai auctions as priority-2
// candidates, (2) stamps namecheap_listed_at first-seen. Separate from the 5-min scan cron
// because the ~180MB fetch would blow that tick's budget. CRON_SECRET-gated.
//
//   GET /api/cron/expiring-namecheap            → sync
//   GET /api/cron/expiring-namecheap?dry=1      → fetch + count only, no writes
import { fetchNamecheapAiAuctions } from '../../lib/expiring/namecheap.js';
import { syncNamecheap } from '../../lib/db/expiringAi.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const entries = await fetchNamecheapAiAuctions();
    if (req.query.dry != null) {
      res.status(200).json({ ok: true, dry: true, ai_auctions: entries.length, sample: entries.slice(0, 10) });
      return;
    }
    const result = entries.length ? await syncNamecheap(entries) : { upserted: 0, newlyListed: 0 };
    res.status(200).json({ ok: true, ai_auctions: entries.length, ...result });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
