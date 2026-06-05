// Sales Research Agent — firmographic bake-off (Apollo vs PDL).
//
// Diagnostic (not pipeline code): runs Upgrade discovery for a seed, then enriches
// every candidate through BOTH firmographic providers and scores them head-to-head
// on the four ranking-critical fields (employees / industry / funding / location)
// plus the load-bearing question for Upgrade — which provider can NAME the bare
// `tld_variant` rows (e.g. artificial.co → "Artificial Labs"), since discovery
// surfaces those without a company name.
//
//   APOLLO_ENRICH_API_KEY=... PDL_API_KEY=... node lib/sales/enrich/bakeoff.js artificial.com
//
// Reports per-provider fill-rate for the active/for-sale set, tld_variant naming
// coverage, and a side-by-side per-domain table. Read-only — no DB writes.

import { pathToFileURL } from 'node:url';
import { discoverUpgrade } from '../discovery/upgrade.js';
import { firmographicsApollo, firmographicsPDL, abilityToPay } from './firmographics.js';

const FIELDS = ['employees', 'industry', 'funding', 'location'];

function filled(rec, field) {
  if (!rec) return false;
  const v = rec[field];
  return v != null && v !== '' && !(typeof v === 'number' && v === 0);
}

async function enrichBoth(domain) {
  const [apollo, pdl] = await Promise.all([
    firmographicsApollo(domain).catch((e) => ({ __err: String(e.message) })),
    firmographicsPDL(domain).catch((e) => ({ __err: String(e.message) })),
  ]);
  return { apollo: apollo && apollo.__err ? null : apollo, pdl: pdl && pdl.__err ? null : pdl };
}

export async function bakeoff(seed) {
  const candidates = await discoverUpgrade(seed);
  const order = { active: 0, for_sale: 1, inactive: 2 };
  candidates.sort((a, b) => (order[a.status] - order[b.status]) || a.domain.localeCompare(b.domain));

  const rows = [];
  // Low fan-out — Apollo rate-limits on burst (the lib retries 429s, but keep the
  // concurrent pressure gentle so the bake-off reflects coverage, not throttling).
  const limit = 3;
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < candidates.length) {
      const idx = i++;
      const c = candidates[idx];
      const { apollo, pdl } = await enrichBoth(c.domain);
      rows[idx] = { ...c, apollo, pdl };
    }
  }));
  return rows;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'artificial.com';
  console.error(`\nFirmographic bake-off (Apollo vs PDL) for ${seed} …\n`);
  const rows = await bakeoff(seed);

  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  const cell = (rec, field) => (filled(rec, field) ? String(rec[field]) : '·');

  // ── Per-domain matched? + name + 4 fields, side by side ──────────────────────
  console.log('=== PER-CANDIDATE (A=Apollo, P=PDL) ===\n');
  console.log(pad('DOMAIN', 34), pad('STATUS', 9), pad('PROV', 4), pad('NAME', 26), pad('EMPL', 7), pad('INDUSTRY', 20), pad('FUNDING', 12), 'LOCATION');
  console.log('-'.repeat(150));
  for (const r of rows) {
    for (const [tag, rec] of [['A', r.apollo], ['P', r.pdl]]) {
      console.log(
        pad(tag === 'A' ? r.domain : '', 34), pad(tag === 'A' ? r.status : '', 9), pad(tag, 4),
        pad(rec ? (rec.company || '—') : 'MISS', 26),
        pad(cell(rec, 'employees'), 7), pad(cell(rec, 'industry'), 20),
        pad(cell(rec, 'funding'), 12), cell(rec, 'location'),
      );
    }
    console.log('-'.repeat(150));
  }

  // ── Fill-rate scoring ────────────────────────────────────────────────────────
  // Score on the viable-target set (active + for_sale) — inactive rows are dropped
  // by the pipeline, so their fill rate doesn't matter for ranking.
  const viable = rows.filter((r) => r.status === 'active' || r.status === 'for_sale');
  function scoreSet(set, label) {
    console.log(`\n=== FILL-RATE — ${label} (n=${set.length}) ===`);
    for (const prov of ['apollo', 'pdl']) {
      const matched = set.filter((r) => r[prov]).length;
      const counts = FIELDS.map((f) => set.filter((r) => filled(r[prov], f)).length);
      const totalCells = set.length * FIELDS.length;
      const totalFilled = counts.reduce((a, b) => a + b, 0);
      console.log(
        `  ${pad(prov, 7)} matched ${matched}/${set.length}  | ` +
        FIELDS.map((f, k) => `${f} ${counts[k]}/${set.length}`).join('  ') +
        `  | overall ${totalFilled}/${totalCells} (${Math.round((100 * totalFilled) / totalCells)}%)`,
      );
    }
  }
  scoreSet(viable, 'VIABLE (active + for_sale)');
  scoreSet(rows, 'ALL candidates');

  // ── tld_variant naming — the load-bearing Upgrade question ───────────────────
  const tldv = rows.filter((r) => r.subtype === 'tld_variant');
  console.log(`\n=== tld_variant NAMING (n=${tldv.length}) — can the provider name the bare row? ===`);
  console.log(pad('DOMAIN', 22), pad('STATUS', 9), pad('APOLLO', 34), 'PDL');
  console.log('-'.repeat(100));
  for (const r of tldv) {
    console.log(
      pad(r.domain, 22), pad(r.status, 9),
      pad(r.apollo ? (r.apollo.company || '—') : 'MISS', 34),
      r.pdl ? (r.pdl.company || '—') : 'MISS',
    );
  }
  const apolloNamed = tldv.filter((r) => r.apollo && r.apollo.company).length;
  const pdlNamed = tldv.filter((r) => r.pdl && r.pdl.company).length;
  console.log('-'.repeat(100));
  console.log(`  Apollo named ${apolloNamed}/${tldv.length}  ·  PDL named ${pdlNamed}/${tldv.length}`);

  // ── Ability-to-pay qualification (the point: who can realistically spend?) ─────
  // Merge each candidate's two records (Apollo primary) and run the qualifier.
  console.log('\n=== ABILITY-TO-PAY — viable candidates ranked (the qualification deliverable) ===');
  const tierRank = { strong: 0, medium: 1, low: 2, unknown: 3 };
  const qualified = viable.map((r) => {
    const a = r.apollo || {}; const p = r.pdl || {};
    const merged = (r.apollo || r.pdl) ? { ...p, ...Object.fromEntries(Object.entries(a).filter(([, v]) => v != null)) } : null;
    return { ...r, atp: abilityToPay(merged) };
  }).sort((x, y) => tierRank[x.atp.tier] - tierRank[y.atp.tier]);
  for (const r of qualified) {
    const name = (r.apollo && r.apollo.company) || (r.pdl && r.pdl.company) || r.domain;
    console.log(`  ${pad(r.atp.tier.toUpperCase(), 8)} ${pad(name, 30)} ${r.atp.reasons.join(' · ') || '—'}`);
  }
  const counts = qualified.reduce((m, r) => ((m[r.atp.tier] = (m[r.atp.tier] || 0) + 1), m), {});
  console.log(`\n  tiers: ${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(' · ')}\n`);
}
