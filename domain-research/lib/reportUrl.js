// Mirrors public/app.js#buildSlug so emails and server-side notifications point
// at the same readable deep-link the frontend uses for a report:
//   <base>/#/r/<sld>-<tld>-<DD>-<MM>-<YYYY>-<runId>
// The frontend's runIdFromHash regex picks the UUID out of the hash either way,
// so the slug is purely for readability — but it makes for nicer email content.

function buildSlug({ domain, runId, createdAt }) {
  const d = String(domain || '').toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const parts = d.split('.').filter(Boolean);
  const tld = parts.length > 1 ? parts.pop() : '';
  const sld = (parts.join('-') || d).replace(/[^a-z0-9-]/g, '');
  const t = createdAt ? new Date(createdAt) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${pad(t.getUTCDate())}-${pad(t.getUTCMonth() + 1)}-${t.getUTCFullYear()}`;
  return `${[sld, tld, date].filter(Boolean).join('-')}-${runId}`;
}

export function reportUrl({ domain, runId, createdAt }) {
  // The app is nested at app.snagged.com/research/* — emailed deep-links
  // must include the /research path prefix, since the root path on
  // research.snagged.com now 301-redirects via vercel.json.
  const base = (process.env.APP_URL || 'https://app.snagged.com/research').replace(/\/+$/, '');
  return `${base}/#/r/${buildSlug({ domain, runId, createdAt })}`;
}

// Just the in-app hash fragment ("#/r/<slug>") for in-app notification links —
// the frontend prepends the /research path and routes without a full reload.
export function reportHash({ domain, runId, createdAt }) {
  return `#/r/${buildSlug({ domain, runId, createdAt })}`;
}

// Absolute deep-link to a Sales Research project (path-routed, not a hash). Works
// from both chromes — the research bell's openNotifLink pushState+route()s it.
export function salesUrl(projectId) {
  const base = (process.env.APP_URL || 'https://app.snagged.com/research').replace(/\/+$/, '');
  return `${base}/sales/${projectId}`;
}
