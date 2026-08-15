// Net Worth — standalone FREE estimate tool. Same inputs as the person deep-dive
// (a social/LinkedIn URL or an email), but spends NO paid credits (free identify +
// free web-sourced company financials). Runs inline (fast) — no Inngest, no DB.
//
//   POST {url|email, name?} → { ok, subject, band, low, mid, high, components, ... }
//
// Gated by the existing `research.person` permission (a dedicated `research.networth`
// perm is a possible follow-up; admins auto-pass either way).
import { isAuthed, requirePermission } from '../lib/auth.js';
import { runNetWorth } from '../lib/person/networth.js';
import { withCategory } from '../lib/db/usage.js';

export const config = { maxDuration: 60 };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function cleanEmail(raw) { const e = String(raw || '').trim().toLowerCase(); return EMAIL_RE.test(e) ? e : null; }
function cleanUrl(raw) {
  let u = String(raw || '').trim();
  if (!u || EMAIL_RE.test(u)) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try { const p = new URL(u); if (!/\./.test(p.host)) return null; return p.toString(); } catch { return null; }
}

export default async function handler(req, res) {
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requirePermission(req, res, 'research.person');
  if (!user) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const email = cleanEmail(body.email) || cleanEmail(body.url);
    const url = email ? null : cleanUrl(body.url);
    if (!email && !url) { res.status(400).json({ error: 'Provide a profile URL (LinkedIn, X/Twitter, …) or an email address.' }); return; }
    const out = await withCategory('networth', () => runNetWorth({ url, email, name: String(body.name || '').trim() || null, env: process.env }));
    res.status(out && out.ok ? 200 : 422).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
