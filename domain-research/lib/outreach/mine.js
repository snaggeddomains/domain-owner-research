// Mine Rob's REAL first-touch outreach emails from the deal mailboxes (via the
// admin internal Gmail endpoint) into a growing, referenceable "voice toolkit" the
// drafter pulls from alongside the built-in templates. Openers are lightly redacted
// (domain + recipient first name → placeholders) and tagged by scenario so the
// drafter can retrieve the relevant few for a given report.
//
// Everything is best-effort + fail-open: no Gmail creds / no DB → it simply mines
// nothing and the drafter falls back to the built-in templates.

import { searchEmailThreadsRaw, fetchEmailThread, emailIngestConfigured } from '../email/threads.js';
import { upsertExample } from '../db/outreachExamples.js';

// Our outreach subject is always "<domain> Domain Inquiry" and is sent from a
// snagged.com mailbox — a tight query that surfaces our openers, not inbound leads.
const MINE_QUERY = 'subject:(Domain Inquiry) from:snagged.com';
const OUR_DOMAIN = /@snagged\.(com|co)\b/i;

// Scenario tags from the opener's own text (what Rob actually leaned on).
function tagText(t) {
  const s = String(t || '').toLowerCase();
  const tags = [];
  const has = (re) => re.test(s);
  if (has(/\b(listed|for sale|asking|buy now|make offer|marketplace)\b/)) tags.push('listed');
  if (has(/\b(acquir|purchased|bought|inherit)\b/)) tags.push('acquisition');
  if (has(/\b(used to|formerly|previously|back when|your time (at|with)|ex-)\b/)) tags.push('former-operator');
  if (has(/\b(redirect|forwards? to|points? to|resolves to)\b/)) tags.push('redirect');
  if (has(/\b(parked|not in use|no active site|sitting|dormant)\b/)) tags.push('parked');
  if (has(/\b(privacy|redacted|whois)\b/)) tags.push('privacy');
  if (has(/\b(portfolio|investor|domainer|hold)\b/)) tags.push('investor');
  if (has(/\b(team|founders|both of you|all of you|stakeholders)\b/)) tags.push('multi-stakeholder');
  if (has(/\b(still (own|hold)|do you still)\b/)) tags.push('may-still-own');
  return [...new Set(tags)];
}

// Domain out of the subject "<domain> Domain Inquiry".
function domainFromSubject(subject) {
  const m = String(subject || '').match(/([a-z0-9-]+(?:\.[a-z0-9-]+)+)\s+domain inquiry/i);
  return m ? m[1].toLowerCase() : null;
}

// The FIRST block written by us (the opener). Thread text blocks are separated by
// "———" and each starts with "From: <who> · <when>\nSubject: …\n\n<body>".
function extractOpener(text) {
  const blocks = String(text || '').split(/\n\n[-—]{2,}\n\n/);
  for (const b of blocks) {
    const mFrom = b.match(/^From:\s*(.+)$/m);
    if (!mFrom || !OUR_DOMAIN.test(mFrom[1])) continue;
    // Body = everything after the first blank line following the headers.
    const bodyStart = b.indexOf('\n\n');
    let body = bodyStart === -1 ? b : b.slice(bodyStart + 2);
    // Drop quoted history / trailing reply chains.
    body = body
      .replace(/^On .+wrote:\s*$[\s\S]*/m, '')
      .replace(/^>.*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (body.length >= 40) return { body, from: mFrom[1].trim() };
  }
  return null;
}

// Redact the specific domain + greeting name so the example is reusable voice, not
// a one-off. Marketplaces/companies are LEFT literal — they're illustrative context.
function redact(body, domain) {
  let out = String(body || '');
  if (domain) out = out.replace(new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[DOMAIN]');
  // Greeting first name: "Hey Brian —" / "Hi Sarah," / "Hello Mr. Lee"
  out = out.replace(/^(\s*(?:hey|hi|hello|dear)\s+)([A-Z][a-zA-Z.'-]+)/m, '$1[First Name]');
  return out.trim();
}

// Mine up to `max` opener examples. Returns { configured, scanned, saved }.
export async function mineOutreachExamples(env = process.env, { max = 30 } = {}) {
  if (!emailIngestConfigured()) return { configured: false, scanned: 0, saved: 0 };
  let stubs = [];
  try { stubs = await searchEmailThreadsRaw(MINE_QUERY, max); } catch { stubs = []; }
  let saved = 0;
  for (const st of stubs) {
    if (!st || !st.mailbox || !st.threadId) continue;
    try {
      const domain = domainFromSubject(st.subject) || null;
      const thread = await fetchEmailThread(st.mailbox, st.threadId);
      if (!thread || !thread.text) continue;
      const opener = extractOpener(thread.text);
      if (!opener) continue;
      const body = redact(opener.body, domain);
      const tags = tagText(opener.body);
      const ok = await upsertExample({
        ext_id: `${st.mailbox}:${st.threadId}`,
        domain,
        subject: st.subject || null,
        body,
        situation: tags[0] || 'general',
        tags,
        source: 'gmail',
        from_addr: opener.from,
        sent_at: st.date || null,
      });
      if (ok) saved += 1;
    } catch {
      /* skip this thread */
    }
  }
  return { configured: true, scanned: stubs.length, saved };
}

// Rank stored examples by tag overlap with the current report's signals — the few
// most similar real openers to hand the drafter. Falls back to most-recent.
export function relevantExamples(signals, all, k = 3) {
  const want = new Set();
  if (signals.listed) want.add('listed');
  if (signals.acquisition) want.add('acquisition');
  if (signals.formerOperator) want.add('former-operator');
  if (signals.redirectsToParent) want.add('redirect');
  if (signals.parked) want.add('parked');
  if (signals.privacy) want.add('privacy');
  if (signals.ownerType === 'domain_investor' || signals.ownerType === 'marketplace_only') want.add('investor');
  if (signals.multiStakeholder) want.add('multi-stakeholder');
  if (signals.mayStillOwn) want.add('may-still-own');
  const scored = (Array.isArray(all) ? all : []).map((ex, i) => {
    const tags = Array.isArray(ex.tags) ? ex.tags : [];
    const overlap = tags.filter((t) => want.has(t)).length;
    return { ex, score: overlap, recency: -i };
  });
  scored.sort((a, b) => (b.score - a.score) || (b.recency - a.recency));
  // Only include zero-overlap examples if we have nothing better (keeps a couple of
  // recent openers as generic voice reference).
  const top = scored.filter((s) => s.score > 0).slice(0, k);
  if (top.length < k) top.push(...scored.filter((s) => s.score === 0).slice(0, k - top.length));
  return top.map((s) => s.ex);
}
