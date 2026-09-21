import test from 'node:test';
import assert from 'node:assert/strict';
import { signOutFromFeed } from '../scripts/qa-browser-auth.mjs';

test('feed sign-out waits for its final anonymous navigation, not click dispatch', async () => {
  let finishSignOut;
  const finished = new Promise(resolve => { finishSignOut = resolve; });
  const events = [];
  const page = {
    waitForURL(predicate) {
      events.push('wait');
      assert.equal(predicate(new URL('http://127.0.0.1:1234/feed')), false);
      assert.equal(predicate(new URL('http://127.0.0.1:1234/login')), false);
      assert.equal(predicate(new URL('http://127.0.0.1:1234/')), true);
      return finished;
    },
    getByRole(role, options) {
      assert.equal(role, 'button');
      assert.deepEqual(options, { name: 'Sign out', exact: true });
      return { async click() { events.push('click'); } };
    },
  };
  let completed = false;
  const signingOut = signOutFromFeed(page).then(() => { completed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false, 'click completion must not permit login while session DELETE/Firebase sign-out is pending');
  assert.deepEqual(events, ['wait', 'click'], 'arm the navigation waiter before the action');
  finishSignOut();
  await signingOut;
  assert.equal(completed, true);
});

test('feed sign-out preserves a failed UI action as a failure', async () => {
  const error = new Error('sign-out button unavailable');
  await assert.rejects(signOutFromFeed({
    waitForURL: async () => {},
    getByRole: () => ({ click: async () => { throw error; } }),
  }), error);
});
