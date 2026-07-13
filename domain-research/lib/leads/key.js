// Deterministic lead key. The dossier URL is derived from the inbound's identity
// (email) so it's the SAME every time — Zapier can build the link at trigger time
// without waiting for the enrichment, and the dossier is reachable from the email
// alone (no stored pointer to lose). HMAC-keyed so the value is opaque + not
// guessable — the raw email never appears in the URL (nothing leaks if a submitter
// scrolls the chain), and the real protection is still the login wall behind it.
import crypto from 'crypto';

const FALLBACK = 'snagged-leads-v1'; // used only if RESEARCH_INTERNAL_SECRET is unset

export function leadKey(email, secret = process.env.RESEARCH_INTERNAL_SECRET || '') {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  return crypto.createHmac('sha256', secret || FALLBACK).update(e).digest('hex').slice(0, 16);
}

export default { leadKey };
