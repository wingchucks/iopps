import test from 'node:test';
import assert from 'node:assert/strict';
import * as links from '../src/lib/auth-verification-email.ts';

test('app-owned reset email targets branded action without changing issued code', () => {
  const build = (links as unknown as { buildBrandedPasswordResetLink: (site: string, link: string) => string }).buildBrandedPasswordResetLink;
  assert.equal(typeof build, 'function');
  const result = new URL(build('https://iopps.ca', 'https://iopps-c2224.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=fictional-code&continueUrl=https%3A%2F%2Fiopps.ca%2Flogin'));
  assert.equal(result.origin + result.pathname, 'https://iopps.ca/auth/action');
  assert.equal(result.searchParams.get('oobCode'), 'fictional-code');
  assert.equal(result.searchParams.get('mode'), 'resetPassword');
  assert.equal(result.searchParams.get('continueUrl'), 'https://iopps.ca/login');
  assert.throws(() => build('https://iopps.ca', 'bad-secret-input'), error => !JSON.stringify(error).includes('bad-secret-input'));
  assert.throws(() => build('https://iopps.ca', 'https://example.test/?mode=verifyEmail&oobCode=fictional'));
});
