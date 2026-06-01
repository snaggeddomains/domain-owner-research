// Domain DB Search — look a domain up in our two internal stores and return
// everything we have on it:
//   • Master Domain List  (curated/owned domains; MASTERLIST_SUPABASE_*)
//   • name_universe       (the broad market universe; SUPABASE_NAMING_*)
// Gated by the `dbsearch` module permission (admins always pass). Read-only.

import { currentUser, userCan } from '../lib/auth.js';
import { getNamingDb, isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../lib/db/masterlist.js';
import { normalizeDomain } from '../lib/util.js';

const UNIVERSE_TABLE = 'name_universe';
const MASTER_TABLE = 'Master Domain List';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed — use GET' });
    return;
  }

  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!userCan(user, 'dbsearch')) {
    res.status(403).json({ error: 'You don’t have access to Domain DB Search.' });
    return;
  }

  const raw = (req.query.domain || '').toString();
  const domain = normalizeDomain(raw);
  if (!domain) {
    res.status(400).json({ error: 'Enter a domain to look up.' });
    return;
  }

  const out = { domain, master: null, universe: null, errors: {} };

  // Master Domain List — exact (case-insensitive) domain match, all columns.
  if (isMasterlistDbConfigured()) {
    try {
      const { data, error } = await getMasterlistDb()
        .from(MASTER_TABLE)
        .select('*')
        .ilike('domain', domain)
        .limit(1);
      if (error) out.errors.master = error.message;
      else out.master = (data && data[0]) || null;
    } catch (e) {
      out.errors.master = e.message || String(e);
    }
  } else {
    out.errors.master = 'Master Domain List not configured';
  }

  // name_universe — exact (case-insensitive) domain match, all columns.
  if (isNamingDbConfigured()) {
    try {
      const { data, error } = await getNamingDb()
        .from(UNIVERSE_TABLE)
        .select('*')
        .ilike('domain', domain)
        .limit(1);
      if (error) out.errors.universe = error.message;
      else out.universe = (data && data[0]) || null;
    } catch (e) {
      out.errors.universe = e.message || String(e);
    }
  } else {
    out.errors.universe = 'Naming universe not configured';
  }

  out.found = Boolean(out.master || out.universe);
  res.status(200).json(out);
}
