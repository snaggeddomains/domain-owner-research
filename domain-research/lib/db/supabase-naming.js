import { createClient } from '@supabase/supabase-js';

// Server-side client for the SEPARATE Supabase project that hosts the naming
// universe (name_universe table + master_domain_list FDW view). Distinct from
// lib/db/supabase.js, which talks to the main app DB (users, runs, etc.).
//
// Uses the service-role key so RLS is bypassed — this is internal tooling
// behind the app password + naming module permission, so no public surface.
let client = null;

function serviceKey() {
  return process.env.SUPABASE_NAMING_SERVICE_KEY || process.env.SUPABASE_NAMING_SECRET_KEY;
}

export function isNamingDbConfigured() {
  return Boolean(process.env.SUPABASE_NAMING_URL && serviceKey());
}

export function getNamingDb() {
  if (!isNamingDbConfigured()) {
    throw new Error('Naming Supabase not configured — set SUPABASE_NAMING_URL and SUPABASE_NAMING_SERVICE_KEY');
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_NAMING_URL, serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
