import { createClient } from '@supabase/supabase-js';

// Server-side client for the SEPARATE Supabase project that hosts the internal
// "Master Domain List" (our curated/owned domains). Distinct from both the main
// app DB (lib/db/supabase.js) and the naming universe (lib/db/supabase-naming.js).
// Mirrors the env-var contract used by lib/sources/masterlist.js.
let client = null;

function secretKey() {
  return (
    process.env.MASTERLIST_SUPABASE_SECRET_KEY ||
    process.env.MASTERLIST_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.MASTERLIST_SUPABASE_KEY
  );
}

export function isMasterlistDbConfigured() {
  return Boolean(process.env.MASTERLIST_SUPABASE_URL && secretKey());
}

export function getMasterlistDb() {
  if (!isMasterlistDbConfigured()) {
    throw new Error(
      'Master Domain List not configured — set MASTERLIST_SUPABASE_URL and a key ' +
        '(MASTERLIST_SUPABASE_SECRET_KEY or MASTERLIST_SUPABASE_SERVICE_ROLE_KEY)',
    );
  }
  if (!client) {
    client = createClient(process.env.MASTERLIST_SUPABASE_URL, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
