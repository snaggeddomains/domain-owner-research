// Sizto bulk-dump — PLACEHOLDER, NOT YET WIRED.
//
// Design intent (captured here so future implementation work has a reference,
// not chat history, to lean on):
//
// • What it is: a server-side scraper that pulls Sizto's full inventory and
//   keeps a local mirror we can query. We hit it on every research run
//   instead of going to the live site each time.
// • Why Sizto specifically: it's the only platform (short-term) with a
//   filter for newly-added listings, so a periodic dump can target just the
//   delta and still stay current without rescraping the whole catalog every
//   run.
// • Refresh cadence: full dump every 12 hours (twice daily) baseline; bump
//   to ~every 6 hours if the delta filter proves cheap enough. The scraper
//   should write a timestamped snapshot so a research run can answer "is
//   this domain currently listed on Sizto?" without a live request.
// • Storage: a `domain_research_sizto_inventory` table keyed by domain (with
//   listed_at, price, listing_url, snapshot_ts). The tool below just queries
//   that table at runtime; the actual scrape lives in a separate Inngest
//   cron (to be built).
// • Cost model: free at runtime (mirror reads). Listed as PAID in index.js
//   only if/when we cap mirror size and need to gate it; for now leave it
//   FREE since reads are local.
//
// Until SIZTO_DUMP_ENABLED is set, getToolSpecs() filters this out — so the
// LLM never sees it and runTool() returns "not configured." It's registered
// in ALL purely so the source roster (admin/diag tooling) shows it as a
// known-but-pending source.

export default {
  name: 'sizto_dump',
  description:
    'Sizto inventory mirror — checks whether a domain currently appears in Sizto\'s catalog ' +
    '(refreshed from a periodic full-dump scrape). PLACEHOLDER: not yet implemented.',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain to check against the local Sizto mirror' },
    },
    required: ['domain'],
  },
  // Gate behind an env flag that isn't set anywhere yet, so the source is
  // visible in the registry but never runnable until the scraper + table land.
  requiresKey: ['SIZTO_DUMP_ENABLED'],
  async run(/* args, { env } */) {
    throw new Error('sizto_dump is a placeholder — scraper + mirror table not yet implemented');
  },
};
