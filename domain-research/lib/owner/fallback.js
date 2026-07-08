// Auto owner-crack fallback — the pipeline hook that runs sibling triangulation
// ONLY when a finished report did NOT confidently name the owner, and folds any
// found owner back into the report as a transparent, clearly-labeled section.
//
// "Run that check automatically if the owner confidence isn't high" — a completed
// report at Medium/Low confidence gets one free triangulation pass (ccTLD / affix /
// brand-root siblings → public registrant sharing the DNS fingerprint) appended to
// the markdown. High-confidence reports skip it (we already named the owner).
import { summarizeReport, extractReportJson } from '../reportSummary.js';
import { crackOwner } from './crack.js';

// Minimum lead score worth surfacing (golfmax→NGCOA scored 13, unconv→Naveen 4).
const MIN_LEAD_SCORE = 4;

// Names/orgs the report already surfaced — so we can flag corroboration and avoid
// re-presenting the same party as a "new" find.
function reportPeople(markdown) {
  const json = extractReportJson(markdown);
  const out = [];
  if (json && Array.isArray(json.contacts)) {
    for (const c of json.contacts) {
      if ((c.type === 'name' || c.type === 'org') && c.value) out.push(String(c.value).trim());
    }
  }
  if (json && json.likely_owner) out.push(String(json.likely_owner).trim());
  return [...new Set(out)];
}

// Render the triangulation finding as a markdown section. Returns '' when there's
// no lead worth showing.
function renderSection(result, domain) {
  const top = result && result.leads && result.leads[0];
  if (!result || !result.found || !top || top.score < MIN_LEAD_SCORE) return '';
  const confWord = result.confidence === 'high' ? 'High' : result.confidence === 'medium' ? 'Medium' : 'Low';
  const verified = top.fingerprint !== 'none';
  const lines = [];
  lines.push('### 🔗 Sibling triangulation (automated)');
  lines.push(`Because we did not confidently name the owner, we automatically checked **${domain}**'s ccTLD / affix / brand-root siblings for a public registrant that shares its DNS fingerprint.`);
  lines.push('');
  lines.push(`**Likely owner (via sibling): ${result.owner}** — ${confWord} confidence${verified ? ' (DNS fingerprint match)' : ' (brand-related lead — verify before acting)'}.`);
  for (const e of (result.evidence || [])) lines.push(`- ${e}`);
  const extra = { registrar: top.registrar, email: top.email };
  const detail = [`Lead sibling: **${top.sibling}**`];
  if (extra.email) detail.push(`contact ${extra.email}`);
  if (extra.registrar) detail.push(`registrar ${extra.registrar}`);
  lines.push(`- ${detail.join(' · ')}`);
  // Show a couple of the other siblings we checked, for auditability.
  const others = (result.leads || []).slice(1, 3);
  if (others.length) {
    lines.push('');
    lines.push('_Other siblings checked:_ ' + others.map((l) => `${l.sibling} → ${l.owner}`).join('; ') + '.');
  }
  return lines.join('\n');
}

// Run the fallback for a finished report. Returns { ran, found, section, result }.
// - ran:false when the report is already High-confidence (skipped) or errored.
// - section:'' when the crack found nothing worth appending.
export async function maybeCrackOwner({ domain, markdown, env = process.env, force = false } = {}) {
  const summary = summarizeReport({ markdown });
  // Skip when the report already confidently named a real owner.
  if (!force && summary.confidence === 'High' && summary.likelyOwner) {
    return { ran: false, found: false, section: '', reason: 'high-confidence' };
  }
  const context = { people: reportPeople(markdown) };
  const result = await crackOwner({ domain, context, env });
  const section = renderSection(result, domain);
  return { ran: true, found: !!(result && result.found), section, result };
}

export default { maybeCrackOwner };
