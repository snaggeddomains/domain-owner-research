// Network-free unit tests for the pure triangulation logic. Run: node --test lib/owner/crack.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintMatch } from './crack.js';

test('fingerprintMatch — identical Cloudflare account pair is the strongest match', () => {
  const cf = ['noah.ns.cloudflare.com', 'ashley.ns.cloudflare.com'];
  const r = fingerprintMatch(cf, [...cf].reverse());
  assert.equal(r.match, 'exact');
  assert.equal(r.strength, 3);
});

test('fingerprintMatch — identical custom NS pair (non-Cloudflare) is a strong exact match', () => {
  const ns = ['dns1.acmehost.net', 'dns2.acmehost.net'];
  const r = fingerprintMatch(ns, ns);
  assert.equal(r.match, 'exact');
  assert.equal(r.strength, 2);
});

test('fingerprintMatch — partial overlap on a custom host is a weak match', () => {
  const r = fingerprintMatch(['a.customdns.io', 'b.customdns.io'], ['a.customdns.io', 'z.otherdns.io']);
  assert.equal(r.match, 'overlap');
  assert.equal(r.strength, 1);
  assert.deepEqual(r.shared, ['a.customdns.io']);
});

test('fingerprintMatch — generic/parking DNS is never an ownership signal', () => {
  const r = fingerprintMatch(['ns1.domaincontrol.com', 'ns2.domaincontrol.com'], ['ns1.domaincontrol.com', 'ns2.domaincontrol.com']);
  assert.equal(r.match, 'none');
  assert.equal(r.strength, 0);
});

test('fingerprintMatch — different nameservers do not match', () => {
  const r = fingerprintMatch(['a.foo.net'], ['b.bar.net']);
  assert.equal(r.match, 'none');
});

test('fingerprintMatch — a missing NS set is a non-match, not a crash', () => {
  assert.equal(fingerprintMatch([], ['a.foo.net']).match, 'none');
  assert.equal(fingerprintMatch(null, null).match, 'none');
});
