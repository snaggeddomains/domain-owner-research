import { getDb, isDbConfigured } from './supabase.js';

// Server-side history for the standalone tools (Trademark, Appraisal), so the
// "recent 5" list and deeplinks persist across devices/sessions — exactly like
// research runs (and unlike browser localStorage, which mobile Safari evicts).
//
// Each (kind, query) is upserted, so re-running a query refreshes one row
// rather than piling up duplicates. Everything is best-effort: if the table is
// missing or Supabase is unconfigured, these no-op so a tool run never breaks.
const TABLE = 'domain_research_tool_lookups';

const tableMissing = (e) =>
  /relation .* does not exist|could not find the table|does not exist|schema cache|PGRST205|42P01/i.test(
    String(e?.message || e?.code || e),
  );

export async function saveToolLookup(kind, query, data) {
  if (!isDbConfigured() || !kind || !query) return null;
  try {
    const { data: row, error } = await getDb()
      .from(TABLE)
      .upsert({ kind, query, data, updated_at: new Date().toISOString() }, { onConflict: 'kind,query' })
      .select('id')
      .single();
    if (error) throw error;
    return row?.id || null;
  } catch (e) {
    if (!tableMissing(e)) console.error('saveToolLookup:', e?.message || e);
    return null;
  }
}

export async function listToolLookups(kind, limit = 5) {
  if (!isDbConfigured() || !kind) return [];
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('kind,query,updated_at')
      .eq('kind', kind)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    if (!tableMissing(e)) console.error('listToolLookups:', e?.message || e);
    return [];
  }
}

export async function getToolLookup(kind, query) {
  if (!isDbConfigured() || !kind || !query) return null;
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('kind,query,data,updated_at')
      .eq('kind', kind)
      .eq('query', query)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    if (!tableMissing(e)) console.error('getToolLookup:', e?.message || e);
    return null;
  }
}
