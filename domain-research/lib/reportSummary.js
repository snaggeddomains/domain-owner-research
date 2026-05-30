// Pulls the high-level outcome out of a finished report so the "report ready"
// email (and any future surface that needs a one-line bottom line) can show it
// without re-running the model.
//
// The report's PART 1 is always a fenced ```json block written by the agent;
// PART 2 is the Markdown that follows. We parse PART 1 defensively — if it's
// missing or malformed, every field comes back null and the caller falls back
// to a generic message rather than blowing up the notification.

const FENCE_RE = /```json\s*\n([\s\S]*?)\n```/i;

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Extract the fenced ```json block (the agent's PART 1) from the report body.
export function extractReportJson(markdown) {
  if (!markdown || typeof markdown !== 'string') return null;
  const m = markdown.match(FENCE_RE);
  if (!m) return null;
  return safeParseJson(m[1]);
}

function normalizeConfidence(c) {
  if (!c) return null;
  const s = String(c).trim().toLowerCase();
  if (s.startsWith('high')) return 'High';
  if (s.startsWith('med')) return 'Medium';
  if (s.startsWith('low')) return 'Low';
  return null;
}

// Owner types that mean "we actually identified someone" vs. "we did not".
const IDENTIFIED_TYPES = new Set(['active_company', 'former_operator', 'individual', 'domain_investor']);

// Pick the best primary-tier contact name (a real person/org we'd surface in
// the email subject). Falls back across tiers if "primary" is empty.
function pickPrimaryContact(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;
  const tiers = ['primary', 'secondary', 'tertiary'];
  for (const tier of tiers) {
    const inTier = contacts.filter((c) => c && c.tier === tier);
    const named = inTier.find((c) => c && (c.type === 'name' || c.type === 'org') && c.value);
    if (named) return { value: String(named.value).trim(), type: named.type, tier };
  }
  return null;
}

// Returns a normalized summary the email layer can consume directly:
//   { found, confidence, likelyOwner, ownerType, summary, primaryContact }
// `found` is true when we have a likely_owner or a primary-tier contact AND
// owner_type isn't "unknown"/"marketplace_only" (those map to "couldn't pin
// down the human/company owner").
export function summarizeReport(reportObj) {
  const empty = {
    found: false,
    confidence: null,
    likelyOwner: null,
    ownerType: null,
    summary: null,
    primaryContact: null,
  };
  const markdown = reportObj && reportObj.markdown;
  const json = extractReportJson(markdown);
  if (!json || typeof json !== 'object') return empty;

  const confidence = normalizeConfidence(json.confidence);
  const likelyOwner = json.likely_owner && String(json.likely_owner).trim() ? String(json.likely_owner).trim() : null;
  const ownerType = json.owner_type && typeof json.owner_type === 'string' ? json.owner_type.trim() : null;
  const summary = json.summary && String(json.summary).trim() ? String(json.summary).trim() : null;
  const primaryContact = pickPrimaryContact(json.contacts);

  const typeSaysFound = ownerType ? IDENTIFIED_TYPES.has(ownerType) : false;
  const typeSaysUnknown = ownerType === 'unknown';
  // A named likely_owner is the strongest signal; otherwise lean on owner_type.
  const found = Boolean(likelyOwner) && !typeSaysUnknown ? true : typeSaysFound;

  return { found, confidence, likelyOwner, ownerType, summary, primaryContact };
}
