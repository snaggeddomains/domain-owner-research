// "Have we worked with this owner before?" — cross-app read of the admin Deals owner
// directory for the Domain Owner report's known-owner banner. Calls admin's internal
// endpoint server-to-server (x-internal-secret == RESEARCH_INTERNAL_SECRET). Fail-open:
// unset / any error → [] (the report just shows no banner). Mirrors lib/pipedrive.js.

const BASE = (process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com').replace(/\/+$/, '');
const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

export function ownerKnownConfigured() {
  return Boolean(SECRET);
}

// Returns OwnerMatch[] (id, name, company, domains[], contacts[], deal_count,
// negotiation_notes, url, matched_by) or [] on anything unexpected.
export async function knownOwners({ domain, email, name } = {}) {
  if (!SECRET) return [];
  const qs = new URLSearchParams();
  if (domain) qs.set('domain', domain);
  if (email) qs.set('email', email);
  if (name) qs.set('name', name);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${BASE}/api/internal/owner-match?${qs.toString()}`, {
      headers: { 'x-internal-secret': SECRET },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.owners) ? data.owners : [];
  } catch {
    return [];
  }
}
