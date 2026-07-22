// Client for snagged-admin's internal Gmail endpoint (/api/internal/email-threads).
// Lets the Domain Owner chat ingest relevant email threads instead of the user
// copy-pasting them. We don't put Google credentials in this app — the admin app
// already has the service-account + delegation, so we call it server-to-server
// with a shared secret.
//
// Env: ADMIN_INTERNAL_BASE (e.g. https://app.snagged.com) + RESEARCH_INTERNAL_SECRET.
// Both unset => the feature degrades gracefully (search returns [], attach errors clearly).

const BASE = (process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com').replace(/\/+$/, '');
const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

export function emailIngestConfigured() {
  return Boolean(SECRET);
}

async function call(params) {
  if (!SECRET) throw new Error('Email ingest not configured (RESEARCH_INTERNAL_SECRET unset).');
  const url = `${BASE}/api/internal/email-threads?${new URLSearchParams(params).toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(url, { headers: { 'x-internal-secret': SECRET }, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `email endpoint ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Auto-suggest / manual search. `query` defaults to the domain; Gmail query syntax ok.
export async function searchEmailThreads(query) {
  if (!SECRET) return [];
  const data = await call({ q: String(query || '').trim() });
  return Array.isArray(data.threads) ? data.threads : [];
}

// Full thread text for attaching.
export async function fetchEmailThread(mailbox, threadId) {
  const data = await call({ action: 'thread', mailbox, thread_id: threadId });
  return data.thread || null;
}

// Broad search with an explicit Gmail query + result cap (for mining, not the
// domain-scoped chat suggest). Returns thread stubs; [] when not configured.
export async function searchEmailThreadsRaw(query, max = 40) {
  if (!SECRET) return [];
  const data = await call({ q: String(query || '').trim(), max: String(max) });
  return Array.isArray(data.threads) ? data.threads : [];
}
