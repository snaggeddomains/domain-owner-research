// Client for snagged-admin's internal Pipedrive endpoint (/api/internal/pipedrive-deal).
// The "Add to Pipedrive" button on the research surfaces (owner lookup / appraisal /
// whois) turns a domain into a buy-side deal. Pipedrive is the system of record and its
// API token lives ONLY in the admin app, so we call it server-to-server with a shared
// secret — same pattern as lib/email/threads.js.
//
// Env: ADMIN_INTERNAL_BASE (e.g. https://app.snagged.com) + RESEARCH_INTERNAL_SECRET.
// Both unset => the feature degrades gracefully (the button hides on a 503).

const BASE = (process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com').replace(/\/+$/, '');
const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

export function pipedriveConfigured() {
  return Boolean(SECRET);
}

// GET the drawer metadata: assignable owners + the Source/Channel labels. Optionally
// pass a `domain` to also learn whether a deal already EXISTS for it (so the surface can
// show "View deal" instead of "Add to Deal") — returns `deal:{id,url,stage,status}|null`.
export async function pipedriveMeta(domain) {
  if (!SECRET) return { assignees: [], sources: [], deal: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    const res = await fetch(`${BASE}/api/internal/pipedrive-deal${qs}`, {
      headers: { 'x-internal-secret': SECRET },
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `pipedrive meta ${res.status}`);
    return { assignees: data.assignees || [], sources: data.sources || [], deal: data.deal || null };
  } finally {
    clearTimeout(timer);
  }
}

// POST → create/open the buy-side deal. `input` matches the admin BuyDealInput shape
// (domain + source required). Returns { ok, dealId, created, url, notified }.
export async function createBuyDeal(input) {
  if (!SECRET) throw new Error('Pipedrive not configured (RESEARCH_INTERNAL_SECRET unset).');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(`${BASE}/api/internal/pipedrive-deal`, {
      method: 'POST',
      headers: { 'x-internal-secret': SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `pipedrive create ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
