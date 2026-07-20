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

// Dynadot: single call, account default contact + balance. api3.json returns
// { RegisterResponse: { ResponseCode:"0", Status:"success", Expiration, ... } };
// ResponseCode "0" AND/OR Status "success" = success, else Error carries the reason.
async function registerDynadot(domain, env) {
  const key = env.DYNADOT_API_KEY;
  const url = `https://api.dynadot.com/api3.json?key=${encodeURIComponent(key)}&command=register&domain=${encodeURIComponent(domain)}&duration=1&currency=usd`;
  try {
    const raw = await (await fetch(url, { cache: 'no-store' })).json().catch(() => ({}));
    const r = (raw && (raw.RegisterResponse || raw.Response || raw)) || {};
    const status = String(r.Status || r.status || '').toLowerCase();
    const rc = String(r.ResponseCode ?? r.responseCode ?? '').trim();
    if (status === 'success' || rc === '0') return { ok: true, registrar: 'dynadot', code: rc || 'success', detail: r.Expiration || r.expiration || 'registered' };
    return { ok: false, registrar: 'dynadot', code: rc || status || 'error', detail: r.Error || r.error || `Dynadot status ${status || rc || 'unknown'}` };
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
  if (env.DYNADOT_API_KEY) return 'dynadot';
  if (env.GODADDY_API_KEY && env.GODADDY_API_SECRET) return 'godaddy';
  if (env.NAMECHEAP_API_KEY && env.NAMECHEAP_API_USER) return 'namecheap';
  return null;
}

export function registerConfigured(env = process.env) { return Boolean(registerProvider(env)); }

export async function attemptRegister(domain, env = process.env) {
  const p = registerProvider(env);
  if (!p) return { ok: false, reason: 'no_registrar', detail: 'No register-capable registrar configured (set BEEPER_REGISTER_PROVIDER + its keys).' };
  const key = { namesilo: env.NAMESILO_API_KEY, dynadot: env.DYNADOT_API_KEY, godaddy: env.GODADDY_API_KEY, namecheap: env.NAMECHEAP_API_KEY }[p];
  if (!key && (p === 'namesilo' || p === 'dynadot')) return { ok: false, reason: 'no_key', detail: `${p} selected but its API key isn't set.` };
  return PROVIDERS[p](String(domain).toLowerCase(), env);
}

export default { registerProvider, registerConfigured, attemptRegister };
