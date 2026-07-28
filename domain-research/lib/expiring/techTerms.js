// Curated AI / tech / science lexicon for the Expiring .ai watchlist.
//
// .ai is a technology/AI TLD, but our candidate universe is seeded from a general
// English dictionary — so we watch `gallbladder.ai` with the same weight as `neural.ai`.
// This lexicon does two things (see candidates.js):
//   1. BOOST — a dictionary word that's also a tech term gets scan PRIORITY, so the
//      names that actually matter on this TLD surface first (hours, not days).
//   2. EXPAND — terms here that AREN'T in the dictionary are seeded as new `<term>.ai`
//      candidates (jargon/coinages people register on .ai but that no wordlist has).
//
// We deliberately DON'T drop the dictionary words (Rob's call) — they're just scanned
// after the tech-relevant ones. Keep entries clean one-word, lowercase, 3–12 chars.
// Bump TECH_VERSION whenever the list changes so the cron re-seeds/re-prioritizes.

export const TECH_VERSION = 1;

const TERMS = [
  // ── AI / ML core ──────────────────────────────────────────────
  'neural', 'neuron', 'synapse', 'cortex', 'cognition', 'cognitive', 'reason', 'reasoning',
  'infer', 'inference', 'model', 'models', 'train', 'training', 'predict', 'prediction',
  'learn', 'learning', 'agent', 'agentic', 'prompt', 'prompts', 'token', 'tokens', 'embed',
  'embedding', 'tensor', 'vector', 'vectors', 'gradient', 'transformer', 'attention',
  'diffusion', 'generative', 'sentient', 'sentience', 'intelligence', 'intellect', 'brain',
  'mind', 'thought', 'perceive', 'perception', 'recognize', 'classify', 'cluster', 'label',
  'dataset', 'corpus', 'feature', 'weights', 'bias', 'epoch', 'fine', 'align', 'alignment',
  'reason', 'oracle', 'sage', 'muse', 'copilot', 'assistant', 'autonomy', 'autonomous',
  // ── Data / analytics ──────────────────────────────────────────
  'data', 'dataflow', 'query', 'schema', 'graph', 'graphs', 'node', 'nodes', 'index',
  'cache', 'stream', 'streams', 'pipeline', 'warehouse', 'lake', 'ingest', 'etl', 'metric',
  'metrics', 'signal', 'signals', 'insight', 'insights', 'analytics', 'analyze', 'dashboard',
  'report', 'pivot', 'aggregate', 'entropy', 'sample', 'series', 'tabular', 'relational',
  // ── Infra / dev / compute ─────────────────────────────────────
  'cloud', 'server', 'serverless', 'compute', 'runtime', 'kernel', 'compile', 'compiler',
  'deploy', 'container', 'cluster', 'orchestrate', 'scale', 'scaler', 'proxy', 'router',
  'route', 'socket', 'endpoint', 'gateway', 'webhook', 'api', 'stack', 'runtime', 'daemon',
  'thread', 'async', 'buffer', 'queue', 'worker', 'lambda', 'function', 'binary', 'byte',
  'bytes', 'bit', 'bits', 'code', 'coder', 'script', 'syntax', 'parser', 'lexer', 'debug',
  'commit', 'branch', 'merge', 'repo', 'build', 'render', 'engine', 'framework', 'module',
  'runtime', 'latency', 'throughput', 'uptime', 'sysadmin', 'devops', 'terminal', 'shell',
  // ── Security / crypto ─────────────────────────────────────────
  'cipher', 'crypto', 'encrypt', 'decrypt', 'hash', 'hashing', 'secure', 'secured', 'vault',
  'shield', 'sentinel', 'firewall', 'auth', 'identity', 'token', 'keychain', 'quantum',
  'zero', 'proof', 'ledger', 'chain', 'block', 'blocks', 'wallet', 'mint', 'stake', 'nonce',
  'exploit', 'threat', 'defense', 'breach', 'anomaly', 'malware', 'phishing', 'zeroday',
  // ── Web / product / platform ──────────────────────────────────
  'web', 'app', 'apps', 'platform', 'portal', 'console', 'studio', 'workspace', 'canvas',
  'flow', 'flows', 'launch', 'ship', 'deploy', 'stack', 'saas', 'plugin', 'widget', 'toolkit',
  'builder', 'creator', 'maker', 'automate', 'automation', 'workflow', 'integrate', 'sync',
  'connect', 'connector', 'bridge', 'hub', 'nexus', 'core', 'grid', 'mesh', 'fabric', 'layer',
  // ── Hardware / signals / robotics ─────────────────────────────
  'robot', 'robotic', 'bot', 'droid', 'sensor', 'sensors', 'circuit', 'chip', 'chips',
  'silicon', 'wafer', 'pixel', 'pixels', 'laser', 'radar', 'lidar', 'drone', 'drones',
  'nano', 'micro', 'photon', 'optic', 'optics', 'quantum', 'spectrum', 'frequency', 'pulse',
  'voltage', 'circuit', 'motor', 'servo', 'haptic', 'wearable', 'device', 'edge', 'iot',
  // ── Science / research ────────────────────────────────────────
  'science', 'research', 'lab', 'labs', 'axiom', 'theorem', 'proof', 'logic', 'logical',
  'matrix', 'algebra', 'calculus', 'geometry', 'topology', 'physics', 'chemistry', 'biology',
  'genome', 'genomic', 'protein', 'molecule', 'atom', 'atomic', 'fusion', 'plasma', 'orbit',
  'cosmos', 'stellar', 'nova', 'flux', 'catalyst', 'reaction', 'formula', 'equation',
  'hypothesis', 'empirical', 'quantify', 'simulate', 'simulation', 'discover', 'discovery',
  // ── Motion / brandable tech verbs ─────────────────────────────
  'boost', 'accelerate', 'velocity', 'momentum', 'thrust', 'ignite', 'spark', 'surge',
  'amplify', 'optimize', 'refine', 'evolve', 'evolution', 'adapt', 'adaptive', 'dynamic',
  'quantum', 'vertex', 'apex', 'zenith', 'summit', 'pinnacle', 'horizon', 'beacon', 'prism',
  'lumen', 'photon', 'echo', 'sonic', 'radial', 'orbital', 'helix', 'quasar', 'pulsar',
  // ── AI-adjacent business / fintech ────────────────────────────
  'fintech', 'ledger', 'invoice', 'payments', 'commerce', 'checkout', 'billing', 'revenue',
  'forecast', 'trading', 'quant', 'portfolio', 'exchange', 'settle', 'clearing', 'treasury',
];

// Deduped lowercase set + a length/one-word guard mirroring candidateSld.
const ONE_WORD = /^[a-z]+$/;
export const TECH_TERMS = new Set(
  TERMS.map((t) => String(t).toLowerCase().trim())
    .filter((t) => ONE_WORD.test(t) && t.length >= 3 && t.length <= 12),
);

// Scan priority for an SLD: 2 = tech-relevant (scan first), 0 = plain dictionary word.
export function techScore(sld) {
  return TECH_TERMS.has(String(sld || '').toLowerCase()) ? 2 : 0;
}

// The lexicon as `<term>.ai` candidate rows (priority 2). Used to SEED terms that aren't
// in the dictionary and to LIFT existing dictionary rows that are tech-relevant.
export function techLexiconRows() {
  return [...TECH_TERMS].map((sld) => ({ domain: `${sld}.ai`, sld, priority: 2 }));
}
