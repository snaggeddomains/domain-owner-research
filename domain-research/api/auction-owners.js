import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { ownersForDomain, listAuctionOwners, saveAuctionOwner, deleteAuctionOwner } from '../lib/db/auctionOwners.js';

// Auction-handle → owner registry. Maps a marketplace bidder/auction HANDLE
// (e.g. Namecheap "keepquiet") to the owner behind it + the domains tied to it,
// so a new domain won by a known handle surfaces the owner instantly. Gated by
// the Domain Owner module (report viewers).
//   GET  ?domain=<d>            -> { owners:[records tied to this domain] }
//   GET  ?list=1&q=<query>      -> { owners:[registry rows] }
//   POST { action:'save', marketplace, handle, owner_name?, owner_type?,
//          confidence?, notes?, evidence_url?, domain? } -> { owner }
//   POST { action:'delete', id } -> { ok:true }
export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module" });
    return;
  }
  try {
    if (req.method === 'GET') {
      if (req.query.list != null) {
        const owners = await listAuctionOwners({ q: String(req.query.q || '').trim() });
        res.status(200).json({ owners });
        return;
      }
      const domain = String(req.query.domain || '').trim();
      if (!domain) { res.status(400).json({ error: 'Provide ?domain= or ?list=1' }); return; }
      res.status(200).json({ owners: await ownersForDomain(domain) });
      return;
    }
    if (req.method === 'POST') {
      const b = (req.body && typeof req.body === 'object') ? req.body : {};
      const action = String(b.action || 'save');
      if (action === 'delete') {
        await deleteAuctionOwner(String(b.id || ''));
        res.status(200).json({ ok: true });
        return;
      }
      if (!String(b.handle || '').trim()) { res.status(400).json({ error: 'A handle is required.' }); return; }
      const owner = await saveAuctionOwner({
        marketplace: b.marketplace,
        handle: b.handle,
        owner_name: b.owner_name,
        owner_type: b.owner_type,
        confidence: b.confidence,
        notes: b.notes,
        evidence_url: b.evidence_url,
        domain: b.domain,
        added_by: (user && (user.email || user.name)) || null,
      });
      res.status(200).json({ owner });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
