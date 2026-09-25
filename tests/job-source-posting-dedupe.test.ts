import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePublicJobRecords, publicJobIdentityKey } from '../src/lib/public-job-merge.ts';

const url = 'https://jobs.dayforcehcm.com/en-US/westlandcorp/CANDIDATEPORTAL/jobs/35569';
const base = { source: 'feed', status: 'active', active: true, employerId: 'westland', employerName: 'Westland Insurance Group Ltd.', title: 'Director, National Personal Lines - Digital Sales',
  externalUrl: url, publishedAt: '2026-07-08T07:00:00.000Z', description: 'Fictional description.', salary: '$105,000–$131,000', salaryRange: { min: 105000, max: 131000 } };
// The four live copies found on 2026-09-25: one posting, re-imported daily with its locations reordered.
const copies = [
  { ...base, id: 'import-a', location: 'Toronto, ON, CA; Surrey, BC, CA; Calgary, AB, CA; AB, CA; ON, CA', createdAt: '2026-09-24T08:01:43.602Z' },
  { ...base, id: 'import-b', location: 'Calgary, AB, CA; Surrey, BC, CA; Toronto, ON, CA; AB, CA; ON, CA', createdAt: '2026-09-23T08:01:44.466Z' },
  { ...base, id: 'import-c', location: 'Surrey, BC, CA; Calgary, AB, CA; Toronto, ON, CA; AB, CA; ON, CA', createdAt: '2026-09-22T08:01:49.305Z' },
  { ...base, id: 'legacy-d', location: 'Surrey, BC, CA; Toronto, ON, CA; Calgary, AB, CA; ON, CA; AB, CA', createdAt: '2026-09-08T05:29:35.189Z' },
];

test('re-imports of one posting that only reorder the location list show once', () => {
  assert.equal(mergePublicJobRecords(copies, []).length, 1);
  // Identical structured salary ranges match regardless of key order.
  assert.equal(mergePublicJobRecords([copies[0], { ...copies[1], salaryRange: { max: 131000, min: 105000 } }], []).length, 1);
  assert.equal(new Set(copies.map(publicJobIdentityKey)).size, 1);
});

test('genuinely separate vacancies stay separate (existing JOB-02 evidence rules)', () => {
  for (const [label, patch] of Object.entries({
    'another location set': { location: 'Winnipeg, MB, CA' },
    'another posting date': { publishedAt: '2026-09-01T07:00:00.000Z' },
    'another employer record': { employerId: 'westland-second-record' },
    'another job number': { externalUrl: url.replace('35569', '35570') },
    'another salary': { salary: '$90,000 per year' },
    'another salary range': { salaryRange: { min: 90000, max: 131000 } },
  })) {
    assert.equal(mergePublicJobRecords([copies[0], { ...copies[1], ...patch }], []).length, 2, label);
  }
});

test('a record without enough evidence is only ever identified by its id', () => {
  const thin = { id: 'thin', title: 'Role', location: 'Regina, SK', status: 'active' };
  assert.equal(publicJobIdentityKey(thin), 'id:thin');
});
