// Expiring .ai digest — the daily-ish email to the team. Runs ~6×/day and emails
// ONLY the good one-word .ai names that have NEWLY entered the redemption window
// since the last send (tracked via emailed_at), so it's a stream of updates as
// they cross in — never the same names twice. Recipients default to rob@ + sam@
// (env EXPIRING_AI_EMAILS, comma-separated). CRON_SECRET-gated.
//
//   ?dry=1  → build + return the list without sending / stamping.
import { unemailedRedemption, markEmailed } from '../../lib/db/expiringAi.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';
import { phaseLabel } from '../../lib/expiring/redemption.js';

export const config = { maxDuration: 30 };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function recipients() {
  return (process.env.EXPIRING_AI_EMAILS || 'rob@snagged.com,sam@snagged.com')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function rowHtml(r) {
  const phase = phaseLabel({ ok: true, available: r.available, statuses: r.last_status || [] });
  const exp = r.expiration ? String(r.expiration).slice(0, 10) : '—';
  return `<tr>
    <td style="padding:6px 12px;font-weight:700"><a href="https://research.snagged.com/research/appraisal/${encodeURIComponent(r.domain)}" style="color:#1f6b52;text-decoration:none">${esc(r.domain)}</a></td>
    <td style="padding:6px 12px;color:#b45309;font-weight:600">${esc(phase)}</td>
    <td style="padding:6px 12px;color:#4a5b66">expires ${esc(exp)}</td>
  </tr>`;
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const dry = (req.query && (req.query.dry === '1' || req.query.dry === 'true'));

  let rows = [];
  try { rows = await unemailedRedemption({ limit: 200 }); }
  catch (e) { res.status(200).json({ ok: false, error: String((e && e.message) || e) }); return; }

  if (!rows.length) { res.status(200).json({ ok: true, sent: 0, count: 0 }); return; }
  if (dry) { res.status(200).json({ ok: true, dry: true, count: rows.length, domains: rows.map((r) => r.domain) }); return; }

  const to = recipients();
  const subject = rows.length === 1
    ? `🎯 ${rows[0].domain} entered the .ai redemption window`
    : `🎯 ${rows.length} good .ai names entered the redemption window`;
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#26343d">
      <p style="font-size:15px;font-weight:700;margin:0 0 4px">${esc(subject)}</p>
      <p style="color:#4a5b66;margin:0 0 12px">These one-word dictionary <strong>.ai</strong> names just entered the redemption period — the owner let them lapse, so they're heading toward a drop and are cheap to grab (a restore is deliberately expensive).</p>
      <table style="border-collapse:collapse;font-size:14px">${rows.map(rowHtml).join('')}</table>
      <p style="margin:14px 0 0"><a href="https://research.snagged.com/research/expiring" style="display:inline-block;padding:9px 15px;background:#1f6b52;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">See the full list</a></p>
    </div>`;

  let sent = 0;
  if (isEmailConfigured() && to.length) {
    try { const ok = await sendEmail({ to, subject, html }); if (ok) sent = to.length; } catch { /* non-fatal */ }
  }
  // Mark them emailed even if email isn't configured, so a later-configured send
  // doesn't blast the whole backlog at once. (Re-send by nulling emailed_at.)
  try { await markEmailed(rows.map((r) => r.domain)); } catch { /* non-fatal */ }

  res.status(200).json({ ok: true, sent, count: rows.length, to, domains: rows.slice(0, 25).map((r) => r.domain) });
}
