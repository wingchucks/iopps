import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
function fixture(user, signOut) {
  let cursor = 0; const slots = [], routes = [];
  const { default: Page } = sourceModule('src/app/logout/page.tsx', { mocks: {
    'react': {useState(value) {const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => {slots[i] = next;}];}},
    'next/navigation': {useRouter: () => ({replace: path => routes.push(path)})},
    'next/link': {default: 'a'},
    '@/lib/auth-context': {useAuth: () => ({user, loading:false, signOut})},
  }});
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  return { render() {cursor = 0; return nodes(Page());}, routes };
}
test('logout page exists and does not sign out merely on GET/render', () => {
  let calls = 0; const f = fixture({uid:'fictional'}, () => {calls++;});
  assert.ok(f.render().some(n => n.type === 'button'));
  assert.equal(calls, 0);
});
test('logout awaits sign-out before routing home', async () => {
  let finish; const gate = new Promise(resolve => finish=resolve);
  const f = fixture({uid:'fictional'}, () => gate);
  const pending = f.render().find(n => n.type === 'button').props.onClick();
  assert.deepEqual(f.routes, []);
  assert.equal(f.render().find(n => n.type === 'button').props.disabled, true);
  finish(); await pending;
  assert.deepEqual(f.routes, ['/']);
});
test('logout rejection stays retryable without claiming success', async () => {
  const f = fixture({uid:'fictional'}, async () => {throw new Error('fictional outage');});
  await f.render().find(n => n.type === 'button').props.onClick();
  const nodes = f.render();
  assert.deepEqual(f.routes, []);
  assert.ok(nodes.some(n => n.props?.role === 'alert'));
  assert.equal(nodes.find(n => n.type === 'button').props.disabled, false);
});
test('anonymous logout page offers home instead of a dead sign-out action', () => {
  const f = fixture(null, () => {throw new Error('unexpected signOut');});
  assert.equal(f.render().some(n => n.type === 'button'), false);
  assert.ok(f.render().some(n => n.props?.href === '/'));
});
