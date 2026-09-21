import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authErrorMessage } from '../src/lib/auth-errors.ts';
import { jobArea } from '../src/lib/job-discovery.ts';

test('explicit signup already-in-use errors explain how to recover the existing account', () => {
  assert.equal(authErrorMessage({code:'auth/email-already-in-use'}), 'This email is already registered. Please sign in or reset your password.');
  assert.doesNotMatch(authErrorMessage({code:'auth/user-not-found'}), /registered|exists/i);
});

test('job area uses editorial taxonomy, never raw feed departments', () => {
  assert.equal(jobArea({department:'North 0134 - Ops',category:'Health & Wellness'} as never), 'Health & Wellness');
  assert.equal(jobArea({department:'Raw payroll unit'} as never), '');
  assert.equal(jobArea({category:'Raw payroll unit'} as never), '');
});
test('application status counts have explicit textual spacing', () => {
  const source = readFileSync('src/app/applications/page.tsx','utf8');
  assert.ok(source.includes('{" "}{applications.filter('), 'CSS margin alone does not separate accessible text');
});

test('avatar edit is explicitly named and visible on keyboard focus', () => {
  const source = readFileSync('src/app/profile/page.tsx','utf8');
  assert.match(source,/aria-label="Edit profile photo"/);
  assert.match(source,/focus-visible:opacity-100/);
});
