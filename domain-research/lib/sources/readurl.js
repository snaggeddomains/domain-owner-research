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
    'read the most promising result.',
  parameters: {
    type: 'object',
    properties: { url: { type: 'string', description: 'Full http(s) URL to fetch' } },
    required: ['url'],
  },
  async run({ url }) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('Provide a full http(s) URL');
    const resp = await fetchText(url, {}, 10000);
    const titleM = (resp.body || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return {
      url,
      status: resp.status,
      title: titleM ? titleM[1].replace(/\s+/g, ' ').trim().slice(0, 200) : '',
      text: htmlToText(resp.body).slice(0, 6000),
    };
  },
};
