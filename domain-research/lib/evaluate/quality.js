// SLD (second-level domain) quality — pure scoring of how good the NAME itself
// is, independent of price or comps. This is the "is it a good domain" half; the
// comps/appraisal machinery is the "what is it worth" half. Kept deterministic +
// inspectable: every point is attributable to a named component, so the verdict
// can explain itself and a human can audit it.
//
// Components (each 0–100, then weighted):
//   length        — shorter is better (to a floor); very long SLDs tank.
//   dictionary    — a real word / known brand-word beats a coined string beats junk.
//   wordCount     — one word >> two >> three+; phrase domains resell poorly.
//   pronounce     — vowel/consonant balance + syllable load (say-it-hear-it-spell-it).
//   cleanliness   — hyphens and digits are resale poison; penalize hard.
// The combined 0–100 `score` modulates the comps-based valuation (a great name
// supports the high end of the comp range; a poor one pulls toward the low end).

import { comboSynergy, tldQuality } from './tld.js';
import { isMub } from './mub.js';

const VOWELS = 'aeiouy';

// Rough syllable estimate — count vowel groups, drop a silent trailing 'e'. Same
// heuristic family as the naming pipeline's countSyllables; good enough for a
// pronounceability read (we don't need linguistic precision).
export function syllables(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let count = 0;
  let prevVowel = false;
  for (const ch of w) {
    const isVowel = VOWELS.includes(ch);
    if (isVowel && !prevVowel) count += 1;
    prevVowel = isVowel;
  }
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

function lengthScore(len) {
  // 1–3 chars: ultra-premium. 4–6: excellent. 7–9: good. 10–12: ok. 13+: poor.
  if (len <= 3) return 100;
  if (len <= 6) return 90;
  if (len <= 9) return 72;
  if (len <= 12) return 52;
  if (len <= 15) return 34;
  return 18;
}

function wordCountScore(n) {
  if (n <= 1) return 100;
  if (n === 2) return 64;
  if (n === 3) return 36;
  return 18;
}

// Pronounceability: penalize long consonant runs, vowel-less strings, and a heavy
// syllable load. A clean CVC-ish flow scores high; "xqzrt" or "strengthsplan"
// score low. Coined-but-sayable names (the brandable sweet spot) still do well.
function pronounceScore(sld) {
  const s = String(sld || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return 30;
  const vowelCount = [...s].filter((c) => VOWELS.includes(c)).length;
  const vowelRatio = vowelCount / s.length;
  let score = 70;
  // Ideal vowel ratio ~0.35–0.5. Drift from that band costs points.
  if (vowelRatio >= 0.3 && vowelRatio <= 0.55) score += 18;
  else if (vowelRatio < 0.18 || vowelRatio > 0.7) score -= 25;
  // Longest consonant run.
  const longestConsonantRun = (s.match(/[^aeiouy]+/g) || []).reduce((m, r) => Math.max(m, r.length), 0);
  if (longestConsonantRun >= 4) score -= 22;
  else if (longestConsonantRun === 3) score -= 8;
  // Syllable load relative to length — too many syllables is a mouthful.
  const syl = syllables(s);
  if (syl <= 3) score += 8;
  else if (syl >= 5) score -= 12;
  return Math.max(5, Math.min(100, score));
}

// dictionaryClass: 'word' (a real dictionary word — the only class that can grade A),
// 'brandable' (a coined name that PASSES the MUB gate — premium-eligible but unproven),
// or 'junk' (a coinage that doesn't clear MUB / a random-looking string). The caller
// supplies isWord (async DB check) so this stays pure. A real word anchors real resale
// value; a MUB-brandable is a plausible startup name but has no proven demand; junk is
// a made-up string nobody is searching for.
function dictionaryScore(cls) {
  if (cls === 'word') return 100;
  if (cls === 'brandable') return 62;
  return 20;
}

function cleanlinessScore(sld) {
  const s = String(sld || '');
  let score = 100;
  if (s.includes('-')) score -= 45;             // hyphens kill resale value
  const digits = (s.match(/\d/g) || []).length;
  if (digits) score -= Math.min(55, 22 + digits * 10);
  return Math.max(5, score);
}

// Classify an SLD as word/brandable/junk given the dictionary verdict. `isWord`
// comes from the english_words check → a real word. A coinage is only 'brandable'
// if it passes the SAME MUB (Made-Up Brandable) gate SNAP + auctions use — a strict
// coined-.com standard (clean sound↔spelling, 2–3 syllables, Ambrino-grade clarity,
// no banned letters/digraphs). A sayable-but-not-MUB coinage (adfoz, ivorl) is junk,
// NOT brandable — "pronounceable" is not the bar; MUB is.
export function classifyDictionary(sld, isWord) {
  if (isWord) return 'word';
  return isMub(sld, false) ? 'brandable' : 'junk';
}

// Compute the full SLD/TLD quality breakdown.
//   sld    — second-level domain (no dot)
//   tld    — bare extension ("com")
//   isWord — boolean from the dictionary check (caller does the async lookup)
//   numWords — optional precomputed word count (from name_universe); else estimated
export function scoreQuality({ sld, tld, isWord = false, numWords = null }) {
  const s = String(sld || '').toLowerCase();
  const len = s.length;
  const cls = classifyDictionary(s, isWord);
  // Estimate word count when not supplied: count obvious camel/hyphen splits, else
  // assume one word for a dictionary word, otherwise guess from length+syllables.
  const wc = numWords != null ? numWords
    : (s.includes('-') ? s.split('-').filter(Boolean).length : (cls === 'word' ? 1 : Math.min(3, Math.max(1, Math.round(syllables(s) / 2.2)))));

  const components = {
    length: lengthScore(len),
    dictionary: dictionaryScore(cls),
    wordCount: wordCountScore(wc),
    pronounce: pronounceScore(s),
    cleanliness: cleanlinessScore(s),
  };
  // Weights sum to 1. Dictionary + length carry the most resale signal; pronounceability
  // is now a heavy input (a name you can't say doesn't brand) AND a hard gate below.
  const WEIGHTS = { length: 0.24, dictionary: 0.26, wordCount: 0.14, pronounce: 0.22, cleanliness: 0.14 };
  let sldScore = 0;
  for (const k of Object.keys(WEIGHTS)) sldScore += components[k] * WEIGHTS[k];

  const tldq = tldQuality(tld);
  const synergy = comboSynergy(s, tld);
  // Blend SLD quality with the extension: a great SLD on a long-tail TLD is still
  // capped by liquidity. The TLD contributes via its liquidity (how resellable the
  // pair is at all), not just price. 70% SLD craft, 30% extension liquidity, then
  // the synergy nudge.
  let combo = Math.max(0, Math.min(100, sldScore * 0.7 + tldq.liquidity * 100 * 0.3 + synergy.bonus));

  // Pronounceability is a HARD gate, not just a weighted input: a name you can't say
  // can't be a premium brand regardless of how short or dictionary-clean it is. Below a
  // sayability floor, knock the combined score down sharply (the lower the pron, the
  // harder the hit), and never grade an unsayable name A.
  const pron = components.pronounce;
  if (pron < 60) combo = Math.round(combo * Math.max(0.5, pron / 60));

  // Grade is MEANING-gated, not just craft-gated. Grade A is reserved for real
  // dictionary words (the only class with proven, searchable resale demand); a coined
  // name — however clean — can never be A. A MUB-grade brandable caps at B (premium,
  // but unproven); everything else (junk coinage) caps at C, and a poorly-formed name
  // still falls to D/F on its combined craft score.
  let grade;
  if (cls === 'word') {
    grade = (combo >= 80 && pron >= 62) ? 'A' : combo >= 66 ? 'B' : combo >= 50 ? 'C' : combo >= 34 ? 'D' : 'F';
  } else if (cls === 'brandable') {
    grade = combo >= 60 ? 'B' : combo >= 46 ? 'C' : combo >= 34 ? 'D' : 'F'; // MUB brandable: B ceiling
  } else {
    grade = combo >= 50 ? 'C' : combo >= 34 ? 'D' : 'F'; // junk coinage: C ceiling
  }

  return {
    sld: s,
    length: len,
    word_count: wc,
    dictionary_class: cls,
    components,
    sld_score: Math.round(sldScore),
    tld: tldq,
    synergy,
    score: Math.round(combo),
    grade,
  };
}

export default { scoreQuality, syllables, classifyDictionary };
