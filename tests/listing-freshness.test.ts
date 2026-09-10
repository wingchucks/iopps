import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicJobRecordVisible } from '../src/lib/public-job-merge.ts';
import { hasJobExpired, sourceLifecyclePatch } from '../src/lib/server/job-expiration.ts';
const now = new Date('2026-09-08T05:30:00Z');

test('all structured cutoffs apply independently; future closingDate cannot mask expiresAt', () => {
  assert.equal(isPublicJobRecordVisible({active:true, closingDate:'2026-10-01', expiresAt:'2026-09-06'}, now), false);
  assert.equal(isPublicJobRecordVisible({active:true, applicationDeadline:'2026-09-06'}, now), false);
  assert.equal(isPublicJobRecordVisible({active:true, deadline:'2026-09-07'}, now), true);
});
test('description inference never overrides a structured extension or treats employment terms as deadlines', () => {
  for (const job of [
    {description:'Term ends August 31, 2026; may be extended'},
    {description:'Project deadline: August 28, 2026. Applications welcome.'},
    {description:'Employment term deadline is August 28, 2026.'},
    {description:'Application deadline: August 28, 2026. Open until filled.'},
    {description:'Deadline: August 28'},
    {description:'Deadline: August 28, 2026. Deadline: October 1, 2026'},
    {closingDate:'2026-10-01', description:'Deadline: August 28, 2026'},
    {closingDate:'Open until filled', description:'Deadline: August 28, 2026'},
    {description:'No closing date is available'},
  ]) assert.equal(isPublicJobRecordVisible({active:true,...job}, now), true, JSON.stringify(job));
});

test('calendar validation rejects impossible dates and preserves full named calendar days', () => {
  assert.equal(hasJobExpired('2026-02-30', now), false);
  assert.equal(hasJobExpired('February 30, 2026', now), false);
  assert.equal(hasJobExpired('September 7, 2026', now), false);
  assert.equal(hasJobExpired('September 7, 2026', new Date('2026-09-08T06:00:00Z')), true);
  assert.equal(isPublicJobRecordVisible({description:'Apply by February 30, 2026'}, now), true);
  assert.equal(isPublicJobRecordVisible({description:'Apply by August 28th, 2026'}, now), false);
});

test('source lifecycle evaluates descriptions and retained expiresAt before reopening', () => {
  assert.equal(sourceLifecyclePatch({description:'Deadline is August 28, 2026'}, {}, now).active, false);
  assert.equal(sourceLifecyclePatch({closingDate:'2026-10-01'}, {status:'expired', expirationReason:'closing_date', expiresAt:'2026-09-01'}, now).active, false);
  assert.equal(sourceLifecyclePatch({closingDate:'2026-10-01'}, {status:'archived'}, now).status, undefined);
});

test('explicit description-only application deadline hides an otherwise active job', () => {
  assert.equal(isPublicJobRecordVisible({active:true, status:'active', description:'Deadline is Friday, August 28, 2026'}, now), false);
});
