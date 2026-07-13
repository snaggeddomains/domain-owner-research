// Inbound-lead triage — pure, inspectable, tunable. Combines the person's public
// prominence (VIP band), the sender company's firmographics (funding / size /
// revenue), and the form's own intent signals into ONE routing verdict:
//   vip      → the owner (Rob) should personally reply + build the relationship
//   notable  → hand to Brian
//   standard → anyone on the team can handle; no relationship to nurture
// Change a weight here, not an if/else in the pipeline.

// Free / personal mailbox providers — a submission from one of these carries no
// company signal (the email domain isn't their employer).
const FREE_EMAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com', 'pm.me',
]);

export function emailDomain(email) {
  const m = String(email || '').toLowerCase().match(/@([^@\s>]+)$/);
  return m ? m[1].replace(/\.$/, '') : null;
}
export function isFreeEmail(email) {
  const d = emailDomain(email);
  return !!d && FREE_EMAIL.has(d);
}
function sld(host) {
  const parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || '');
}
function money(n) { return `$${Math.round(Number(n)).toLocaleString()}`; }
function budgetNumber(budget) {
  // "$50k", "$25,000", "10000" → a number; "I'm not sure" / blank → null.
  const s = String(budget || '').toLowerCase();
  if (!s || /not sure|unsure|n\/?a|tbd|don'?t know|flexible|open/.test(s)) return null;
  const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([km])?/);
  if (!m) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1;
  const n = parseFloat(m[1]) * mult;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// { person: <deep-dive dossier|null>, company: <firmographics|null>, form: {email, domain_of_interest, budget, intent} }
export function triageLead({ person = null, company = null, form = {} } = {}) {
  const reasons = [];
  let score = 0;

  // ── Person prominence ───────────────────────────────────────────────────────
  const band = person && person.vip && person.vip.band;
  if (band === 'vip') { score += 3; reasons.push('High-profile individual (VIP audience)'); }
  else if (band === 'high_profile') { score += 2; reasons.push('Notable public presence'); }
  else if (band === 'notable') { score += 1; reasons.push('Some public presence'); }
  const followers = (person && person.max_followers) || 0;
  if (followers >= 1e5) reasons.push(`${Math.round(followers / 1000)}K+ followers`);

  // ── Company firmographics ───────────────────────────────────────────────────
  const funding = (company && company.fundingAmount) || 0;
  if (funding >= 25e6) { score += 3; reasons.push(`Company raised ${company.funding || money(funding)}`); }
  else if (funding >= 5e6) { score += 2; reasons.push(`Company raised ${company.funding || money(funding)}`); }
  else if (funding >= 1e6) { score += 1; reasons.push(`Company raised ${company.funding || money(funding)}`); }
  const employees = (company && company.employees) || 0;
  if (employees >= 200) { score += 2; reasons.push(`${employees.toLocaleString()} employees`); }
  else if (employees >= 50) { score += 1; reasons.push(`${employees.toLocaleString()} employees`); }
  const revenue = (company && company.revenueAmount) || 0;
  if (revenue >= 10e6) { score += 1; reasons.push(`~${company.revenue || money(revenue)} revenue`); }

  // ── Intent signals off the form ─────────────────────────────────────────────
  const email = form.email || '';
  const corp = !isFreeEmail(email) && !!emailDomain(email);
  if (corp) { score += 1; reasons.push(`Corporate email (@${emailDomain(email)})`); }
  // Buying the matching extension of their OWN brand — a very strong buyer signal.
  const wantSld = sld(form.domain_of_interest || '');
  const emailSld = sld(emailDomain(email) || '');
  const brandMatch = wantSld && emailSld && wantSld === emailSld;
  if (brandMatch) { score += 2; reasons.push(`Wants the matching extension of their own brand (${wantSld})`); }
  const budget = budgetNumber(form.budget);
  if (budget != null) {
    if (budget >= 25e3) { score += 2; reasons.push(`Stated budget ${money(budget)}`); }
    else if (budget >= 5e3) { score += 1; reasons.push(`Stated budget ${money(budget)}`); }
  }

  const tier = score >= 5 ? 'vip' : score >= 2 ? 'notable' : 'standard';
  const route = tier === 'vip'
    ? { route_to: 'Rob (reply personally)', label: 'VIP' }
    : tier === 'notable'
      ? { route_to: 'Brian', label: 'Notable' }
      : { route_to: 'Team (round-robin)', label: 'Standard' };

  return { tier, ...route, score, reasons, brand_match: !!brandMatch, budget_number: budget };
}

export default { triageLead, emailDomain, isFreeEmail };
