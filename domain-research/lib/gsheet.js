// Cross-app client for snagged-admin's internal Google Sheet builder
// (/api/internal/naming-sheet). This app holds NO Google credentials — admin owns
// the service account + Shared Drive, so we call it server-to-server with a shared
// secret (same pattern as lib/email/threads.js). Env: ADMIN_INTERNAL_BASE (default
// https://app.snagged.com) + RESEARCH_INTERNAL_SECRET. Unset => export not configured.

const BASE = (process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com').replace(/\/+$/, '');
const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

export function gsheetExportConfigured() {
  return Boolean(SECRET);
}

// Build a Google Sheet from row data (values[0] = header) and return { url, warning? }.
// shareWith = an email to grant writer access (the requesting user).
export async function createSheet({ title, values, shareWith }) {
  if (!SECRET) throw new Error('Sheet export not configured (RESEARCH_INTERNAL_SECRET unset).');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(`${BASE}/api/internal/naming-sheet`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': SECRET },
      body: JSON.stringify({ title, values, shareWith }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `sheet endpoint ${res.status}`);
    return data; // { ok, url, warning? }
  } finally {
    clearTimeout(timer);
  }
}

export default { createSheet, gsheetExportConfigured };
