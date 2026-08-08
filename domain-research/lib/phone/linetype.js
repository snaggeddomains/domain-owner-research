import { fetchJson } from '../util.js';
import { getToolLookup, saveToolLookup } from '../db/tools.js';

// Phone line-type enrichment via Twilio Lookup v2 (Line Type Intelligence). Tells us
// whether a number is a mobile / landline / VoIP + the carrier, so the UI can auto-gate
// the WhatsApp/Telegram launchers to real mobiles instead of showing them on every
// number. This is the COMPLIANT signal — it does NOT confirm a WhatsApp/Telegram
// account (no clean API for that), just line type. Fully fail-open: no key / bad
// number / API error → null, and callers fall back to their prior behavior.
//
// Env: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN. ~$0.005 per lookup, so we cache
// per-E.164 (kind 'lt' in domain_research_tool_lookups) — a re-view never re-spends.
const BASE = 'https://lookups.twilio.com/v2/PhoneNumbers';
const KIND = 'lt';

export function lineTypeConfigured(env = process.env) {
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
}

// Best-effort E.164. A leading + is kept; a bare 10-digit number is assumed US (+1);
// 11 digits starting with 1 → +1…. Anything else is prefixed with + as-is.
export function toE164(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) return '+' + s.slice(1).replace(/\D/g, '');
  const d = s.replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return '+' + d;
}

// Raw single lookup (no cache). Returns { line_type, carrier, valid, e164 } or null.
export async function lineTypeOne(phone, env = process.env) {
  if (!lineTypeConfigured(env)) return null;
  const e164 = toE164(phone);
  if (!e164 || e164.replace(/\D/g, '').length < 8) return null;
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  try {
    const data = await fetchJson(`${BASE}/${encodeURIComponent(e164)}?Fields=line_type_intelligence`, { headers: { Authorization: `Basic ${auth}` } });
    const lt = (data && data.line_type_intelligence) || {};
    return { line_type: lt.type || null, carrier: lt.carrier_name || null, valid: !(data && data.valid === false), e164 };
  } catch {
    return null; // fail-open (invalid number 404s, transient errors, etc.)
  }
}

// Twilio Line Type Intelligence `type` values that can plausibly carry a WhatsApp/
// Telegram account. Mobile is the obvious one; non-fixed VoIP (Google Voice, etc.)
// frequently does too. Landline / fixed VoIP / tollFree / premium do not.
const MSG_CAPABLE = new Set(['mobile', 'nonfixedvoip', 'voip', 'personal']);
export function lineIsMessageable(lineType) {
  if (!lineType) return null; // unknown → let the caller decide (fallback)
  return MSG_CAPABLE.has(String(lineType).toLowerCase());
}

// Enrich a phones[] array in place with { line_type, carrier } (cache-first per number,
// bounded concurrency). No-op + returns the array unchanged when unconfigured. Fail-open.
export async function enrichLineTypes(phones, env = process.env, { concurrency = 4 } = {}) {
  if (!Array.isArray(phones) || !phones.length || !lineTypeConfigured(env)) return phones || [];
  let i = 0;
  async function worker() {
    while (i < phones.length) {
      const p = phones[i++];
      const e164 = toE164(p && p.value);
      if (!e164) continue;
      try {
        const cached = await getToolLookup(KIND, e164).catch(() => null);
        let info = cached && cached.data ? cached.data : null;
        if (!info) {
          info = await lineTypeOne(e164, env);
          if (info) await saveToolLookup(KIND, e164, info).catch(() => {});
        }
        if (info && info.line_type) { p.line_type = info.line_type; if (info.carrier) p.carrier = info.carrier; }
      } catch { /* fail-open: leave this phone untagged */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, phones.length) }, worker));
  return phones;
}
