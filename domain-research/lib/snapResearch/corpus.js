// SNAP Research corpus disqualifier. A candidate that's ALREADY in our corpus — name_universe
// (which is written only from the marketplace/owned feeds: Afternic, Sedo, Atom, Namecheap, the
// owned sheets, …) OR the Master Domain List (curated owner attributions) — is a name we already
// list for sale, track, or own. That's the opposite of a hidden let-go bargain, so it's
// DISQUALIFIED. Fail-open: no corpus signal → nothing disqualified (a DB blip never fabricates a
// candidate; it just doesn't remove one).
import { lookupInternal } from '../variations/corpus.js';

// domains[] → Set<domain> of the ones present in EITHER corpus (lowercased).
export async function corpusListedSet(domains) {
  const set = new Set();
  const list = (domains || []).map((d) => String(d || '').toLowerCase()).filter(Boolean);
  if (!list.length) return set;
  try {
    const map = await lookupInternal(list);
    for (const [d, info] of map) if (info && (info.universe || info.master)) set.add(String(d).toLowerCase());
  } catch { /* fail-open — no corpus signal, disqualify nothing */ }
  return set;
}
