// TLD quality + SLD/TLD combo synergy — pure, no I/O. Powers the "extension"
// half of the quality score and the resale-liquidity read in the scoring model.
//
// The investment thesis is liquidity-first: a name only flips if SOMEONE on the
// open market wants it, and that depends heavily on the extension. .com is the
// only universally-liquid extension; .ai/.io/.co are strong-but-niche; most of
// the long tail is illiquid for resale regardless of how clean the SLD reads.
// Tiers + multipliers below are coarse on purpose — they're a defensible prior
// the comps + the LLM verdict refine, not a precise price.

// Resale-liquidity tiers for the extension itself. `mult` is a rough fair-value
// multiplier vs the same SLD on .com (the reference, 1.0). `liquidity` is a
// 0–1 read of how easily the extension resells at all (drives confidence, not
// just price). Keep this list explicit + tunable — change a number, not logic.
const TLD_TIERS = {
  // The reference standard — universally understood, the deepest resale market.
  com: { tier: 'premier', mult: 1.0, liquidity: 1.0, note: 'The standard — deepest, most liquid resale market.' },
  // AI boom extension: for the right one-word name it can rival or beat .com,
  // but the market is narrower (AI/tech buyers) so liquidity is lower than .com.
  ai: { tier: 'premium', mult: 0.85, liquidity: 0.8, note: 'Hot with AI/tech buyers; strong but narrower market than .com.' },
  io: { tier: 'premium', mult: 0.45, liquidity: 0.65, note: 'Established startup/tech extension; decent resale demand.' },
  co: { tier: 'premium', mult: 0.4, liquidity: 0.6, note: 'Common .com alternative; resells but at a discount.' },
  // Recognized but second-tier — real but thin resale demand.
  net: { tier: 'standard', mult: 0.18, liquidity: 0.4, note: 'Legacy extension; modest resale demand.' },
  org: { tier: 'standard', mult: 0.18, liquidity: 0.4, note: 'Nonprofit/association lean; modest resale demand.' },
  app: { tier: 'standard', mult: 0.22, liquidity: 0.45, note: 'Google extension; app/tech buyers.' },
  dev: { tier: 'standard', mult: 0.18, liquidity: 0.4, note: 'Developer-focused; niche resale.' },
  xyz: { tier: 'standard', mult: 0.12, liquidity: 0.3, note: 'Cheap, broad; low average resale.' },
  gg: { tier: 'standard', mult: 0.25, liquidity: 0.4, note: 'Gaming lean; niche but real.' },
  // Short ccTLDs that double as words/abbreviations and trade actively.
  me: { tier: 'standard', mult: 0.2, liquidity: 0.4, note: 'Personal-brand lean.' },
  tv: { tier: 'standard', mult: 0.2, liquidity: 0.4, note: 'Media/streaming lean.' },
  vc: { tier: 'niche', mult: 0.15, liquidity: 0.3, note: 'Venture lean; small but moneyed buyer pool.' },
};

// Everything not listed is treated as long-tail: real for end-users, but a thin
// resale market — priced low and discounted hard in the scoring model.
const DEFAULT_TLD = { tier: 'long_tail', mult: 0.08, liquidity: 0.2, note: 'Long-tail extension — thin resale market; value rests on a specific end-user.' };

export function tldQuality(tld) {
  const t = String(tld || '').toLowerCase().replace(/^\./, '');
  const base = TLD_TIERS[t] || DEFAULT_TLD;
  return { tld: t, ...base };
}

// SLD/TLD synergy — does the pair "read" as one idea? A domain hack or a phrase
// that completes across the dot ("get.it", "go.to", an "-ai" SLD on .ai) is more
// memorable + brandable than the parts alone; a redundant pair ("ai.ai", or an
// SLD that already ends in the extension word) reads slightly worse. Returns a
// small bonus/penalty in [-6, +8] points applied to the combo quality score, plus
// a human note when something fires.
const VERB_PREPOSITIONS = new Set(['it', 'to', 'me', 'us', 'in', 'at', 'so', 'by', 'up', 'on', 'go', 'we']);

export function comboSynergy(sld, tld) {
  const s = String(sld || '').toLowerCase();
  const t = String(tld || '').toLowerCase().replace(/^\./, '');
  let bonus = 0;
  const notes = [];

  // Domain-hack: the SLD + TLD form a real word/phrase (e.g. "get.it", "go.to",
  // "vi.sa"-style). Only credit when the extension is a short, word-like ccTLD —
  // otherwise every name "completes" trivially.
  if (VERB_PREPOSITIONS.has(t) && s.length <= 6 && /^[a-z]+$/.test(s)) {
    bonus += 6;
    notes.push(`Reads as a phrase across the dot (${s}.${t}).`);
  }

  // On-theme extension: an SLD whose MEANING matches the extension's audience
  // amplifies the name (a tech/science/AI concept on .ai is "tightly related" —
  // cloud.ai, particle.ai — and commands a premium; a word with little overlap —
  // dog.ai, lunch.ai — is just worth less on that TLD). Two strengths:
  //  • LITERAL match (the word IS an AI/dev token) → strong.
  //  • SEMANTIC match (a science/tech/data/compute concept) → strong; this is the
  //    relatedness the old literal regex missed.
  const LITERAL = {
    ai: /(^|[^a-z])(ai|ml|gpt|llm|bot|neural|mind|brain|intelligen|agent|model|cognit|reason|predict|infer|automat|robot)/,
    io: /(^|[^a-z])(app|dev|cloud|api|stack|code|byte|data|net|git|node|saas)/,
    tv: /(stream|watch|media|video|live|channel|show)/,
    gg: /(game|play|gg|esport|arena|guild|quest)/,
  };
  // Science / deep-tech / data / compute concepts that "read" as AI-adjacent.
  const AI_SEMANTIC = /(^|[^a-z])(particle|quantum|atom|photon|electron|neutron|proton|molecul|fusion|reactor|physic|science|chemi|genom|nano|micro|signal|vector|matrix|tensor|kernel|cipher|crypto|logic|cortex|neuron|synap|cloud|compute|comput|silicon|circuit|chip|processor|machine|engine|algorithm|graph|cluster|pixel|render|sentry|sentinel|oracle|nexus|cogn|percept|sense|vision|deep|smart|auto|flux|core|grid|node|spark|pulse|orbit|cosmos|nova|photon|laser|optic)/;
  if (LITERAL[t] && LITERAL[t].test(s)) {
    bonus += 10;
    notes.push(`SLD is on-theme for .${t}'s buyer pool.`);
  } else if (t === 'ai' && AI_SEMANTIC.test(s)) {
    bonus += 10;
    notes.push(`"${s}" is a science/tech concept — tightly related to .ai (amplifies value).`);
  }

  // Redundant / awkward pair: SLD already ends in the extension word (e.g.
  // "myai.ai"), or SLD == TLD ("ai.ai" is actually premium, exclude exact 2-char).
  if (s.length > 2 && s.endsWith(t) && s !== t) {
    bonus -= 3;
    notes.push(`SLD already ends in "${t}" — slightly redundant with the extension.`);
  }

  return { bonus: Math.max(-6, Math.min(12, bonus)), notes };
}

export default { tldQuality, comboSynergy };
