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
  const base = (process.env.APP_URL || 'https://research.snagged.com').replace(/\/+$/, '');
  return `${base}/#/r/${buildSlug({ domain, runId, createdAt })}`;
}
