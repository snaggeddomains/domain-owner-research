import { getDb, isDbConfigured } from './supabase.js';
import { cadenceInfo } from '../beeper/cadence.js';

// Beeper watches — one row per (domain, user). The cron polls 'watching' rows.
const T = 'beeper_watches';
const tableMissing = (e) => /relation .* does not exist|does not exist|schema cache|PGRST205|42P01/i.test(String(e?.message || e?.code || e));
// The `expiration` column is a later addition — detect "column not found" so a
// write can retry without it before the one-time migration is run.
const columnMissing = (e) => /could not find the .* column|column .* does not exist|PGRST204|42703/i.test(String(e?.message || e?.code || e));

export function beeperConfigured() { return isDbConfigured(); }

export async function addWatch({ domain, userId, note = null, seed = null }) {
  if (!isDbConfigured() || !domain) return null;
  const row = {
    domain: String(domain).toLowerCase().trim(),
    user_id: userId || null,
    status: 'watching',
    note: note ? String(note).slice(0, 280) : null,
    last_status: seed && seed.ok ? seed.statuses : null,
    last_http: seed && seed.ok ? seed.code : null,
    last_checked: seed && seed.ok ? new Date().toISOString() : null,
    // Seed the expiration so the adaptive cadence can classify this watch
    // immediately (best-effort column — stripped + retried if not yet migrated).
    ...(seed && seed.ok && seed.expiration ? { expiration: seed.expiration } : {}),
  };
  try {
    const { data, error } = await getDb().from(T).upsert(row, { onConflict: 'domain,user_id' }).select('*').single();
    if (error) throw error;
    return data || null;
  } catch (e) {
    if (columnMissing(e) && 'expiration' in row) {
      const { expiration, ...rest } = row;
      try {
        const { data, error } = await getDb().from(T).upsert(rest, { onConflict: 'domain,user_id' }).select('*').single();
        if (error) throw error;
        return data || null;
      } catch (e2) {
        if (!tableMissing(e2)) console.error('addWatch:', e2?.message || e2);
        return null;
      }
    }
    if (!tableMissing(e)) console.error('addWatch:', e?.message || e);
    return null;
  }
}

// Short label for who started a watch — capitalized email local-part
// (rob@snagged.com → "Rob"). Null when unknown (legacy/seeded rows).
function submitterLabel(email) {
  const e = String(email || '').trim();
  if (!e || e === 'legacy-admin') return null;
  const local = e.split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
}

// UNIVERSAL list — every user's watches (it's a shared team watchlist), each
// decorated with `submitted_by` (who started it) for the UI chip.
export async function listWatches() {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await getDb().from(T).select('*')
      .order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    const watches = data || [];
    // Resolve submitter labels in one batched lookup over the user ids present.
    const ids = [...new Set(watches.map((w) => w.user_id).filter(Boolean))];
    const labelById = {};
    if (ids.length) {
      try {
        const { data: us } = await getDb().from('domain_research_users').select('id,email').in('id', ids);
        for (const u of us || []) labelById[u.id] = submitterLabel(u.email);
      } catch { /* best-effort — chips just stay blank if the lookup fails */ }
    }
    const now = Date.now();
    return watches.map((w) => ({
      ...w,
      submitted_by: w.user_id ? (labelById[w.user_id] || null) : null,
      // Adaptive-cadence summary for the UI (tier / label / next check / days-to-expiry).
      cadence: cadenceInfo(w, now),
    }));
  } catch (e) {
    if (!tableMissing(e)) console.error('listWatches:', e?.message || e);
    return [];
  }
}

// All rows the cron should poll (active watches across all users). Includes
// 'pending_drop' — a watch mid drop-confirmation (saw one RDAP not-found) MUST
// stay in the polled set so the second, confirming check actually lands;
// otherwise it freezes at "confirming drop…" forever and the drop never alerts.
export async function activeWatches() {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await getDb().from(T).select('*').in('status', ['watching', 'pending_drop']).limit(2000);
    if (error) throw error;
    return data || [];
  } catch (e) {
    if (!tableMissing(e)) console.error('activeWatches:', e?.message || e);
    return [];
  }
}

export async function updateWatch(id, patch) {
  if (!isDbConfigured() || !id) return;
  try {
    const { error } = await getDb().from(T).update(patch).eq('id', id);
    if (error) throw error;
  } catch (e) {
    if (columnMissing(e) && 'expiration' in patch) {
      // Pre-migration: drop the new column and still persist last_checked/status.
      const { expiration, ...rest } = patch;
      try { const { error } = await getDb().from(T).update(rest).eq('id', id); if (error) throw error; return; }
      catch (e2) { if (!tableMissing(e2)) console.error('updateWatch:', e2?.message || e2); return; }
    }
    if (!tableMissing(e)) console.error('updateWatch:', e?.message || e);
  }
}

export async function stopWatch(id, userId) {
  if (!isDbConfigured() || !id) return;
  try {
    let q = getDb().from(T).delete().eq('id', id);
    if (userId) q = q.eq('user_id', userId);
    const { error } = await q;
    if (error) throw error;
  } catch (e) {
    if (!tableMissing(e)) console.error('stopWatch:', e?.message || e);
  }
}
