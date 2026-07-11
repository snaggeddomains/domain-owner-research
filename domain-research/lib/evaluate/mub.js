// MUB — "Made-Up Brandable" gate, ported from snagged-admin
// src/marketplace_pipeline/filters/mub.py so the research app grades a coined name
// by the SAME definition SNAP + auctions use (gold standard: "Ambrino"). A coinage
// only counts as "brandable" if it clears these gates; everything else is junk.
//
// Self-contained + deterministic:
//   * hard gates — pure string (banned letters c/k/x/q/y, soft-g, digraphs, double
//     letters, adjacent vowels, intervocalic s/l, back-vowel-before-cluster, terminal
//     i, valid onsets/clusters, 4-8 chars, 2-3 syllables),
//   * made-up — the caller's dictionary verdict (isWord); a real word is not coined,
//   * not negative/icky/suggestive — inline lexicon + edit-1 + sensitive-word rhyme,
//   * the Ambrino word-likeness floor — from the committed n-gram table (mubNgrams.js).
//
// isMub(sld, isWord) is the binary gate (SLD only — the caller splits the domain).

import NGRAMS from './mubNgrams.js';

const VOWELS = new Set('aeiou');
const CONS = new Set('bdfghjlmnprstvwz'); // c k x q y excluded (see PROFILE.md)
const ALLOWED = new Set([...VOWELS, ...CONS]);
const OK_ONSET2 = new Set(['bl', 'br', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sl', 'sm',
  'sn', 'sp', 'st', 'sw', 'tr', 'tw', 'th', 'sh', 'vr']);
const OK_TRIPLE = new Set(['mbr', 'ndr', 'ntr', 'str', 'ngl', 'mbl', 'ldr', 'mpr', 'ntl', 'nstr']);
const BAD_DIGRAPH = ['ph', 'gh', 'ck', 'wh', 'kn', 'gn', 'ps', 'pn', 'mn']; // 'ch' allowed (archmont)
// Clear two-syllable vowel hiatus that reads one way (lor-i-an, stud-io, vide-o).
const HIATUS_OK = new Set(['ia', 'io', 'eo', 'ua', 'uo']);

const NEG_SUBSTR = new Set([
  'doom', 'dumb', 'dum', 'pus', 'piss', 'pis', 'fart', 'crap', 'damn', 'hell', 'dead', 'die',
  'kill', 'sick', 'fail', 'loss', 'lose', 'scam', 'fraud', 'scum', 'slum', 'bum', 'rot', 'germ',
  'tox', 'mort', 'necro', 'vomit', 'vom', 'puke', 'puk', 'barf', 'gore', 'grim', 'dread', 'dire',
  'bleak', 'gloom', 'grief', 'hate', 'ugly', 'dirt', 'dung', 'decay', 'worm', 'leech', 'slug',
  'creep', 'sewer', 'trash', 'waste', 'junk', 'numb', 'dull', 'sour', 'war', 'bomb', 'drug',
  'debt', 'mold', 'muck', 'smut', 'scar', 'sore', 'pest', 'vile', 'grime', 'sludge', 'stink',
  'reek', 'stench', 'fetus', 'feces', 'anus', 'mucus', 'snot', 'turd', 'poop', 'butt', 'ass',
  'hag', 'curse', 'demon', 'devil', 'evil', 'sin', 'crime', 'jail', 'pain', 'ache', 'pox', 'wart',
  'scab', 'maim', 'slay', 'mourn', 'tomb', 'grave', 'rust', 'blight', 'plague', 'virus', 'fungus',
  'moron', 'idiot', 'dork', 'derp', 'lame', 'weak', 'sag', 'droop', 'murk', 'dreary',
]);
const NEG_WORDS = [
  'fetus', 'dumber', 'doomer', 'doom', 'gloom', 'tumor', 'sewer', 'vomit', 'feces', 'anus',
  'mucus', 'virus', 'fungus', 'bogus', 'puss', 'slum', 'scum', 'dumb', 'numb', 'grim', 'dire',
  'vile', 'sour', 'dull', 'sick', 'fail', 'loser', 'demon', 'devil', 'evil', 'curse', 'death',
  'dead', 'kill', 'hate', 'ugly', 'dirty', 'nasty', 'gross', 'creep', 'leech', 'slug', 'worm',
  'germ', 'toxic', 'poison', 'crime', 'jail', 'plague', 'blight', 'rotten', 'moldy', 'murky',
  'dreary', 'gloomy', 'moron', 'idiot', 'lamer', 'weaker', 'sadder', 'sicker', 'badder', 'damn',
];
const SENSITIVE = [
  'libido', 'herpes', 'semen', 'urine', 'penis', 'vagina', 'scrotum', 'phallus', 'gonad',
  'viagra', 'syphilis', 'feces', 'mucus', 'rectum', 'genital', 'areola', 'abscess', 'pustule',
];

