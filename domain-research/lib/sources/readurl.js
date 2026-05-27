import { fetchText } from '../util.js';

// Fetch a single web page and return its readable text, so the agent can READ a
// result (Quora, LinkedIn, NameBio, a seller portfolio page) and extract the
// owner's name/email/sale detail — instead of relying on a search snippet. Free.
function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export default {
  name: 'read_url',
  description:
    'Fetch one web page and return its readable text (title + main content) so you can READ it rather than rely on ' +
    "a search snippet — e.g. open a Quora / LinkedIn / NameBio / seller-portfolio page to extract the owner's real " +
    'name, email, or a sale detail. Provide the full http(s) URL. Pairs with web_search/brave_search: search, then ' +
    'read the most promising result. Auto-retries JS/bot-walled pages (Quora, LinkedIn) with rendering when available.',
  parameters: {
    type: 'object',
    properties: { url: { type: 'string', description: 'Full http(s) URL to fetch' } },
    required: ['url'],
  },
  async run({ url }, ctx = {}) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('Provide a full http(s) URL');
    const env = ctx.env || process.env || {};
    const isBlocked = (t) =>
      String(t).length < 600 &&
      /just a moment|enable javascript|attention required|verify you are human|captcha|cf-browser-verification|access denied|are you a robot|please enable cookies/i.test(t);
    const titleOf = (html) => {
      const m = (html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    };

    const resp = await fetchText(url, {}, 10000);
    let status = resp.status;
    let title = titleOf(resp.body);
    let text = htmlToText(resp.body).slice(0, 6000);
    let blocked = isBlocked(text);
    let rendered = false;

    // Fallback: if a plain fetch is bot-walled (Quora/LinkedIn behind Cloudflare)
    // and Scrape.do is configured, re-fetch with JS rendering + the residential
    // anti-bot proxy (super=true), which is needed to clear Cloudflare challenges.
    if (blocked && env.SCRAPE_DO_API_KEY) {
      try {
        const api =
          `https://api.scrape.do/?token=${encodeURIComponent(env.SCRAPE_DO_API_KEY)}` +
          `&render=true&super=true&url=${encodeURIComponent(url)}`;
        const r2 = await fetchText(api, {}, 35000);
        const t2 = htmlToText(r2.body).slice(0, 6000);
        if (t2 && !isBlocked(t2) && t2.length > text.length) {
          text = t2;
          title = titleOf(r2.body) || title;
          status = r2.status || status;
          blocked = false;
          rendered = true;
        }
      } catch {
        /* keep the original blocked result */
      }
    }

    return {
      url,
      status,
      blocked,
      rendered,
      title,
      text: blocked ? '(page is JS/bot-walled — could not read even with rendering; rely on the search snippet instead)' : text,
    };
  },
};
