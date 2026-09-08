import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthRedirect } from '../src/lib/auth-redirect.ts';

test('sign-in return paths stay on this site and preserve the application route', () => {
  assert.equal(safeAuthRedirect('/jobs/example/apply?step=resume'), '/jobs/example/apply?step=resume');
  for (const value of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com']) assert.equal(safeAuthRedirect(value), null);
});
