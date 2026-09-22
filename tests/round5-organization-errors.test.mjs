import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

const base = { uid: 'qa-round5-fictional', kind: 'employer_upgrade', name: 'Fictional Northern Services', contactName: 'Fictional Contact', contactEmail: 'owner@example.invalid', formStartedAt: Date.now() - 10000 };
function database() {
  const rows = new Map();
  return { collection(name) { return { doc(id) { return { key: name + '/' + id }; }, async add() {} }; }, async runTransaction(fn) { return fn({ async getAll(...refs) { return refs.map(ref => ({ exists: rows.has(ref.key), data: () => rows.get(ref.key) })); }, set(ref, value) { rows.set(ref.key, value); } }); } };
}
test('disposable contact rejection exposes actionable safe code and preserves server denial', async () => {
  const { evaluateEmployerSignupProtection } = sourceModule('src/lib/server/signup-protection.ts');
  const result = await evaluateEmployerSignupProtection(database(), { ...base, contactEmail: 'fictional@mailinator.com' });
  assert.equal(result.allow, false);
  assert.equal(result.hardBlock, true);
  assert.equal(result.code, 'CONTACT_EMAIL_NOT_SUPPORTED');
});
test('permanent contact is accepted and existing fourth same-email limit remains enforced', async () => {
  const { evaluateEmployerSignupProtection } = sourceModule('src/lib/server/signup-protection.ts');
  const db = database();
  for (let index = 0; index < 3; index++) assert.equal((await evaluateEmployerSignupProtection(db, base)).allow, true);
  const result = await evaluateEmployerSignupProtection(db, base);
  assert.equal(result.status, 429);
  assert.equal(result.code, 'ORGANIZATION_RATE_LIMITED');
});
test('public error mapper accepts only allowlisted codes, never server/provider text', () => {
  const { organizationSetupError } = sourceModule('src/lib/organization-setup-error.ts');
  assert.match(organizationSetupError(403, { code: 'CONTACT_EMAIL_NOT_SUPPORTED' }), /temporary|disposable/i);
  assert.match(organizationSetupError(403, { code: 'CONTACT_EMAIL_NOT_SUPPORTED' }), /permanent/i);
  assert.match(organizationSetupError(403, { code: 'SECURITY_CHECK_FAILED' }), /browser security/i);
  assert.doesNotMatch(organizationSetupError(403, { code: 'secret-provider-detail', error: 'secret-provider-detail' }), /secret-provider-detail/);
});
test('known temporary contact can be blocked before spending a server attempt', () => {
  const { organizationContactEmailError } = sourceModule('src/lib/organization-setup-error.ts');
  assert.match(organizationContactEmailError(' QA@Mailinator.com '), /permanent/i);
  assert.match(organizationContactEmailError('qa@sharklasers.com'), /permanent/i);
  assert.equal(organizationContactEmailError('owner@example.invalid'), '');
});
