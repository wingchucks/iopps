import test from 'node:test';
import assert from 'node:assert/strict';
import { advisories, auditResult } from '../scripts/audit-dependencies.mjs';

// Shaped like `npm audit --json` (report version 2): the advisory sits on the vulnerable
// package, and the packages that depend on it name that package.
const report = (...found) => ({
  auditReportVersion: 2,
  vulnerabilities: Object.fromEntries(found.flatMap(via => [
    [via.name, { name: via.name, severity: via.severity, via: [via] }],
    [`uses-${via.name}`, { name: `uses-${via.name}`, severity: via.severity, via: [via.name] }],
  ])),
  metadata: {},
});
const braces = { source: 1, name: 'braces', severity: 'high', title: 'braces stack exhaustion', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', range: '<=3.0.3' };
const other = { source: 2, name: 'fictional-lib', severity: 'low', title: 'Fictional advisory', url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' };
const clean = report();

test('the listed braces advisory passes only while development tooling alone uses it', () => {
  const devOnly = auditResult(clean, report(braces));
  assert.deepEqual(devOnly.failures, []);
  assert.deepEqual(devOnly.excepted.map(advisory => advisory.id), ['GHSA-vfj7-8cjw-p6xm']);
  assert.deepEqual(devOnly.unused, []);
  assert.deepEqual(auditResult(report(braces), report(braces)).failures.map(advisory => advisory.id), ['GHSA-vfj7-8cjw-p6xm']);
});

test('any other advisory fails at any severity, in development dependencies too', () => {
  assert.deepEqual(auditResult(clean, report(braces, other)).failures.map(advisory => advisory.id), ['GHSA-aaaa-bbbb-cccc']);
  assert.deepEqual(auditResult(report(other), report(other)).failures.length, 1);
});

test('a failed audit fails closed, and an exception npm no longer reports is flagged', () => {
  assert.throws(() => advisories({ error: { code: 'ENOAUDIT', summary: 'registry unavailable' } }), /no report/);
  assert.throws(() => advisories(null), /no report/);
  assert.throws(() => advisories({ auditReportVersion: 2 }), /no report/);
  assert.deepEqual(auditResult(clean, clean), { failures: [], excepted: [], unused: ['GHSA-vfj7-8cjw-p6xm'] });
});