// ---- word-likeness model (committed n-gram table) ----
const _BG = NGRAMS.bg || {};
const _TG = NGRAMS.tg || {};
const _BT = NGRAMS.bt || 1;
const _TT = NGRAMS.tt || 1;

function wordlike(s) {
  const p = `^${s}$`;
  const bs = [];
  for (let i = 0; i < p.length - 1; i++) bs.push(Math.log(((_BG[p.slice(i, i + 2)] || 0) + 1) / _BT));
  const ts = [];
  for (let i = 0; i < p.length - 2; i++) ts.push(Math.log(((_TG[p.slice(i, i + 3)] || 0) + 1) / _TT));
  const bAvg = bs.length ? bs.reduce((a, b) => a + b, 0) / bs.length : 0;
  const tAvg = ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : 0;
  return bAvg * 0.5 + tAvg * 0.5;
}

const _EASY = new Set('bdflmnprstv');
const _NICE_END = ['ino', 'ina', 'ano', 'ana', 'eno', 'ena', 'elo', 'ora', 'aro',
  'o', 'a', 'us', 'is', 'el', 'an', 'on'].sort((a, b) => b.length - a.length);

// composite clarity score (== scripts/tighten_brandables.py score()) — the Ambrino
// FLOOR is computed on this, not on raw word-likeness.
function clarityScore(s) {
  const syl = syllables(s);
  let sc = wordlike(s) * 8;
  sc += (new Set(s).size / s.length) * 10;
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  for (const [ch, v] of Object.entries(counts)) if (CONS.has(ch) && v > 1) sc -= (v - 1) * 2.5;
  sc += ({ 4: 4, 5: 7, 6: 7, 7: 5, 8: 2 })[s.length] || 0;
  sc += ({ 2: 6, 3: 5 })[syl] || 0;
  let noAdjCons = true;
  for (let i = 0; i < s.length - 1; i++) if (CONS.has(s[i]) && CONS.has(s[i + 1])) { noAdjCons = false; break; }
  if (noAdjCons) sc += 4;
  if (_NICE_END.some((e) => s.endsWith(e))) sc += 3;
  if (VOWELS.has(s[s.length - 1])) sc += 1.5;
  sc += Math.min(4, [...s].filter((c) => _EASY.has(c)).length) * 0.8;
  sc -= [...s].filter((c) => 'jwz'.includes(c)).length * 1.5;
  return sc;
}

// ---- structural helpers ----
function consRunsOk(s) {
  let i = 0;
  const n = s.length;
  while (i < n) {
    if (CONS.has(s[i])) {
      let j = i;
      while (j < n && CONS.has(s[j])) j += 1;
      const run = s.slice(i, j);
      if (run.length >= 4 || (run.length === 3 && !OK_TRIPLE.has(run))) return false;
      i = j;
    } else i += 1;
  }
  return true;
}

function onsetOk(s) {
  let k = 0;
  while (k < s.length && CONS.has(s[k])) k += 1;
  const onset = s.slice(0, k);
  if (onset.length <= 1) return true;
  return onset.length === 2 ? OK_ONSET2.has(onset) : false;
}

