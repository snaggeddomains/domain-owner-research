import { getDb, isDbConfigured } from './supabase.js';

// Beeper watches — one row per (domain, user). The cron polls 'watching' rows.
const T = 'beeper_watches';
const tableMissing = (e) => /relation .* does not exist|does not exist|schema cache|PGRST205|42P01/i.test(String(e?.message || e?.code || e));

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
  };
  try {
    const { data, error } = await getDb().from(T).upsert(row, { onConflict: 'domain,user_id' }).select('*').single();
    if (error) throw error;
    return data || null;
  } catch (e) {
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
    return watches.map((w) => ({ ...w, submitted_by: w.user_id ? (labelById[w.user_id] || null) : null }));
  } catch (e) {
    if (!tableMissing(e)) console.error('listWatches:', e?.message || e);
    return [];
  }
}

// All rows the cron should poll (active watches across all users).
export async function activeWatches() {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await getDb().from(T).select('*').eq('status', 'watching').limit(2000);
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
