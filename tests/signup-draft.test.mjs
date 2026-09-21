import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(denied = false) {
  const data = new Map(), exports = {};
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/signup-draft.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, sessionStorage: denied ? new Proxy({}, { get() { throw Error('Storage denied'); } }) : storage });
  return { ...exports, data };
}
const draft = { role: 'community', orgType: '', step: 2, name: 'Fictional Name', email: 'fictional@example.invalid' };

test('draft storage is an explicit allowlist, never credentials, consent, tokens or files', () => {
  const f = fixture();
  f.saveSignupDraft({ ...draft, password: 'PRIVATE', confirmPassword: 'PRIVATE', consent: true, token: 'PRIVATE', files: ['PRIVATE'] }, 2000, 1000);
  const raw = f.data.get(f.SIGNUP_DRAFT_KEY);
  assert.doesNotMatch(raw, /PRIVATE|Fictional|fictional@example|name|email|password|consent|token|files/i);
  assert.deepEqual([...f.data.keys()], [f.SIGNUP_DRAFT_KEY]);
  assert.deepEqual(JSON.parse(raw), { version: 2, expiresAt: 2000, role: 'community', orgType: '', step: 2 });
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['version', 'expiresAt', 'role', 'orgType', 'step'].sort());
  assert.equal(f.readSignupDraft(1000).step, 2);
});
test('runtime-invalid saves purge the old slot without persisting free text', () => {
  const f = fixture();
  for (const invalid of [null, { ...draft, role: 'private@example.invalid' }, { ...draft, orgType: 'PRIVATE' },
    { ...draft, step: '2' }, { ...draft, step: 3 }, { ...draft, role: '' },
    { ...draft, role: 'organization', orgType: '' }, { ...draft, orgType: 'employer' }]) {
    f.data.set(f.SIGNUP_DRAFT_KEY, 'legacy PII');
    assert.doesNotThrow(() => f.saveSignupDraft(invalid, 2000, 1000));
    assert.equal(f.data.has(f.SIGNUP_DRAFT_KEY), false);
  }
  for (const expiry of [NaN, Infinity, '2000', 1000, 1000 + f.SIGNUP_DRAFT_TTL + 1]) {
    f.data.set(f.SIGNUP_DRAFT_KEY, 'legacy PII');
    f.saveSignupDraft(draft, expiry, 1000);
    assert.equal(f.data.has(f.SIGNUP_DRAFT_KEY), false);
  }
});
test('reads purge legacy PII, extra fields and malformed current drafts from the actual slot', () => {
  const f = fixture();
  assert.equal(f.SIGNUP_DRAFT_KEY, 'iopps:signup-draft:v1');
  const safe = { version: 2, expiresAt: 2000, role: 'community', orgType: '', step: 2 };
  const invalid = ['', 'null', '[]', 'true', '{', ...[
    { ...draft, version: 1, expiresAt: 2000 }, { ...safe, version: 1 },
    { ...safe, expiresAt: 999 }, { ...safe, expiresAt: 1000 + f.SIGNUP_DRAFT_TTL + 1 },
    { ...safe, expiresAt: '2000' }, { ...safe, role: 'admin' }, { ...safe, orgType: 'PRIVATE' },
    { ...safe, step: 3 }, { ...safe, step: '2' }, { ...safe, role: '' },
    { ...safe, role: 'organization' }, { ...safe, orgType: 'employer' },
    ...['name', 'email', 'password', 'confirmPassword', 'token', 'files', 'consent', 'unknown'].map(key => ({ ...safe, [key]: 'PRIVATE' })),
  ].map(JSON.stringify)];
  for (const raw of invalid) {
    f.data.set(f.SIGNUP_DRAFT_KEY, raw);
    f.data.set('unrelated', 'keep');
    assert.equal(f.readSignupDraft(1000), null, raw);
    assert.deepEqual([...f.data], [['unrelated', 'keep']], raw);
  }
});
test('role and step reload within thirty minutes without extending expiry', () => {
  const f = fixture(), now = 1000, expiresAt = now + f.SIGNUP_DRAFT_TTL;
  assert.equal(f.SIGNUP_DRAFT_TTL, 1800000);
  for (const fields of [
    { role: '', orgType: '', step: 1 }, { role: 'community', orgType: '', step: 2 },
    { role: 'organization', orgType: '', step: 1 },
    ...['employer', 'school'].map(orgType => ({ role: 'organization', orgType, step: 2 })),
  ]) {
    f.saveSignupDraft(fields, expiresAt, now);
    assert.deepEqual(JSON.parse(JSON.stringify(f.readSignupDraft(expiresAt - 1))), { version: 2, expiresAt, ...fields });
    f.saveSignupDraft(fields, expiresAt, now + 1000);
    assert.equal(f.readSignupDraft(expiresAt - 1).expiresAt, expiresAt);
    assert.equal(f.readSignupDraft(expiresAt), null);
    assert.equal(f.data.has(f.SIGNUP_DRAFT_KEY), false);
  }
});
test('storage denial is nonfatal and clearing removes only the signup draft', () => {
  const denied = fixture(true);
  assert.doesNotThrow(() => denied.saveSignupDraft(draft, 2000, 1000));
  assert.equal(denied.readSignupDraft(1000), null);
  assert.doesNotThrow(() => denied.clearSignupDraft());
  const f = fixture(); f.data.set('unrelated', 'keep');
  f.saveSignupDraft(draft, 2000, 1000); f.clearSignupDraft();
  assert.deepEqual([...f.data], [['unrelated', 'keep']]);
});
