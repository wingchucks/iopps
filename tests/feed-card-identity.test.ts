import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueFeedItems, freshFeedItems } from '../src/lib/feed-card-identity.ts';
test('canonical job IDs dedupe overlapping pages/sources without collapsing equal titles or other types', () => {
  const a = { id: 'canonical-a', type: 'job', title: 'Nurse' };
  const b = { id: 'canonical-b', type: 'job', title: 'Nurse' };
  const event = { id: a.id, type: 'event' };
  const pages = [[a, b], [{ ...a }, event, { id: 'story-a', type: 'story' }]];
  assert.deepEqual(uniqueFeedItems(pages.flat()), [a, b, event, { id: 'story-a', type: 'story' }]);
});
test('a featured job appears once across featured and fresh card sections', () => {
  const a = { id: 'a', type: 'job' }, b = { id: 'b', type: 'job' }, event = { id: 'a', type: 'event' };
  assert.deepEqual(freshFeedItems([a, b, event], [a]), [b, event]);
});
