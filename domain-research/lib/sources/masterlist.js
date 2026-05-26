import { createClient } from '@supabase/supabase-js';
import { normalizeDomain, isValidDomain } from '../util.js';

// Our internal "Master Domain List" lives in a SEPARATE Supabase project from
// the Phase 1 run store, so it gets its own client + env vars. Table name has
// spaces/capitals, so it must be referenced verbatim.
const TABLE = 'Master Domain List';

let client = null;

function getClient(env) {
  const url = env.MASTERLIST_SUPABASE_URL;
  const key = env.MASTERLIST_SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Master Domain List not configured — set MASTERLIST_SUPABASE_URL and MASTERLIST_SUPABASE_SECRET_KEY');
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export default {
  name: 'masterlist_lookup',
  description:
    'Look up the domain in our internal "Master Domain List" (a private Supabase store of domains we track). ' +
    'When the domain is present this returns our recorded owner, price, source and category — a strong internal ' +
    'pointer to ownership. Exact-domain match only; a miss just means we have no internal record (not evidence ' +
    'about ownership either way).',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['MASTERLIST_SUPABASE_URL', 'MASTERLIST_SUPABASE_SECRET_KEY'],
  async run({ domain }, { env }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    const { data, error } = await getClient(env)
      .from(TABLE)
      .select('domain, owner, price, source, category, tld, created_at, updated_at')
      .eq('domain', d)
      .maybeSingle();

    if (error) throw new Error(`masterlist_lookup: ${error.message}`);
    if (!data) return { found: false, domain: d };
    return { found: true, ...data };
  },
};
