import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using the SECRET key (bypasses RLS). Lazy: it is
// only constructed when first used, so the app still runs (free sources, etc.)
// when SUPABASE_URL / SUPABASE_SECRET_KEY aren't configured yet.
let client = null;

export function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function getDb() {
  if (!isDbConfigured()) {
    throw new Error('Supabase not configured — set SUPABASE_URL and SUPABASE_SECRET_KEY');
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
