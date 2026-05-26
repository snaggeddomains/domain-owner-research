import { fetchJson, fetchText, extractClues } from '../util.js';

const CRAWL_DEFAULT = 8;

// Spread the crawl across the timeline (always the earliest + latest, then an
// even spread between), since early/pre-privacy snapshots are where prior owner
// names and emails tend to survive.
function pickSamples(rows, max) {
  if (rows.length <= max) return rows;
  const picks = [rows[0], rows[rows.length - 1]];
  const inner = max - 2;
  for (let i = 1; i <= inner; i++) {
    picks.push(rows[Math.floor((rows.length - 1) * (i / (inner + 1)))]);
  }
  const seen = new Set();
  return picks.filter((r) => {
    if (seen.has(r[0])) return false;
    seen.add(r[0]);
    return true;
  });
}

export default {
  name: 'wayback_history',
  description:
    'Internet Archive (Wayback Machine), free. Returns the snapshot timeline (count, first/last dates, a sample) AND ' +
    'crawls a spread of archived snapshots — fetching the actual archived page source and extracting clues (emails, ' +
    'company names, copyright, social links, analytics IDs). Early snapshots often reveal a prior, pre-privacy owner.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain }, ctx = {}) {
    const env = ctx.env || {};
    const url =
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}` +
      `&output=json&fl=timestamp,original,statuscode&collapse=timestamp:8&limit=2000`;
    const cdx = await fetchJson(url);
    const rows = Array.isArray(cdx) ? cdx.slice(1) : []; // first row is a header
    const timestamps = rows.map((r) => r[0]).filter(Boolean).sort();

    const max = Number(env.WAYBACK_CRAWL_MAX || CRAWL_DEFAULT);
    const samples = pickSamples(rows, max);
    const crawled = await Promise.all(
      samples.map(async ([timestamp, original, statuscode]) => {
        // The `id_` modifier returns the raw archived bytes without the Wayback toolbar.
        const archiveUrl = `https://web.archive.org/web/${timestamp}id_/${original}`;
        try {
          const resp = await fetchText(archiveUrl, {}, 8000);
          return { timestamp, original, statuscode, ...extractClues(resp.body || '') };
        } catch (e) {
          return { timestamp, original, statuscode, error: String(e?.message || e) };
        }
      }),
    );

    return {
      total_snapshots: timestamps.length,
      first_snapshot: timestamps[0] || null,
      last_snapshot: timestamps[timestamps.length - 1] || null,
      sample: rows.slice(0, 25),
      crawled,
    };
  },
};
