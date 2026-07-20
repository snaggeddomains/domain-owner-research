// Auto-register engine for a Drop Campaign — REGISTRAR-AGNOSTIC. Pick the provider with
// BEEPER_REGISTER_PROVIDER (namesilo | dynadot | godaddy | namecheap), else it auto-detects
// from whichever keys are set. GUARDRAILS (price cap, fire-once) live in dropcampaign.js.
//
// ⚠️ Porkbun is intentionally absent — their API has NO registration endpoint.
//
// The two CLEAN providers register with a single call using your account's DEFAULT
// contact/registrant (nothing to configure):
//   • NAMESILO  — set NAMESILO_API_KEY (+ funded account)
//   • DYNADOT   — set DYNADOT_API_KEY  (+ funded account)
// Namecheap / GoDaddy also work but need a full contact-profile payload (and Namecheap a
// static-IP allowlist) — wired on request, see registerGodaddy/registerNamecheap notes.

import crypto from 'node:crypto';

// → { ok, registrar, code, detail } | { ok:false, reason, detail }
async function registerNamesilo(domain, env) {
  const key = env.NAMESILO_API_KEY;
  const url =
    'https://www.namesilo.com/api/registerDomain?version=1&type=xml' +
    `&key=${encodeURIComponent(key)}&domain=${encodeURIComponent(domain)}&years=1&private=1&auto_renew=0`;
  try {
    const xml = await (await fetch(url, { cache: 'no-store' })).text();
    const code = (xml.match(/<code>\s*(\d+)\s*<\/code>/i) || [])[1] || '';
    const detail = ((xml.match(/<detail>\s*([^<]*?)\s*<\/detail>/i) || [])[1] || '').trim();
    if (code === '300') return { ok: true, registrar: 'namesilo', code, detail: detail || 'registered' };
    return { ok: false, registrar: 'namesilo', code, detail: detail || `NameSilo code ${code || 'unknown'}` };
  } catch (e) { return { ok: false, registrar: 'namesilo', reason: 'error', detail: String((e && e.message) || e) }; }
}

// Dynadot: RESTful API v2 (account default contact + balance). Dynadot now ENFORCES the
// X-Signature header on sensitive commands (register), so this needs BOTH the Production
// Key (Authorization: Bearer) AND the Secret Key (to sign). Signature = base64 HMAC-SHA256
// over `apiKey\npath\nrequestId\nbody` with the Secret Key (per Dynadot's REST API doc).
// ⚠️ VERIFY LIVE with a cheap throwaway before trusting the auto-buy — built from their
// published spec, not exercised here (it spends money). The alert fallback covers a failure.
async function registerDynadot(domain, env) {
  const key = env.DYNADOT_API_KEY;
  const secret = env.DYNADOT_API_SECRET;
  if (!secret) return { ok: false, registrar: 'dynadot', reason: 'no_secret', detail: 'DYNADOT_API_SECRET required — Dynadot enforces X-Signature on register.' };
  const path = '/restful/v2/domains/register';
  const body = JSON.stringify({ domain, duration: 1, currency: 'usd' });
  const requestId = '';
  const stringToSign = `${key}\n${path}\n${requestId}\n${body}`;
  const sig = crypto.createHmac('sha256', secret).update(stringToSign, 'utf8').digest('base64');
  try {
    const res = await fetch(`https://api.dynadot.com${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Signature': sig, ...(requestId ? { 'X-Request-Id': requestId } : {}) },
      body,
      cache: 'no-store',
    });
    const raw = await res.json().catch(() => ({}));
    // REST v2 wraps status in various shapes; treat an explicit success/200/code-0 as OK.
    const r = (raw && (raw.data || raw.RegisterResponse || raw.response || raw)) || {};
    const status = String(r.status || r.Status || raw.status || '').toLowerCase();
    const code = String(r.code ?? r.Code ?? r.ResponseCode ?? raw.code ?? '').trim();
    const okFlag = res.ok && (status === 'success' || status === 'ok' || code === '0' || code === '200');
    if (okFlag) return { ok: true, registrar: 'dynadot', code: code || status || String(res.status), detail: r.expiration || r.Expiration || 'registered' };
    return { ok: false, registrar: 'dynadot', code: code || status || String(res.status), detail: r.error || r.Error || r.message || raw.message || `Dynadot HTTP ${res.status}` };
  } catch (e) { return { ok: false, registrar: 'dynadot', reason: 'error', detail: String((e && e.message) || e) }; }
}

// GoDaddy / Namecheap: need a full contact profile (+ Namecheap a static IP). Not wired
// until chosen — return an explicit signal so the campaign falls back to an urgent alert.
async function registerGodaddy() {
  return { ok: false, registrar: 'godaddy', reason: 'not_wired', detail: 'GoDaddy purchase needs a contact profile + consent — not yet wired.' };
}
async function registerNamecheap() {
  return { ok: false, registrar: 'namecheap', reason: 'not_wired', detail: 'Namecheap register needs a contact profile + static-IP allowlist — not yet wired.' };
}

const PROVIDERS = { namesilo: registerNamesilo, dynadot: registerDynadot, godaddy: registerGodaddy, namecheap: registerNamecheap };

// Which provider to use: explicit override, else auto-detect from available keys (clean ones first).
export function registerProvider(env = process.env) {
  const explicit = String(env.BEEPER_REGISTER_PROVIDER || '').toLowerCase();
  if (explicit && PROVIDERS[explicit]) return explicit;
  if (env.NAMESILO_API_KEY) return 'namesilo';
  if (env.DYNADOT_API_KEY && env.DYNADOT_API_SECRET) return 'dynadot';
  if (env.GODADDY_API_KEY && env.GODADDY_API_SECRET) return 'godaddy';
  if (env.NAMECHEAP_API_KEY && env.NAMECHEAP_API_USER) return 'namecheap';
  return null;
}

export function registerConfigured(env = process.env) { return Boolean(registerProvider(env)); }

export async function attemptRegister(domain, env = process.env) {
  const p = registerProvider(env);
  if (!p) return { ok: false, reason: 'no_registrar', detail: 'No register-capable registrar configured (set BEEPER_REGISTER_PROVIDER + its keys).' };
  if (p === 'namesilo' && !env.NAMESILO_API_KEY) return { ok: false, reason: 'no_key', detail: 'NameSilo selected but NAMESILO_API_KEY is not set.' };
  if (p === 'dynadot' && !(env.DYNADOT_API_KEY && env.DYNADOT_API_SECRET)) return { ok: false, reason: 'no_key', detail: 'Dynadot needs BOTH DYNADOT_API_KEY and DYNADOT_API_SECRET.' };
  return PROVIDERS[p](String(domain).toLowerCase(), env);
}

export default { registerProvider, registerConfigured, attemptRegister };
