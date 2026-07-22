import { fetchText } from '../util.js';

// Auto-detect the WINNING BIDDER handle from a Namecheap Market sale page. A domain
// that sold on Namecheap Market has a public sale page showing the bid history — the
// winner's marketplace username is a real owner lead. Namecheap is Cloudflare-walled,
// so this needs Scrape.do rendering (SCRAPE_DO_API_KEY). Fully best-effort.
//
// Two-hop: `namecheap.com/market/<domain>/` is the ACTIVE-listing URL; once a domain
// SOLD it lives at `/market/sale/<hash>/<domain>/` (a hash we don't have). So we read
// the market page, follow any sale-page link it exposes, and parse whichever page
// carries the bid history. The winner = the highest bidder (the sale price).

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

// A Namecheap marketplace handle: letters/digits/._- , 2–40 chars, not a chrome word.
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,38}[A-Za-z0-9])?$/;
const HANDLE_STOP = new Set(['the', 'this', 'sale', 'market', 'namecheap', 'seller', 'buyer', 'now',
  'here', 'our', 'your', 'price', 'bid', 'bids', 'from', 'bidder', 'bidders', 'time', 'usd', 'proxy',
  'history', 'ended', 'sold', 'extended', 'days', 'hours', 'minutes', 'seconds', 'creation', 'date',
  'keyword', 'extensions', 'taken', 'govalue', 'search', 'partner', 'buy', 'make', 'offer', 'view',
  // Checkout / buy-now / listing-summary labels — NOT bidders. "Subtotal $42,000" on an
  // active for-sale listing was being parsed as the top bid (piccolo.ai → wrong owner).
  'subtotal', 'total', 'buynow', 'cart', 'checkout', 'amount', 'listing', 'listings', 'listed',
  'tax', 'taxes', 'fee', 'fees', 'discount', 'shipping', 'order', 'quantity', 'qty', 'item',
  'items', 'purchase', 'payment', 'summary', 'watchlist', 'favorite', 'estimated']);
const clean = (h) => {
  const s = String(h || '').trim().replace(/\s*\(you\)\s*$/i, '').trim();
  return HANDLE_RE.test(s) && !HANDLE_STOP.has(s.toLowerCase()) ? s : null;
};

// Find the SOLD sale-page URL (`/market/sale/<hash>/<domain>/`) inside the market page
// HTML, so we can hop to the page that actually holds the bid history.
function findSaleUrl(html, domain) {
  const re = new RegExp(`/market/sale/[A-Za-z0-9]+/${domain.replace(/[.]/g, '\\.')}/?`, 'i');
  const m = String(html || '').match(re);
  return m ? `https://www.namecheap.com${m[0].replace(/\/?$/, '/')}` : null;
}

// Winner = the handle with the HIGHEST bid (= the sale price). Also collect the
// distinct bidders. Falls back to the price-adjacent "from <handle>" phrase.
function parseWinner(text) {
  const t = String(text || '');
  const sold = /\bSOLD\b/i.test(t) || /Ended on /i.test(t);
  // All "<handle> $<amount>" bid rows.
  const bids = [];
  const seen = new Set();
  for (const bm of t.matchAll(/([A-Za-z0-9._-]{2,40})\s*(?:\(you\))?\s*\$([\d,]+)/gi)) {
    const h = clean(bm[1]);
    const amt = Number(String(bm[2]).replace(/,/g, ''));
    if (h && Number.isFinite(amt)) bids.push({ h, amt });
  }
  let handle = null;
  let top = -1;
  for (const b of bids) { if (b.amt > top) { top = b.amt; handle = b.h; } }
  // Cross-check / fallback: the "$X from <handle>" line names the winner directly.
  const fm = t.match(/\$[\d,]+\s*(?:USD)?\s*from\s+([A-Za-z0-9._-]{2,40})/i) || t.match(/\bfrom\s+([A-Za-z0-9._-]{2,40})/i);
  const fromHandle = fm ? clean(fm[1]) : null;
  if (fromHandle) handle = fromHandle; // the explicit "from" line wins when present
  // Distinct bidder list (winner first).
  const order = [];
  if (handle && !seen.has(handle.toLowerCase())) { seen.add(handle.toLowerCase()); order.push(handle); }
  for (const b of bids) { if (!seen.has(b.h.toLowerCase())) { seen.add(b.h.toLowerCase()); order.push(b.h); } if (order.length >= 8) break; }
  return { handle, sold, bidders: order.length ? `bidders: ${order.join(', ')}` : null };
}

async function scrape(url, key) {
  const api = `https://api.scrape.do/?token=${encodeURIComponent(key)}&render=true&super=true&url=${encodeURIComponent(url)}`;
  const r = await fetchText(api, {}, 35000);
  return r && r.body ? String(r.body) : '';
}
const blocked = (t) => !t || /just a moment|verify you are human|access denied|attention required/i.test(t);

// domain → { handle, sold, bidders, sale_url } | null. Only fires when Scrape.do is set.
export async function detectNamecheapAuction(domain, env = {}) {
  const key = env.SCRAPE_DO_API_KEY;
  const d = String(domain || '').trim().toLowerCase();
  if (!key || !d || !/\./.test(d)) return null;
  const marketUrl = `https://www.namecheap.com/market/${encodeURIComponent(d)}/`;
  try {
    // Hop 1: the market page (may itself hold the bid history, or link to the sale page).
    let html = await scrape(marketUrl, key);
    let usedUrl = marketUrl;
    let text = htmlToText(html).slice(0, 12000);
    if (blocked(text)) return null;
    let parsed = parseWinner(text);
    // Hop 2: if no winner yet, follow the /market/sale/<hash>/<domain>/ link.
    if (!parsed.handle) {
      const saleUrl = findSaleUrl(html, d);
      if (saleUrl && saleUrl !== usedUrl) {
        html = await scrape(saleUrl, key);
        text = htmlToText(html).slice(0, 12000);
        if (!blocked(text)) { usedUrl = saleUrl; parsed = parseWinner(text); }
      }
    }
    // Only attribute a WINNER when the page is an actually-SOLD auction. An active
    // for-sale LISTING (re-listed after a prior sale, e.g. piccolo.ai) has no winner —
    // its buy-now/subtotal price isn't a bid, so we'd otherwise mis-detect an owner.
    if (!parsed.handle || !parsed.sold) return null;
    return { handle: parsed.handle, sold: true, bidders: parsed.bidders, sale_url: usedUrl };
  } catch {
    return null;
  }
}

export default { detectNamecheapAuction };
