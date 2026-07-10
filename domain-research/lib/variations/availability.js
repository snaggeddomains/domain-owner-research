// Authoritative domain availability via Porkbun's checkDomain — the one signal
// RDAP can't give us: it distinguishes truly-registerable from registry-RESERVED /
// PREMIUM names (dart.app reads "available" to RDAP but Porkbun says avail:no). Used
// to confirm/clear the premium-risk heuristic in the variations sweep.
//
// ⚠ checkDomain is RATE-LIMITED to ~1 call / 10s, so callers must bound the number
// of live checks per run and stop on a rate-limit signal. Results are cached per
// domain (kind 'pkd'), so coverage converges across runs (reserved/premium status
// is stable). Fail-open: no keys / error → null (caller keeps the heuristic).
import { getToolLookup, saveToolLookup } from '../db/tools.js';

function keys(env) {
  return {
    apikey: env.PORKBUN_API_KEY || env.PORKBUN_KEY || env.PORKBUN_APIKEY,
    secret: env.PORKBUN_SECRET_KEY || env.PORKBUN_SECRET_API_KEY || env.PORKBUN_SECRET || env.PORKBUN_SECRETAPIKEY,
  };
}
export function porkbunConfigured(env = process.env) { const k = keys(env); return !!(k.apikey && k.secret); }

const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

// → { available, premium, price } (cached), OR { rateLimited:true } / { error:true }
// to tell the caller to stop, OR null (no keys / hard fail → keep the heuristic).
export async function porkbunCheck(domain, env = process.env) {
  const d = String(domain || '').toLowerCase().trim();
  const { apikey, secret } = keys(env);
  if (!apikey || !secret || !d) return null;
  try { const row = await getToolLookup('pkd', d); if (row && row.data && row.data._v === 1) return row.data; } catch { /* miss */ }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let raw = null;
    try {
      const res = await fetch(`https://api.porkbun.com/api/json/v3/domain/checkDomain/${encodeURIComponent(d)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apikey, secretapikey: secret }), signal: ctrl.signal,
      });
      raw = await res.json().catch(() => null);
    } finally { clearTimeout(timer); }
    if (!raw) return { error: true };
    if (raw.status && String(raw.status).toUpperCase() !== 'SUCCESS') {
      return { error: true, rateLimited: /rate|limit|throttl|too many|second/i.test(JSON.stringify(raw.message || raw)) };
    }
    const resp = raw.response || {};
    const out = {
      _v: 1,
      available: String(resp.avail || '').toLowerCase() === 'yes',
      premium: String(resp.premium || '').toLowerCase() === 'yes',
      price: num(resp.price) || num(resp.additional && resp.additional.registration && resp.additional.registration.price),
    };
    try { await saveToolLookup('pkd', d, out); } catch { /* best-effort */ }
    return out;
  } catch { return { error: true }; }
}

export default { porkbunCheck, porkbunConfigured };
