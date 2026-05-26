import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using the SECRET key (bypasses RLS). Lazy: it is
// only constructed when first used, so the app still runs (free sources, etc.)
// when SUPABASE_URL / SUPABASE_SECRET_KEY aren't configured yet.
let client = null;

// Accept either env-var name for the privileged server-side key.
function secretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && secretKey());
}

export function getDb() {
  if (!isDbConfigured()) {
    throw new Error('Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
