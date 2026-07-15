import { fetchText } from '../util.js';

// Auto-detect the WINNING BIDDER handle from a Namecheap Market sale page. A domain
// that sold on Namecheap Market has a public sale page (namecheap.com/market/<domain>/)
// showing "from <handle>" + a bid history — the winner's marketplace username is a
// real owner lead. Namecheap is Cloudflare-walled, so this needs Scrape.do rendering
// (SCRAPE_DO_API_KEY). Fully best-effort: no key / not found / blocked → null.

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// A Namecheap marketplace handle: letters/digits/._- , 2–40 chars. Exclude a few
// words that could follow "from" in non-handle contexts.
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,38}[A-Za-z0-9])?$/;
const HANDLE_STOP = new Set(['the', 'this', 'sale', 'market', 'namecheap', 'seller', 'buyer', 'now',
  'here', 'our', 'your', 'price', 'bid', 'from', 'bidder', 'time', 'usd', 'proxy', 'history', 'ended', 'sold']);

// Pull the winning handle (+ the distinct bidders) from rendered Namecheap sale
// text. The page shows the price then "from <handle>" (the winner), and a Bid
// History table listing every "<handle> $<amount>" row. We take the winner from the
// "from <handle>" phrase and collect the bid-history handles as extra intel.
function parseWinner(text) {
  const t = String(text || '');
  const sold = /\bSOLD\b/i.test(t) || /Ended on /i.test(t);
  const clean = (h) => {
    const s = String(h || '').trim().replace(/\(you\)$/i, '').trim();
    return HANDLE_RE.test(s) && !HANDLE_STOP.has(s.toLowerCase()) ? s : null;
  };
  // "$1,275 from keepquiet" (or "... from JimmyJJohnson (you)") — the price-adjacent
  // "from <handle>" is the winner.
  let handle = null;
  const m = t.match(/\$[\d,]+\s*(?:USD)?\s*from\s+([A-Za-z0-9._-]{2,40})/i)
    || t.match(/\bfrom\s+([A-Za-z0-9._-]{2,40})/i);
  if (m) handle = clean(m[1]);
  // Bid History: each row is "<handle> $<amount> <date>". Collect distinct handles
  // (winner first if known).
  const bidders = [];
  const seen = new Set();
  if (handle) { bidders.push(handle); seen.add(handle.toLowerCase()); }
  for (const bm of t.matchAll(/([A-Za-z0-9._-]{2,40})\s*(?:\(you\))?\s*\$[\d,]+/gi)) {
    const h = clean(bm[1]);
    if (h && !seen.has(h.toLowerCase())) { seen.add(h.toLowerCase()); bidders.push(h); }
    if (bidders.length >= 8) break;
  }
  return { handle, sold, bidders: bidders.length ? `bidders: ${bidders.join(', ')}` : null };
}

// domain → { handle, sold, sale_url } | null. Only fires when Scrape.do is set.
export async function detectNamecheapAuction(domain, env = {}) {
  const key = env.SCRAPE_DO_API_KEY;
  const d = String(domain || '').trim().toLowerCase();
  if (!key || !d || !/\./.test(d)) return null;
  const saleUrl = `https://www.namecheap.com/market/${encodeURIComponent(d)}/`;
  try {
    const api =
      `https://api.scrape.do/?token=${encodeURIComponent(key)}` +
      `&render=true&super=true&url=${encodeURIComponent(saleUrl)}`;
    const r = await fetchText(api, {}, 35000);
    const text = htmlToText(r.body).slice(0, 8000);
    if (!text || /just a moment|verify you are human|access denied/i.test(text)) return null;
    // Not a real sale page (no market listing for this domain) → nothing to detect.
    if (!/bid|sold|market|from\s/i.test(text)) return null;
    const { handle, sold, bidders } = parseWinner(text);
    if (!handle) return null;
    return { handle, sold: !!sold, bidders, sale_url: saleUrl };
  } catch {
    return null;
  }
}

export default { detectNamecheapAuction };
