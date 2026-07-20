// Auto-register engine for a Drop Campaign. Porkbun's API has NO registration endpoint
// (checkDomain/DNS/SSL only), so we use NameSilo — the simplest register API of the
// major registrars: a single GET that charges the account balance. Self-contained (no
// adapter). To ARM auto-register: set NAMESILO_API_KEY in the research project AND keep
// the NameSilo account funded. Supports .app and most gTLDs.
//
// GUARDRAILS live in dropcampaign.js (price cap, fire-once, premium check). This module
// just executes a single register attempt and reports the raw result.

export function registerConfigured(env = process.env) {
  return Boolean(env.NAMESILO_API_KEY);
}

// → { ok, registrar, code, detail } | { ok:false, reason }
// NameSilo reply codes: 300 = success; 261 = insufficient funds; 262 = not available; etc.
export async function attemptRegister(domain, env = process.env) {
  const key = env.NAMESILO_API_KEY;
  if (!key) return { ok: false, reason: 'no_registrar', detail: 'NAMESILO_API_KEY not set — cannot auto-register.' };
  const url =
    'https://www.namesilo.com/api/registerDomain?version=1&type=xml' +
    `&key=${encodeURIComponent(key)}&domain=${encodeURIComponent(String(domain).toLowerCase())}` +
    '&years=1&private=1&auto_renew=0';
  try {
    const res = await fetch(url, { headers: { accept: 'application/xml' }, cache: 'no-store' });
    const xml = await res.text();
    const code = (xml.match(/<code>\s*(\d+)\s*<\/code>/i) || [])[1] || '';
    const detail = ((xml.match(/<detail>\s*([^<]*?)\s*<\/detail>/i) || [])[1] || '').trim();
    if (code === '300') return { ok: true, registrar: 'namesilo', code, detail: detail || 'registered' };
    return { ok: false, registrar: 'namesilo', code, detail: detail || `NameSilo code ${code || 'unknown'}` };
  } catch (e) {
    return { ok: false, registrar: 'namesilo', reason: 'error', detail: String((e && e.message) || e) };
  }
}

export default { registerConfigured, attemptRegister };
