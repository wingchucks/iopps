import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as destination from '../src/lib/application-destination.ts';
test('application destinations validate URLs and preserve organization email routing', () => {
  assert.equal(typeof destination.resolveApplicationDestination, 'function');
  const resolve = destination.resolveApplicationDestination;
  assert.equal(resolve({applicationUrl:'javascript:alert(1)'},'role').kind,'unavailable');
  assert.equal(resolve({applicationUrl:'https://'},'role').kind,'unavailable');
  assert.equal(resolve({applicationUrl:'https://example.com/apply'},'role').kind,'external');
  assert.equal(resolve({applicationUrl:'http://example.com'},'role').kind,'external');
  assert.equal(resolve({applicationUrl:'jobs@example.com'},'role').href,'mailto:jobs@example.com');
  assert.equal(resolve({applicationUrl:'mailto:bad'},'role').kind,'unavailable');
  assert.equal(resolve({applicationUrl:'jobs@example.com',orgId:'org'},'role').href,'/jobs/role/apply');
  assert.equal(resolve({orgId:'org'},'role').kind,'internal');
});
