import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as policy from '../src/lib/auth-redirect.ts';

test('signup does not infer Indigenous identity or silently initiate a paid school plan', () => {
  for (const p of ['src/app/signup/page.tsx', 'src/app/org/signup/page.tsx']) {
    const source = readFileSync(p, 'utf8');
    assert.ok(source.includes('useState<BusinessIdentity>("not_specified")'), p);
  }
  const source = readFileSync('src/app/signup/page.tsx', 'utf8');
  assert.ok(!source.includes('useState("tier3")'));
  assert.ok(!source.includes('fetch("/api/stripe/checkout"'));
  assert.ok(source.includes('Choose a plan before continuing.'));
});

test('both signup forms use the same eight-character password policy', () => {
  assert.equal(typeof policy.signupPasswordError, 'function');
  assert.equal(policy.signupPasswordError(''), 'Password is required.');
  assert.equal(policy.signupPasswordError('1234567'), 'Password must be at least 8 characters.');
  assert.equal(policy.signupPasswordError('12345678'), null);
  for (const p of ['src/app/signup/page.tsx', 'src/app/org/signup/page.tsx']) {
    const source = readFileSync(p, 'utf8');
    assert.ok(source.includes('signupPasswordError(password)'), p);
    assert.ok(!source.includes('minLength={6}'), p);
  }
});
