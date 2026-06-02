// Filter option lists for the Domain Name Search dropdowns.
//   • category   — the controlled enrichment taxonomy (static, mirrors the
//                  pipeline's CATEGORIES in tools/enrich.py)
//   • connotation — the fixed 5-point scale (static)
//   • industries / emotions — free-form enrichment tags, so we read the distinct
//                  values actually present via the facet_industries / facet_emotions
//                  RPCs. If those RPCs aren't installed yet we just return [] for
//                  them (the dropdowns render empty rather than erroring).
// Gated by the same `dbsearch` permission as the search itself. Read-only.

import { currentUser, userCan } from '../lib/auth.js';
import { getNamingDb, isNamingDbConfigured } from '../lib/db/supabase-naming.js';

const CATEGORIES = [
  'Technology & Software', 'Internet & Web', 'AI & Data', 'Finance & Fintech',
  'Crypto & Web3', 'E-Commerce & Retail', 'Business & Professional',
  'Marketing & Advertising', 'Media & Publishing', 'Entertainment & Gaming',
  'Social & Community', 'Education & Learning', 'Health & Wellness',
  'Medical & Biotech', 'Food & Drink', 'Travel & Hospitality',
  'Real Estate & Property', 'Home & Living', 'Fashion & Beauty',
  'Sports & Fitness', 'Automotive & Transport', 'Energy & Environment',
  'Legal & Government', 'Nonprofit & Causes', 'Family & Parenting',
  'Arts & Design', 'Science & Research', 'Pets & Animals',
  'Dating & Relationships', 'Lifestyle', 'General & Other',
];

const CONNOTATIONS = ['positive', 'somewhat positive', 'neutral', 'somewhat negative', 'negative'];

async function rpcValues(rpc) {
  if (!isNamingDbConfigured()) return [];
  try {
    const { data, error } = await getNamingDb().rpc(rpc, { lim: 500 });
    if (error || !Array.isArray(data)) return [];
    return data.map((r) => r.value).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, max-age=300'); // options change slowly
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!userCan(user, 'dbsearch')) {
    res.status(403).json({ error: 'You don’t have access to Domain Name Search.' });
    return;
  }
  const [industries, emotions] = await Promise.all([
    rpcValues('facet_industries'),
    rpcValues('facet_emotions'),
  ]);
  res.status(200).json({ categories: CATEGORIES, connotations: CONNOTATIONS, industries, emotions });
}
