import { fetchJson } from '../util.js';

// GLEIF — the Global Legal Entity Identifier Foundation. Free, keyless, global.
// Given a company/organization name, returns matching legal entities: exact legal name,
// registered address + jurisdiction, entity status, and (best-effort) the direct corporate
// parent. Coverage skews to larger / registered / financial entities (those with an LEI),
// so it CONFIRMS and enriches an identified registrant org rather than discovering unknowns.
export default {
  name: 'gleif_entity',
  description:
    'Free GLEIF legal-entity lookup by company/organization NAME (or an LEI). Returns the authoritative ' +
    'legal name, registered address + jurisdiction, entity status (active/lapsed), and — when available — the ' +
    'direct corporate PARENT. Use to confirm/enrich a registrant organization already identified from WHOIS/RDAP ' +
    'or the site; best for larger, registered, or financial entities (only entities that hold an LEI are covered).',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Company / organization name to look up' },
      lei: { type: 'string', description: 'A specific 20-char LEI, if already known' },
    },
  },
  async run({ name, lei }) {
    const base = 'https://api.gleif.org/api/v1';
    const headers = { accept: 'application/vnd.api+json' };

    // Resolve a set of candidate records.
    let records = [];
    if (lei) {
      const r = await fetchJson(`${base}/lei-records/${encodeURIComponent(lei.trim())}`, { headers }).catch(() => null);
      if (r?.data) records = [r.data];
    } else if (name && name.trim()) {
      const url = `${base}/lei-records?filter%5Bfulltext%5D=${encodeURIComponent(name.trim())}&page%5Bsize%5D=5`;
      const r = await fetchJson(url, { headers }).catch(() => null);
      records = Array.isArray(r?.data) ? r.data : [];
    } else {
      return { error: 'Provide a company name or an LEI.' };
    }
    if (!records.length) return { matches: [], note: 'No LEI-registered entity matched (many private/small entities have no LEI).' };

    const matches = [];
    for (const rec of records.slice(0, 5)) {
      const a = rec.attributes || {};
      const e = a.entity || {};
      const addr = e.legalAddress || {};
      // Direct parent (best-effort; skip on any error).
      let parent = null;
      try {
        const pr = await fetchJson(`${base}/lei-records/${encodeURIComponent(a.lei)}/direct-parent`, { headers }, 8000).catch(() => null);
        const pe = pr?.data?.attributes?.entity;
        if (pe) parent = { lei: pr.data.attributes.lei, name: pe.legalName?.name || null };
      } catch { /* no parent / not disclosed */ }
      matches.push({
        lei: a.lei,
        legal_name: e.legalName?.name || null,
        status: e.status || null,
        jurisdiction: e.jurisdiction || null,
        legal_form: e.legalForm?.id || null,
        address: [addr.addressLines?.join(' '), addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ') || null,
        registration_status: a.registration?.status || null,
        parent,
        gleif_url: `https://search.gleif.org/#/record/${a.lei}`,
      });
    }
    return { query: lei || name, count: matches.length, matches };
  },
};
