import test from 'node:test';
import assert from 'node:assert/strict';
import { listingClosedOn, listingState } from '../src/lib/listing-lifecycle.ts';
import { formatListingDay, hasJobExpired, isJobRecordExpired } from '../src/lib/listing-freshness.ts';

test('a date-only deadline displays as that same day, not the day before', () => {
  assert.equal(formatListingDay('2026-09-10'), 'Sep 10, 2026');
  assert.equal(formatListingDay('Sep 10, 2026'), 'Sep 10, 2026');
  assert.equal(formatListingDay('2026-09-10', 'long'), 'September 10, 2026');
  assert.equal(formatListingDay(''), null);
  assert.equal(formatListingDay('Open until filled'), 'Open until filled');
});

const now = new Date('2026-09-25T18:00:00Z');

test('closed listings keep their page; removed or unpublished ones are unavailable', () => {
  assert.equal(listingState({ status: 'active', title: 'Open role' }, now), 'open');
  assert.equal(listingState({ status: 'active', expiresAt: '2026-09-01T00:00:00Z' }, now), 'closed');
  assert.equal(listingState({ status: 'active', closingDate: '2026-09-10' }, now), 'closed');
  assert.equal(listingState({ status: 'closed', active: false }, now), 'closed');
  assert.equal(listingState({ status: 'completed' }, now), 'closed');
  for (const status of ['deleted', 'removed', 'draft', 'archived', 'rejected', 'suspended', 'pending', 'something-new']) {
    assert.equal(listingState({ status, closingDate: '2026-09-10' }, now), 'unavailable', status);
  }
  assert.equal(listingState({ status: 'active', deletedAt: '2026-09-20T00:00:00Z' }, now), 'unavailable');
  assert.equal(listingState({ status: 'active', active: false }, now), 'unavailable', 'an unexplained inactive record is never shown');
  assert.equal(listingState({ status: 'active' }, now, { ended: true }), 'closed');
});

test('the closing date is the earliest passed deadline, else when it was closed', () => {
  assert.equal(listingClosedOn({ closingDate: '2026-09-10', expiresAt: '2026-09-20T00:00:00Z' }, now), '2026-09-10T12:00:00.000Z');
  assert.equal(listingClosedOn({ status: 'closed', closedAt: '2026-08-01T15:00:00Z' }, now), '2026-08-01T15:00:00.000Z');
  assert.equal(listingClosedOn({ status: 'active', closingDate: '2026-12-01' }, now), null);
});

test('abbreviated month deadlines expire (the FSIN "Sep 1, 2026" case)', () => {
  for (const value of ['Sep 1, 2026', 'Sept. 1, 2026', 'Apr 15, 2026', '1 Sep 2026', 'September 1, 2026']) assert.equal(hasJobExpired(value, now), true, value);
  for (const value of ['Dec 31, 2026', 'Ma 1, 2026', 'Foo 1, 2026', 'Open until filled']) assert.equal(hasJobExpired(value, now), false, value);
  assert.equal(isJobRecordExpired({ deadline: 'Sep 1, 2026' }, now), true);
});
