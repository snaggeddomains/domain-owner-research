import { createClient } from '@supabase/supabase-js';
import { getNamingDb, isNamingDbConfigured } from './supabase-naming.js';

// Server-side client for the zone-file index (`zone_domains`). This is a HUGE,
// periodically-refreshed reference dataset (CZDS zone files → one row per domain
// with its nameserver set), distinct in scale and lifecycle from the curated
// name_universe — so it gets its OWN Supabase project when configured
// (ZONE_SUPABASE_URL / ZONE_SUPABASE_SERVICE_KEY), isolating the heavy GIN
// index + bulk load from the live naming workload.
//
// Fallback: if a dedicated zone project isn't set up, transparently use the
// naming project — so small-TLD testing works with zero extra config and the
// switch to a dedicated project is a pure env-var change.
let client = null;

function zoneKey() {
  return process.env.ZONE_SUPABASE_SERVICE_KEY || process.env.ZONE_SUPABASE_SECRET_KEY;
}

// True when a DEDICATED zone project is configured (vs. falling back to naming).
export function isZoneProjectConfigured() {
  return Boolean(process.env.ZONE_SUPABASE_URL && zoneKey());
}

// True when the zone index is reachable at all (dedicated project OR naming fallback).
export function isZoneDbConfigured() {
  return isZoneProjectConfigured() || isNamingDbConfigured();
}

export function getZoneDb() {
  if (isZoneProjectConfigured()) {
    if (!client) {
      client = createClient(process.env.ZONE_SUPABASE_URL, zoneKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return client;
  }
  // No dedicated project — fall back to the naming project.
  return getNamingDb();
}
