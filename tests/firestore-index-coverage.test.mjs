import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Equality + order queries need these composites in production. Removing one from
// firestore.indexes.json lets a forced index deploy delete it while the query still runs.
const required = [
  ['jobs', 'employerId', 'createdAt', 'DESCENDING', 'src/app/api/employer/dashboard/route.ts'],
  ['jobs', 'feedId', 'createdAt', 'DESCENDING', 'src/app/api/admin/feeds/[feedId]/route.ts'],
  ['cronLogs', 'feedId', 'timestamp', 'DESCENDING', 'src/app/api/admin/feeds/[feedId]/route.ts'],
  ['adminNotifications', 'read', 'createdAt', 'DESCENDING', 'src/app/api/admin/notifications/route.ts'],
  ['contentFlags', 'status', 'createdAt', 'DESCENDING', 'src/app/api/admin/moderation/route.ts'],
  ['contentFlags', 'severity', 'createdAt', 'DESCENDING', 'src/app/api/admin/moderation/route.ts'],
  ['users', 'role', 'createdAt', 'DESCENDING', 'src/app/api/admin/users/route.ts'],
  ['successStories', 'status', 'createdAt', 'DESCENDING', 'src/app/api/admin/stories/route.ts'],
  ['verificationRequests', 'status', 'submittedAt', 'DESCENDING', 'src/app/api/admin/verification/route.ts'],
  ['livestreams', 'status', 'startedAt', 'DESCENDING', 'src/app/api/admin/livestreams/route.ts'],
  ['vendors', 'verified', 'name', 'ASCENDING', 'src/app/api/admin/shop/route.ts'],
  ['vendors', 'flagged', 'name', 'ASCENDING', 'src/app/api/admin/shop/route.ts'],
  ['vendors', 'featured', 'name', 'ASCENDING', 'src/app/api/admin/shop/route.ts'],
];

test('tracked indexes cover the equality + order queries used by current routes', () => {
  const { indexes } = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8'));
  for (const [collectionGroup, filter, sort, direction, source] of required) {
    assert.ok(indexes.some(index => index.collectionGroup === collectionGroup && index.queryScope === 'COLLECTION' && index.fields.length === 2 &&
      index.fields[0].fieldPath === filter && index.fields[0].order === 'ASCENDING' &&
      index.fields[1].fieldPath === sort && index.fields[1].order === direction),
    `Missing ${collectionGroup}(${filter} ASC, ${sort} ${direction}) used by ${source}`);
  }
  const keys = indexes.map(index => JSON.stringify([index.collectionGroup, index.queryScope, index.fields]));
  assert.equal(new Set(keys).size, keys.length, 'Duplicate index entries');
});
