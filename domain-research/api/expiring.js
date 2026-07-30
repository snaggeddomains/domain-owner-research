// Expiring .ai — the SNAP "which good one-word .ai names are about to drop" report.
// Reads the curated watchlist for names currently in the redemption / pending-delete
// window (investor-parked names excluded by default). Gated by the `expiring` module
// (admins auto-pass). Read-only; the cron does the scanning.
//
//   GET /api/expiring                → { configured, stats, rows }
//   GET /api/expiring?parked=1        → include likely-investor (parked-NS) names
//   GET /api/expiring?dismissed=1     → include dismissed names
//   POST { action:'dismiss'|'undismiss', domain }
//   POST { action:'seed', domains:'rica.ai dealt.ai …' }  → add + scan specific names NOW
import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { redemptionList, pendingDeleteList, lifecycleMetrics, stats, setDismissed, isConfigured, insertCandidate, updateCandidate, getCandidate } from '../lib/db/expiringAi.js';
import { phaseLabel, phaseOf } from '../lib/expiring/redemption.js';
import { investorSignal } from '../lib/expiring/investor.js';
import { fullTldDemand } from '../lib/expiring/demand.js';
import { rdapStatus, emailIsPrivate } from '../lib/beeper/rdap.js';
import { fetchNamecheapAiAuctions } from '../lib/expiring/namecheap.js';
import { syncNamecheap } from '../lib/db/expiringAi.js';
import { runTool } from '../lib/sources/index.js';

// On-demand RocketReach enrichment of a PUBLIC registrant contact: reverse-look-up the real
// email (and phone, if present) → ADDITIONAL emails/phones + name/title/employer/LinkedIn.
// Cached in the row's `rr` so a re-view never re-spends a credit. Skips private/empty rows.
async function enrichRegistrant(domain, env) {
  if (!env.ROCKETREACH_API_KEY) return { error: 'RocketReach is not configured on this server.' };
  const row = await getCandidate(domain);
  if (!row) return { error: 'Name not found.' };
  // Re-check the stored email against the privacy detector too (a row scanned before the rules
  // tightened may hold a known-privacy address) so we never spend a credit on privacy@dynadot.com.
  const emailPriv = row.registrant_email ? emailIsPrivate(row.registrant_email) : false;
  if (row.registrant_private || emailPriv || (!row.registrant_email && !row.registrant_phone)) {
    return { error: 'No public registrant contact to enrich.' };
  }
  const email = row.registrant_email || '';
  const phone = row.registrant_phone || '';
  // Look up by email AND by phone (each is a separate reverse lookup) — different hits merge.
  const calls = [];
  if (email) calls.push(runTool('rocketreach_lookup', { email }, env).catch(() => null));
  if (phone) calls.push(runTool('rocketreach_lookup', { phone }, env).catch(() => null));
  // runTool wraps the source result as { ok, data } → unwrap.
  const results = (await Promise.all(calls)).map((w) => (w && w.ok ? w.data : null)).filter(Boolean);
  const emails = new Set(), phones = new Set();
  let prof = {};
  for (const r of results) {
    for (const e of r.emails || []) { const v = String(e).trim().toLowerCase(); if (v) emails.add(v); }
    for (const p of r.phones || []) { const v = String(p).trim(); if (v) phones.add(v); }
    if (r.name && !prof.name) prof = { name: r.name, title: r.current_title || null, employer: r.current_employer || null, linkedin: r.linkedin_url || null, location: r.location || null };
  }
  // Drop the contacts we already had on file (only show what's NEW).
  if (email) emails.delete(email.toLowerCase());
  const norm = (s) => String(s).replace(/[^0-9]/g, '');
  const havePhone = phone ? norm(phone) : '';
  const rr = {
    ...prof,
    emails: [...emails],
    phones: [...phones].filter((p) => !havePhone || norm(p) !== havePhone),
    found: false,
    enriched_at: new Date().toISOString(),
  };
  rr.found = rr.emails.length > 0 || rr.phones.length > 0 || Boolean(rr.name);
  await updateCandidate(domain, { rr });
  return { rr };
}

