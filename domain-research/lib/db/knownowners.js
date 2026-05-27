import { getDb, isDbConfigured } from './supabase.js';

// Human-confirmed ownership corrections. This one table is three things at once:
//   1. a labeled eval set (the cases we've cracked),
//   2. a "known owners" cache that seeds future runs of the same domain,
//   3. a feedback log of where the report was right/wrong.
// One row per domain (upserted on the domain).
const TABLE = 'domain_research_known_owners';

const tableMissing = (e) =>
  /relation .* does not exist|does not exist|schema cache|PGRST205|42P01/i.test(String(e?.message || e?.code || e));

export async function getKnownOwner(domain) {
  if (!isDbConfigured() || !domain) return null;
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('domain,correct_owner,owner_type,correct_contact,notes,was_correct,updated_at')
      .eq('domain', domain)
      .maybeSingle();
    if (error) throw error;
    // Only a cache HIT when an actual confirmed owner was recorded.
    return data && data.correct_owner ? data : null;
  } catch (e) {
    if (!tableMissing(e)) console.error('getKnownOwner:', e?.message || e);
    return null;
  }
}

export async function saveOwnerFeedback({ domain, was_correct, correct_owner, owner_type, correct_contact, notes, run_id }) {
  if (!isDbConfigured() || !domain) return null;
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .upsert(
        {
          domain,
          was_correct: typeof was_correct === 'boolean' ? was_correct : null,
          correct_owner: correct_owner || null,
          owner_type: owner_type || null,
          correct_contact: correct_contact || null,
          notes: notes || null,
          run_id: run_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'domain' },
      )
      .select('id')
      .single();
    if (error) throw error;
    return data?.id || null;
  } catch (e) {
    if (!tableMissing(e)) console.error('saveOwnerFeedback:', e?.message || e);
    return null;
  }
}