export function syllables(s) {
  return (s.match(/[aeiou]+/g) || []).length;
}

function editLe1(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let d = 0;
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) d += 1;
    return d === 1;
  }
  if (la > lb) { const t = a; a = b; b = t; }
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      diff += 1;
      if (diff > 1) return false;
      j += 1;
    } else { i += 1; j += 1; }
  }
  return true;
}

function negative(s) {
  for (const r of NEG_SUBSTR) if (s.includes(r)) return true;
  for (const w of NEG_WORDS) if (editLe1(s, w)) return true;
  for (const w of SENSITIVE) {
    if (s.length >= 4 && s.slice(-4) === w.slice(-4)) return true;
    if (editLe1(s, w)) return true;
  }
  return false;
}

function gatesOk(s) {
  if (!(s.length >= 4 && s.length <= 8)) return false;
  for (const ch of s) if (!ALLOWED.has(ch) && ch !== 'c') return false; // k x q y / anything odd
  for (let i = 0; i < s.length; i++) {
    if (s[i] === 'c' && (i + 1 >= s.length || s[i + 1] !== 'h')) return false; // 'c' only inside 'ch'
  }
  for (let i = 0; i < s.length - 1; i++) if (s[i] === s[i + 1]) return false; // no double letters
  if (s[s.length - 1] === 'i') return false; // brandi/brandy
  for (let i = 0; i < s.length - 1; i++) { // adjacent vowels
    if (VOWELS.has(s[i]) && VOWELS.has(s[i + 1]) && !HIATUS_OK.has(s.slice(i, i + 2))) return false;
  }
  for (let i = 0; i < s.length - 2; i++) { // never 3+ vowels in a row
    if (VOWELS.has(s[i]) && VOWELS.has(s[i + 1]) && VOWELS.has(s[i + 2])) return false;
  }
  let hasVowel = false;
  for (const ch of s) if (VOWELS.has(ch)) { hasVowel = true; break; }
  if (!hasVowel) return false;
  for (let i = 1; i < s.length - 1; i++) { // intervocalic s/l
    if ('sl'.includes(s[i]) && VOWELS.has(s[i - 1]) && VOWELS.has(s[i + 1])) return false;
  }
  for (let i = 0; i < s.length; i++) { // soft g
    if (s[i] === 'g' && i + 1 < s.length && 'ei'.includes(s[i + 1])) return false;
  }
  for (let i = 0; i < s.length; i++) { // back vowel before a PILE-UP (3+ cluster)
    if ('ou'.includes(s[i])) {
      let k = 0;
      let j = i + 1;
      while (j < s.length && CONS.has(s[j])) { k += 1; j += 1; }
      if (k >= 3) return false;
    }
  }
  for (const d of BAD_DIGRAPH) if (s.includes(d)) return false;
  if (!consRunsOk(s) || !onsetOk(s)) return false;
  if (!(syllables(s) >= 2 && syllables(s) <= 3)) return false;
  if (negative(s)) return false;
  return true;
}

// The clarity floor is calibrated to the LOWEST user-blessed example. Ambrino set the
// original bar; archmont is the current lowest good one.
const BLESSED = ['ambrino', 'batino', 'boga', 'ditora', 'pentero', 'lorian', 'archmont'];
let _floorCache = null;
function floor() {
  if (_floorCache == null) _floorCache = Math.min(...BLESSED.map(clarityScore));
  return _floorCache;
}

// True if the SLD is a MUB-grade coined name. `isWord` (the caller's dictionary
// verdict) stands in for the Python "made-up" check — a real dictionary word is not
// a coinage, so it's never MUB.
export function isMub(sld, isWord = false) {
  const s = String(sld || '').toLowerCase();
  if (!s || !/^[a-z]+$/.test(s)) return false;
  if (isWord) return false; // a real word is not "made up"
  if (!gatesOk(s)) return false;
  return clarityScore(s) >= floor();
}

export default { isMub, syllables };
