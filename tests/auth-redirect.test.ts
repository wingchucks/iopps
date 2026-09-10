import test from 'node:test';
import assert from 'node:assert/strict';
import * as authIntent from '../src/lib/auth-redirect.ts';
import { readFileSync } from 'node:fs';

test('auth handoffs retain safe return and plan intent without granting a plan', () => {
  assert.equal(typeof authIntent.authIntentHref, 'function');
  const query = new URLSearchParams({ redirect: '/jobs/example/apply?step=resume', plan: 'tier2' });
  const signup = authIntent.authIntentHref('/signup', query);
  const carried = new URLSearchParams(signup.split('?')[1]);
  assert.equal(carried.get('redirect'), query.get('redirect'));
  assert.equal(carried.get('plan'), 'tier2');
  assert.equal(authIntent.authIntentHref('/signup', new URLSearchParams({ redirect: '//evil.test', plan: 'fake' })), '/signup');
  assert.equal(authIntent.postSignupDestination(query, '/org/dashboard'), '/org/checkout?plan=tier2&redirect=%2Fjobs%2Fexample%2Fapply%3Fstep%3Dresume');
  assert.equal(authIntent.postSignupDestination(new URLSearchParams({ redirect: '/jobs/id/apply' }), '/setup'), '/jobs/id/apply');
});

import { safeAuthRedirect } from '../src/lib/auth-redirect.ts';

test('signup resume and reverse sign-in links keep intent without recreating an account', () => {
  const signup = readFileSync('src/app/signup/page.tsx', 'utf8');
  assert.ok(signup.includes('loginHref={authIntentHref("/login", searchParams)}'));
  assert.ok(signup.includes('const verificationDestination ='));
  assert.ok(signup.includes('if (user) {'));
  assert.ok(signup.includes('resume=organization'));
  const orgSignup = readFileSync('src/app/org/signup/page.tsx', 'utf8');
  assert.ok(orgSignup.includes('router.replace(authIntentHref("/login", searchParams))'), 'existing employers must pass login profile-readiness resolution before checkout');
  assert.ok(orgSignup.includes('href={authIntentHref("/login", searchParams)}'));
});

test('auth pages wire intent through signup, verification and onboarding', () => {
  const read = (p: string) => readFileSync(`src/${p}`, 'utf8');
  assert.match(read('app/login/page.tsx'), /href=\{authIntentHref\("\/signup", searchParams\)\}/);
  assert.match(read('app/login/page.tsx'), /authIntentHref\(`\/org\/onboarding/);
  assert.match(read('app/verify-email/page.tsx'), /safeAuthRedirect\(nextPath\)/);
  assert.match(read('app/verify-email/page.tsx'), /encodeURIComponent\(redirectPath\)/);
  for (const p of ['app/signup/page.tsx', 'app/org/signup/page.tsx', 'app/org/onboarding/page.tsx']) assert.match(read(p), /authIntentHref|postSignupDestination/);
  assert.match(read('components/PricingTabs.tsx'), /authIntentHref/);
});

test('sign-in return paths stay on this site and preserve the application route', () => {
  assert.equal(safeAuthRedirect('/jobs/example/apply?step=resume'), '/jobs/example/apply?step=resume');
  for (const value of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com']) assert.equal(safeAuthRedirect(value), null);
});
