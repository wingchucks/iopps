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
  assert.doesNotMatch(raw, /PRIVATE|password|consent|token|files/i);
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['version', 'expiresAt', 'role', 'orgType', 'step', 'name', 'email'].sort());
  assert.equal(f.readSignupDraft(1000).step, 2);
});
test('fixed expiry rejects expired, malformed, overlong and forged advanced-step drafts', () => {
  const f = fixture();
  for (const invalid of ['null', '{', JSON.stringify({ ...draft, version: 1, expiresAt: 999 }),
    JSON.stringify({ ...draft, version: 1, expiresAt: 1000 + f.SIGNUP_DRAFT_TTL + 1 }),
    JSON.stringify({ ...draft, version: 1, expiresAt: 2000, step: 3 }),
    JSON.stringify({ ...draft, version: 1, expiresAt: 2000, name: 'x'.repeat(201) })]) {
    f.data.set(f.SIGNUP_DRAFT_KEY, invalid);
    assert.equal(f.readSignupDraft(1000), null);
    assert.equal(f.data.has(f.SIGNUP_DRAFT_KEY), false);
  }
  f.saveSignupDraft(draft, 2000, 1000);
  f.saveSignupDraft({ ...draft, name: 'Edited' }, 2000, 1500);
  assert.equal(f.readSignupDraft(2000), null);
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
