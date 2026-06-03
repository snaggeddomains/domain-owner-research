#!/usr/bin/env node
// Static import/export resolver — catches the class of bug where a local module
// stops exporting a name that another file imports (a missing/renamed export),
// which makes the ESM module fail to link at runtime → an opaque 500. It does NOT
// execute code or need node_modules installed (so it runs in the sandbox), and it
// only checks RELATIVE (local) imports — package imports are left to npm.
//
// Usage: node scripts/check-imports.mjs   (exit 1 on any unresolved import)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['api', 'lib', 'scripts', 'evals'];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules') continue;
    const p = resolve(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.m?js$/.test(name)) out.push(p);
  }
  return out;
}

// Collect the set of names a module exports (best-effort static scan).
// Returns { names:Set, hasDefault:bool, starFrom:[resolvedPaths], permissive:bool }
function exportsOf(file, srcCache) {
  const src = srcCache.get(file) ?? srcCache.set(file, safeRead(file)).get(file);
  const names = new Set();
  let hasDefault = false;
  const starFrom = [];
  if (src == null) return { names, hasDefault, starFrom, permissive: true };

  // export function/const/let/var/class NAME
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export default
  if (/^\s*export\s+default\b/m.test(src)) hasDefault = true;
  // export { a, b as c }  (optionally `from '...'`)
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*(?:from\s*['"][^'"]+['"]\s*)?;?/g)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const as = seg.split(/\s+as\s+/);
      const exported = (as[1] || as[0]).trim();
      if (exported === 'default') hasDefault = true;
      else if (exported) names.add(exported);
    }
  }
  // export * from './x.js'  (and  export * as ns from ...)
  for (const m of src.matchAll(/export\s+\*(?:\s+as\s+[\w$]+)?\s+from\s*['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) starFrom.push(resolve(dirname(file), m[1]));
  }
  return { names, hasDefault, starFrom, permissive: false };
}

function safeRead(file) {
  try { return readFileSync(file, 'utf8'); } catch { return null; }
}

// Resolve the transitive export set, following `export * from` re-exports.
function resolvedExports(file, srcCache, seen = new Set()) {
  if (seen.has(file)) return { names: new Set(), hasDefault: false, permissive: false };
  seen.add(file);
  const base = exportsOf(file, srcCache);
  if (base.permissive) return { names: base.names, hasDefault: base.hasDefault, permissive: true };
  const names = new Set(base.names);
  let hasDefault = base.hasDefault;
  let permissive = false;
  for (const star of base.starFrom) {
    const child = resolvedExports(star, srcCache, seen);
    if (child.permissive) permissive = true;
    for (const n of child.names) names.add(n);
  }
  return { names, hasDefault, permissive };
}

// Parse the import statements in a file. Returns
// [{ source, names:[{imported, local}], default:bool, namespace:bool }]
function importsOf(src) {
  const out = [];
  const re = /import\s+(?:([\w$]+)\s*,?\s*)?(?:\*\s+as\s+([\w$]+)\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const [, def, ns, named, source] = m;
    const names = [];
    if (named) {
      for (const part of named.split(',')) {
        const seg = part.trim();
        if (!seg) continue;
        const as = seg.split(/\s+as\s+/);
        names.push({ imported: as[0].trim(), local: (as[1] || as[0]).trim() });
      }
    }
    out.push({ source, names, default: Boolean(def), namespace: Boolean(ns) });
  }
  return out;
}

function resolveLocal(fromFile, spec) {
  // Only relative specifiers; assume explicit extension (project style).
  const p = resolve(dirname(fromFile), spec);
  return p;
}

const srcCache = new Map();
const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const errors = [];

for (const file of files) {
  const src = safeRead(file);
  if (src == null) continue;
  for (const imp of importsOf(src)) {
    if (!imp.source.startsWith('.')) continue; // packages: npm's job
    const target = resolveLocal(file, imp.source);
    const targetSrc = safeRead(target);
    if (targetSrc == null) {
      errors.push(`${rel(file)} → cannot resolve local import '${imp.source}'`);
      continue;
    }
    const ex = resolvedExports(target, srcCache);
    if (ex.permissive) continue; // unreadable / dynamic — don't flag
    if (imp.default && !ex.hasDefault) {
      errors.push(`${rel(file)} imports a DEFAULT export from '${imp.source}', but it has none`);
    }
    for (const n of imp.names) {
      if (!ex.names.has(n.imported)) {
        errors.push(`${rel(file)} imports { ${n.imported} } from '${imp.source}', which does not export it`);
      }
    }
  }
}

function rel(p) { return relative(ROOT, p); }

if (errors.length) {
  console.error(`✗ import check failed (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ import check passed — ${files.length} files, all local imports resolve.`);
