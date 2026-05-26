import { fetchJson, fetchText, extractClues } from '../util.js';

const CRAWL_DEFAULT = 8; // homepage snapshots across the timeline
const CONTACT_DEFAULT = 6; // archived About/Contact/etc. sub-pages

// Sub-pages where owner clues tend to hide on old captures.
const CONTACT_RE =
  /(?:^|\/)(about(?:-?us)?|contact(?:-?us)?|team|our-?team|company|who-?we-?are|people|staff|leadership|founders?|management|imprint|impressum|privacy|legal)(?:[/.?#]|$)/i;

const pathOf = (u) => String(u).replace(/^https?:\/\/[^/]+/i, '') || '/';

// Spread the crawl across the timeline (earliest + latest, then evenly between),
// since early/pre-privacy snapshots are where prior owner names/emails survive.
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

// Structured clues only (drop the bulky text excerpt so many pages stay compact).
function clues(body) {
  const c = extractClues(body || '');
  delete c.text_excerpt;
  return c;
}

async function fetchArchived([timestamp, original, statuscode]) {
  // The `id_` modifier returns the raw archived bytes without the Wayback toolbar.
  const archiveUrl = `https://web.archive.org/web/${timestamp}id_/${original}`;
  try {
    const resp = await fetchText(archiveUrl, {}, 8000);
    return { timestamp, url: original, statuscode, ...clues(resp.body) };
  } catch (e) {
    return { timestamp, url: original, statuscode, error: String(e?.message || e) };
  }
}

// Enumerate ALL archived paths under the domain (CDX matchType=prefix), then
// fetch the earliest 200 capture of each About/Contact/Team-type page.
async function crawlContactPages(domain, max) {
  const url =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*` +
    '&matchType=prefix&output=json&fl=timestamp,original,statuscode' +
    '&filter=statuscode:200&collapse=urlkey&limit=1000';
  let rows;
  try {
    const cdx = await fetchJson(url);
    rows = Array.isArray(cdx) ? cdx.slice(1) : [];
  } catch {
    return [];
  }
  const candidates = rows.filter((r) => CONTACT_RE.test(pathOf(r[1]))).slice(0, max);
  return Promise.all(candidates.map(fetchArchived));
}

export default {
  name: 'wayback_history',
  description:
    'Internet Archive (Wayback Machine), free. Returns the snapshot timeline (count, first/last, sample), crawls a ' +
    'spread of archived HOMEPAGE snapshots, AND enumerates archived sub-pages (About/Contact/Team/etc. via the CDX ' +
    'prefix index) and mines them for owner clues — emails, names, copyright, social links. Old About/Contact ' +
    'pages frequently expose a pre-privacy owner.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain }, ctx = {}) {
    const env = ctx.env || {};
    const tlUrl =
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}` +
      '&output=json&fl=timestamp,original,statuscode&collapse=timestamp:8&limit=2000';
    const cdx = await fetchJson(tlUrl);
    const rows = Array.isArray(cdx) ? cdx.slice(1) : []; // first row is a header
    const timestamps = rows.map((r) => r[0]).filter(Boolean).sort();

    const crawlMax = Number(env.WAYBACK_CRAWL_MAX || CRAWL_DEFAULT);
    const contactMax = Number(env.WAYBACK_CONTACT_MAX || CONTACT_DEFAULT);

    // Homepage snapshots and About/Contact sub-pages, crawled concurrently.
    const [crawled, contact_pages] = await Promise.all([
      Promise.all(pickSamples(rows, crawlMax).map(fetchArchived)),
      crawlContactPages(domain, contactMax),
    ]);

    return {
      total_snapshots: timestamps.length,
      first_snapshot: timestamps[0] || null,
      last_snapshot: timestamps[timestamps.length - 1] || null,
      sample: rows.slice(0, 25),
      crawled,
      contact_pages,
    };
  },
};