export const config = { maxDuration: 60 };

// Manually add + immediately RDAP-scan specific .ai names (bypasses the alphabetical
// curation walk + quality gate — a human explicitly wants these watched). Bounded.
async function seedDomains(raw) {
  const list = [...new Set(String(raw || '')
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean)
    .map((d) => (d.includes('.') ? d : `${d}.ai`)))].slice(0, 25);
  const out = [];
  for (const d of list) {
    const sld = d.split('.')[0];
    if (!/^[a-z.]+$/.test(d) || !/^[a-z]+$/.test(sld)) { out.push({ domain: d, error: 'not a clean one-word name' }); continue; }
    await insertCandidate({ domain: d, sld, nameservers: [], parked: false });
    const s = await rdapStatus(d).catch(() => null);
    if (!s || !s.ok) { out.push({ domain: d, phase: 'unknown' }); continue; }
    const phase = s.available ? null : phaseOf(s.statuses);
    const inRed = phase === 'redemption';
    const inPd = phase === 'pending_delete';
    const inWin = inRed || inPd;
    const ns = Array.isArray(s.nameservers) ? s.nameservers : [];
    const nowIso = new Date().toISOString();
    // For a seeded name in a surfaced window, compute the full TLD demand (matches the
    // TLD Count tool) so it shows a real number — a manual add skips the curation gate.
    const full = inWin ? await fullTldDemand(sld, process.env) : null;
    await updateCandidate(d, {
      last_status: s.available ? [] : s.statuses, last_http: s.code, last_checked: nowIso,
      available: Boolean(s.available), in_redemption: inRed, in_pending_delete: inPd, demand_ok: inWin ? true : null,
      nameservers: ns, registrar: s.registrar || null, parked: investorSignal(ns).investor,
      registrant_email: s.registrantEmail || null, registrant_phone: s.registrantPhone || null,
      registrant_name: s.registrantName || null,
      registrant_private: s.registrantPrivate == null ? null : Boolean(s.registrantPrivate),
      ...(s.expiration ? { expiration: s.expiration } : {}),
      ...(inRed ? { redemption_since: nowIso } : {}),
      ...(inPd ? { pending_delete_since: nowIso } : {}),
      ...(full != null ? { tld_count: full } : {}),
    });
    out.push({ domain: d, phase: phaseLabel(s), in_redemption: inRed, in_pending_delete: inPd, available: Boolean(s.available), expiration: s.expiration || null });
  }
  return out;
}

function canUse(user) {
  return userCan(user, 'expiring') || userCan(user, 'admin');
}

// Shape a stored row for the UI (compute a phase label + days-to-expiry).
function shape(r) {
  const s = { ok: true, available: r.available, statuses: r.last_status || [] };
  const exp = r.expiration ? Date.parse(r.expiration) : NaN;
  const days = Number.isNaN(exp) ? null : Math.round((exp - Date.now()) / 86_400_000);
  const ns = Array.isArray(r.nameservers) ? r.nameservers : [];
  const sig = investorSignal(ns);
  return {
    domain: r.domain,
    sld: r.sld,
    tld_count: r.tld_count == null ? null : r.tld_count,
    phase: r.available ? 'dropped' : phaseLabel(s),
    in_redemption: r.in_redemption,
    in_pending_delete: r.in_pending_delete,
    available: r.available,
    statuses: r.last_status || [],
    expiration: r.expiration || null,
    days_to_expiry: days,
    redemption_since: r.redemption_since || null,
    pending_delete_since: r.pending_delete_since || null,
    last_checked: r.last_checked || null,
    registrar: r.registrar || null,
    nameservers: ns.slice(0, 2),      // show the actual first two NS
    investor: sig.investor,           // likely owned by an investor (on a for-sale/marketplace NS)
    marketplace: sig.marketplace,     // which marketplace, when known
    parked: r.parked,
    namecheap_listed_at: r.namecheap_listed_at || null,   // on a Namecheap Market auction
    namecheap_price: r.namecheap_price != null ? r.namecheap_price : null,
    namecheap_url: r.namecheap_url || null,
    // Registrant contact from RDAP: null = not scanned yet; private = masked; else the
    // real public email/phone/name that showed through.
    ...registrantFields(r),
    rr: r.rr || null,   // RocketReach enrichment (on-demand): extra emails/phones + profile
  };
}

