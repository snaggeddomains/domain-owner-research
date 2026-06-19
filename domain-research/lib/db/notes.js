// Per-domain user notes attached to a Domain Owner report.
//
// Free-text the user types at the bottom of a report. Keyed by DOMAIN (not run)
// so the notes persist across EVERY re-run — free, deep, deepen, regenerate, or a
// forced fresh research (which creates a new run id). They are stored separately
// from the generated report and are NEVER overwritten by a rerun, so a user's note
// stays hard-attached to the domain's report no matter how the report changes. On
// a rerun the agent also ingests them as authoritative context (see lib/agent.js).
//
// One-time migration: the `domain_research_notes` table in supabase/schema.sql
// (RLS auto-enabled by the trailing domain_research_% loop) on the research project.

import { getDb, isDbConfigured } from './supabase.js';

const TABLE = 'domain_research_notes';
const MAX_LEN = 20000;
const EMPTY = { notes: '', updated_at: null, updated_by: null };

const norm = (d) => String(d || '').trim().toLowerCase().replace(/^www\./, '');

// Best-effort read — returns empty notes when the DB/table is absent so the
// report never breaks over a missing note.
export async function getDomainNotes(domain) {
  const dom = norm(domain);
  if (!isDbConfigured() || !dom) return { ...EMPTY };
  try {
    const { data } = await getDb().from(TABLE).select('notes,updated_at,updated_by').eq('domain', dom).maybeSingle();
    if (!data) return { ...EMPTY };
    return { notes: data.notes || '', updated_at: data.updated_at || null, updated_by: data.updated_by || null };
  } catch {
    return { ...EMPTY };
  }
}

// Upsert the notes for a domain. Throws on a genuine write failure so the UI can
// surface it (with a clear message when the migration hasn't been run yet).
export async function saveDomainNotes(domain, notes, updatedBy) {
  const dom = norm(domain);
  if (!isDbConfigured()) throw new Error('Notes storage is not configured.');
  if (!dom) throw new Error('A valid domain is required.');
  const clean = String(notes || '').slice(0, MAX_LEN);
  const updated_at = new Date().toISOString();
  const { error } = await getDb()
    .from(TABLE)
    .upsert({ domain: dom, notes: clean, updated_at, updated_by: updatedBy || null }, { onConflict: 'domain' });
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message)) {
      throw new Error("Notes table isn't set up yet — run the domain_research_notes migration on the research project, then NOTIFY pgrst, 'reload schema'.");
    }
    throw new Error(error.message);
  }
  return { notes: clean, updated_at, updated_by: updatedBy || null };
}
