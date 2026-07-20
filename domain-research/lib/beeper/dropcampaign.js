// Drop Campaign — the layer ABOVE Beeper's RDAP watch. For a target drop, Beeper already
// nails the registry timeline (and its adaptive cadence polls every minute in
// pendingDelete). This adds the two signals RDAP can't give — and none of them read the
// domain's homepage; they hit registrar/marketplace APIs, which is where the truth lives:
//   1) REGISTERABLE-now — Porkbun checkDomain (authoritative "can I buy it this second")
//      → optional AUTO-REGISTER via NameSilo (register.js) the instant it opens.
//   2) LISTED-for-sale — DomainScout (a catcher grabbed it and put it on a marketplace)
//      → alert so we can buy it outright.
// Runs only when the drop is IMMINENT (in the delete lifecycle / already flagged), so the
// paid/rate-limited checks stay proportional to imminence. Fail-open throughout.

import { porkbunCheck } from '../variations/availability.js';
import { lookupDomain as domainScoutLookup, isConfigured as domainScoutConfigured } from '../domainscout.js';
import { attemptRegister, registerConfigured } from './register.js';

// Never auto-buy a PREMIUM name above this (a re-released .app can come back premium at
// $10k+). Tunable; a normal-priced drop is well under it.
const MAX_AUTO_PRICE = Number(process.env.BEEPER_AUTO_REGISTER_MAX || 500);

// Should the campaign layer even run this tick? Only when the drop is close — i.e. the
// name is in the delete lifecycle, RDAP already flagged it, or a prior tick saw it open.
export function campaignDue(watch, statuses) {
  if (!watch || !watch.drop_campaign) return false;
  const st = (watch.status || '').toLowerCase();
  if (['pending_drop', 'dropped', 'held_registered'].includes(st)) return true;
  const s = Array.isArray(statuses) ? statuses.join(' ').toLowerCase() : '';
  return /pending\s*delete|redemption|pending\s*restore/.test(s);
}

// Run the campaign checks + (optional) auto-register. Returns the new campaign state
// (persist as `campaign` jsonb) plus `alerts[]` = only the NEWLY-fired events to notify.
export async function runCampaign(watch, env = process.env) {
  const domain = watch.domain;
  const prev = watch.campaign && typeof watch.campaign === 'object' ? watch.campaign : {};
  const out = { checked_at: new Date().toISOString(), available: false, alerts: [] };

  // 1) Registerable? — Porkbun is authoritative on "can I register this right now".
  let avail = null;
  try { avail = await porkbunCheck(domain, env); } catch { /* fail-open */ }
  if (avail && avail.available) {
    out.available = true;
    out.price = avail.price || null;
    out.premium = Boolean(avail.premium);
    if (!prev.available) {
      out.alerts.push({ kind: 'registerable', detail: `REGISTERABLE now${avail.price ? ` (~$${avail.price})` : ''}${avail.premium ? ' — PREMIUM' : ''}` });
    }

    // 2) Auto-register — guardrailed: flag on · not already done · price under cap.
    out.registered = Boolean(prev.registered);
    if (watch.auto_register && !prev.registered) {
      const price = Number(avail.price) || 0;
      if (avail.premium && price > MAX_AUTO_PRICE) {
        out.register = { ok: false, skipped: 'premium_over_cap', price };
        out.alerts.push({ kind: 'register_skipped', detail: `Available but PREMIUM ~$${price} > cap $${MAX_AUTO_PRICE} — NOT auto-bought. Register manually if you want it.` });
      } else if (!registerConfigured(env)) {
        out.alerts.push({ kind: 'register_manual', detail: 'REGISTERABLE now — auto-register not armed (set NAMESILO_API_KEY + fund the account). Register it manually IMMEDIATELY.' });
      } else {
        const r = await attemptRegister(domain, env);
        out.register = r;
        out.registered = r.ok;
        out.alerts.push(r.ok
          ? { kind: 'registered', detail: `🎉 AUTO-REGISTERED ${domain} via ${r.registrar}!` }
          : { kind: 'register_failed', detail: `Auto-register FAILED (${r.detail}) — register manually NOW.` });
      }
    }
  }

  // 3) Listed for sale — a catcher grabbed it and put it on a marketplace → buy it.
  try {
    if (domainScoutConfigured(env)) {
      const ds = await domainScoutLookup(domain, env, { track: false });
      const listed = (ds && Array.isArray(ds.marketplaces) ? ds.marketplaces : []).filter((m) => m.listed);
      if (listed.length) {
        out.listed = listed.map((m) => ({ market: m.name, price: m.price ?? null, currency: m.currency ?? null, link: m.link ?? null }));
        const prevMarkets = new Set((prev.listed || []).map((m) => m.market));
        const fresh = out.listed.filter((m) => !prevMarkets.has(m.market));
        if (fresh.length) out.alerts.push({ kind: 'for_sale', detail: `Listed for sale: ${fresh.map((m) => `${m.market}${m.price ? ` ${m.currency || '$'}${m.price}` : ''}`).join(', ')}` });
      }
    }
  } catch { /* fail-open */ }

  return out;
}

export default { campaignDue, runCampaign };