// Defensive re-classification at DISPLAY time: a row scanned BEFORE the privacy rules tightened
// may have a known-privacy address (e.g. privacy@dynadot.com) stored as "public". Re-check the
// stored email against the SAME detector the scan uses, so it reads 🔒 Private immediately —
// without waiting for a re-scan (surfaced re-scans are off while the backlog drains).
function registrantFields(r) {
  const email = r.registrant_email || null;
  if (email && emailIsPrivate(email)) {
    return { registrant_private: true, registrant_email: null, registrant_phone: null, registrant_name: null };
  }
  return {
    registrant_private: r.registrant_private == null ? null : Boolean(r.registrant_private),
    registrant_email: email,
    registrant_phone: r.registrant_phone || null,
    registrant_name: r.registrant_name || null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!canUse(user)) { res.status(403).json({ error: "You don't have access to this tool" }); return; }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (b.action === 'seed') {
      try { res.status(200).json({ ok: true, seeded: await seedDomains(b.domains) }); }
      catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
      return;
    }
    // Session-authed manual Namecheap sync (so you never need the CRON_SECRET) — same
    // work the daily cron does: fetch the auction CSV + cross-reference the watchlist.
    if (b.action === 'sync-namecheap') {
      try {
        const entries = await fetchNamecheapAiAuctions();
        const result = entries.length ? await syncNamecheap(entries) : { upserted: 0, newlyListed: 0 };
        res.status(200).json({ ok: true, ai_auctions: entries.length, ...result });
      } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
      return;
    }
    // On-demand RocketReach enrichment of a public registrant contact (uses a lookup credit).
    if (b.action === 'enrich') {
      const domain = String(b.domain || '').toLowerCase().trim();
      if (!domain) { res.status(400).json({ error: 'domain required' }); return; }
      try {
        const out = await enrichRegistrant(domain, process.env);
        if (out.error) { res.status(out.error.includes('not configured') ? 503 : 400).json(out); return; }
        res.status(200).json({ ok: true, ...out });
      } catch (e) { res.status(502).json({ error: String((e && e.message) || e) }); }
      return;
    }
    const domain = String(b.domain || '').toLowerCase().trim();
    if (!domain || (b.action !== 'dismiss' && b.action !== 'undismiss')) {
      res.status(400).json({ error: 'action (dismiss|undismiss|seed) required' });
      return;
    }
    try { await setDismissed(domain, b.action === 'dismiss'); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (!isConfigured()) { res.status(200).json({ configured: false, stats: null, rows: [] }); return; }
  const hideParked = req.query.hideParked === '1';
  const includeDismissed = req.query.dismissed === '1';
  const phase = String(req.query.phase || 'redemption');
  try {
    // Metrics tab: lifecycle DURATION aggregates by registrar (how long names sit in
    // each phase) — separate from the row lists.
    if (req.query.metrics === '1') {
      const [metrics, st] = await Promise.all([lifecycleMetrics(), stats()]);
      res.status(200).json({ configured: true, stats: st, metrics });
      return;
    }
    const list = phase === 'pending' ? pendingDeleteList : redemptionList;
    const [rows, st] = await Promise.all([
      list({ hideParked, includeDismissed }),
      stats(),
    ]);
    res.status(200).json({ configured: true, stats: st, phase: phase === 'pending' ? 'pending' : 'redemption', rows: rows.map(shape) });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
