#!/usr/bin/env node
// Eval runner: assert that a deep-pass research run on a fixture domain
// surfaces the expected verified contacts. Each fixture lives in evals/fixtures/
// as <domain>.json with `expected_present.{emails, phones}`.
//
// A fresh run on a fixture is a REAL paid pass — it spends paid-API credits.
// Run one fixture at a time during development; reserve --all for periodic CI.
//
// Usage:
//   node evals/run.js ontask.ai              # one fixture
//   node evals/run.js ontask.ai example.com  # several
//   node evals/run.js --all                  # every fixture in evals/fixtures/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { research } from '../lib/agent.js';

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url)) + '/fixtures';

function normalizePhone(s) {
  return String(s || '').replace(/\D+/g, '');
}

function emailFound(report, email) {
  return (report || '').toLowerCase().includes(String(email).toLowerCase());
}

function phoneFound(report, phone) {
  // Compare digits-only so '+1 (214) 901-2140' and '12149012140' match.
  const want = normalizePhone(phone);
  if (!want) return false;
  const haystack = normalizePhone(report);
  return haystack.includes(want);
}

function loadFixtures() {
  if (!fs.existsSync(FIXTURES_DIR)) return [];
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, f), 'utf8')), _file: f }));
}

async function runOne(fix) {
  console.log(`\n▸ ${fix.domain}`);
  const t0 = Date.now();
  const result = await research({
    domain: fix.domain,
    question: '',
    env: process.env,
    tier: 'all', // deep pass — needed for paid sources (RocketReach lookup, etc.)
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const report = result.report || '';

  const wantEmails = (fix.expected_present && fix.expected_present.emails) || [];
  const wantPhones = (fix.expected_present && fix.expected_present.phones) || [];
  const missingEmails = wantEmails.filter((e) => !emailFound(report, e));
  const missingPhones = wantPhones.filter((p) => !phoneFound(report, p));
  const ok = missingEmails.length === 0 && missingPhones.length === 0;

  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}  (${elapsed}s)`);
  if (missingEmails.length) console.log(`    missing emails: ${missingEmails.join(', ')}`);
  if (missingPhones.length) console.log(`    missing phones: ${missingPhones.join(', ')}`);
  return { domain: fix.domain, ok, missingEmails, missingPhones, elapsed };
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const wanted = args.filter((a) => !a.startsWith('--'));
  const fixtures = loadFixtures();

  let toRun;
  if (all) toRun = fixtures;
  else if (wanted.length) toRun = fixtures.filter((f) => wanted.includes(f.domain));
  else {
    console.error('Usage: node evals/run.js <domain> [<domain>…] | --all');
    console.error('');
    console.error('Available fixtures:');
    for (const f of fixtures) console.error(`  ${f.domain}`);
    process.exit(2);
  }
  if (!toRun.length) {
    console.error(`No fixtures matched: ${wanted.join(', ')}`);
    process.exit(2);
  }
  if (!process.env.ANTHROPIC_API_KEY && (process.env.LLM_PROVIDER || 'claude').toLowerCase() === 'claude') {
    console.error('Missing ANTHROPIC_API_KEY in env. Source your .env first.');
    process.exit(2);
  }

  console.log(`Running ${toRun.length} deep-pass eval(s) — this spends real paid-API credits.`);
  const results = [];
  for (const fix of toRun) {
    try {
      results.push(await runOne(fix));
    } catch (e) {
      console.log(`  ✗ ERROR: ${e?.message || e}`);
      results.push({ domain: fix.domain, ok: false, error: String(e?.message || e) });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} passed.`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
