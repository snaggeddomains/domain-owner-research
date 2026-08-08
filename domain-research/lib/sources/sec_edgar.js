import { fetchJson } from '../util.js';

// SEC EDGAR — free, keyless (a descriptive User-Agent is required by the SEC).
// Given a company name, checks whether the owner is a U.S. SEC-registered filer and returns
// its CIK, exact name, ticker, industry (SIC), HQ address, and most recent filings. A strong
// "is this a public / SEC-reporting company" signal for domain owner research.
const UA = process.env.SEC_EDGAR_UA || 'rob-personal domain-owner-research (rob@snagged.com)';

let tickersCache = null; // { at, list: [{cik, ticker, title}] }

async function loadTickers() {
  if (tickersCache && Date.now() - tickersCache.at < 6 * 3600 * 1000) return tickersCache.list;
  const d = await fetchJson('https://www.sec.gov/files/company_tickers.json', { headers: { 'user-agent': UA } }, 15000);
  const list = Object.values(d || {}).map((v) => ({ cik: String(v.cik_str).padStart(10, '0'), ticker: v.ticker, title: v.title }));
  tickersCache = { at: Date.now(), list };
  return list;
}

export default {
  name: 'sec_edgar',
  description:
    'Free SEC EDGAR lookup by company NAME. Determines whether the owner is a U.S. SEC-registered (public/reporting) ' +
    'company and returns its CIK, official name, ticker, industry (SIC), HQ address, and most recent filings ' +
    '(form type + date + link). Use to establish whether a registrant organization is a public company and pull its ' +
    'authoritative profile; U.S. filers only.',
  parameters: {
    type: 'object',
    properties: { name: { type: 'string', description: 'Company / organization name to look up' } },
    required: ['name'],
  },
  async run({ name }) {
    const q = (name || '').trim();
    if (!q) return { error: 'Provide a company name.' };
    const list = await loadTickers().catch(() => []);
    const up = q.toUpperCase();
    // Rank: exact, then startsWith, then contains.
    const scored = list
      .map((r) => {
        const t = r.title.toUpperCase();
        let s = 0;
        if (t === up) s = 3;
        else if (t.startsWith(up)) s = 2;
        else if (t.includes(up)) s = 1;
        return s ? { ...r, s } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
    if (!scored.length) return { matches: [], note: 'No SEC-registered (tickered) company matched — likely private or non-U.S.' };

    const matches = [];
    for (const m of scored) {
      let profile = null;
      try {
        const sub = await fetchJson(`https://data.sec.gov/submissions/CIK${m.cik}.json`, { headers: { 'user-agent': UA } }, 15000);
        const recent = sub?.filings?.recent;
        const filings = [];
        if (recent?.form) {
          for (let i = 0; i < recent.form.length && filings.length < 5; i++) {
            if (/^(10-K|10-Q|8-K|S-1|DEF 14A|20-F|424B|SC 13|13F)/i.test(recent.form[i])) {
              const acc = (recent.accessionNumber?.[i] || '').replace(/-/g, '');
              filings.push({
                form: recent.form[i],
                date: recent.filingDate?.[i],
                url: acc ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${m.cik}&type=${encodeURIComponent(recent.form[i])}` : null,
              });
            }
          }
        }
        profile = {
          name: sub?.name || m.title,
          sic: sub?.sicDescription || null,
          state: sub?.addresses?.business?.stateOrCountry || null,
          city: sub?.addresses?.business?.city || null,
          website: sub?.website || null,
          exchange: (sub?.exchanges || []).join(', ') || null,
          recent_filings: filings,
        };
      } catch { /* submissions unavailable */ }
      matches.push({
        cik: m.cik,
        ticker: m.ticker,
        title: m.title,
        edgar_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${m.cik}`,
        ...(profile || {}),
      });
    }
    return { query: q, count: matches.length, is_public_company: true, matches };
  },
};
