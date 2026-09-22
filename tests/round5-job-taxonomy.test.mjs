import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

test('actual list API enriches legacy records after identity selection and keeps salary/location variants', async () => {
  const rows = [
    { id: 'a', title: 'Registered Nurse', salary: { display: 'Competitive', min: 50 }, location: 'Town' },
    { id: 'b', title: 'Registered Nurse', salary: { display: 'Competitive', min: 70 }, location: 'Town' },
    { id: 'c', title: 'Registered Nurse', salary: { display: 'Competitive', min: 50 }, location: 'Elsewhere' },
    { id: 'd', title: 'Trainee', location: 'Town' },
  ].map(row => ({ ...row, employerId: 'fixture', active: true, status: 'active', description: 'Complete fictional copy.' }));
  const before = JSON.stringify(rows);
  const net = offlineNetwork();
  const { GET } = sourceModule('src/app/api/jobs/route.ts', { ...net, mocks: {
    ...net.mocks,
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { getAdminDb: () => ({}) },
    '@/lib/server/public-job-documents': { loadPublicJobDocuments: async () => ({jobs: rows.map(row => ({id: row.id, data: () => row})), posts: []}) },
  } });
  const response = await GET(new Request('https://fixture.invalid/api/jobs'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.count, 4);
  for (const row of body.jobs) assert.equal(row.category, row.id === 'd' ? undefined : 'Health & Wellness');
  assert.equal(JSON.stringify(rows), before);
  assert.equal(net.connections.length, 0);
});

test('Job Area discovers untagged roles and canonicalizes historical health categories without employer guessing', () => {
  const { jobArea } = sourceModule('src/lib/job-discovery.ts');
  for (const [title, category] of [
    ['Insurance Advisor', 'Finance'], ['Human Resources Coordinator', 'Human Resources'],
    ['Registered Nurse', 'Health & Wellness'], ['Harm Reduction Outreach Worker', 'Social Services'],
    ['Early Childhood Educator 1-3', 'Education'], ['IT Technician', 'Information Technology'],
    ['Cook - 2FT', 'Hospitality & Tourism'], ['Administrative Assistant', 'Administration'],
    ['Maintenance Technician', 'Construction & Trades'], ['Digital Marketing Specialist', 'Marketing & Communications'],
    ['Farm Worker', 'Agriculture'], ['Driver/Transportation Coordinator', 'Transportation'],
    ['Lawyer', 'Legal'], ['Lands Manager', 'Environment & Land'],
  ]) assert.equal(jobArea({ title }), category, title);
  for (const category of ['Health', 'Healthcare', 'Nursing', 'Mental Health & Wellness', 'Mental Health & Addictions', 'Health / Mental Health']) {
    assert.equal(jobArea({ category }), 'Health & Wellness', category);
  }
  assert.equal(jobArea({ title: 'Accountant', category: 'Social Services' }), 'Social Services');
  assert.equal(jobArea({ title: 'Accountant', category: 'Unreviewed provider label' }), '');
  for (const job of [
    { title: 'Trainee', employerName: 'Insurance Company' },
    { title: 'Summer Student - Casino' }, { title: 'Assistant', department: 'Education' },
    { title: 'Teacher / Nurse' }, { title: 'Field Worker' },
  ]) assert.equal(jobArea(job), '', JSON.stringify(job));
});

test('existing API metadata projection enriches category even without description and does not mutate input', () => {
  const { normalizeJobDiscoveryMetadata } = sourceModule('src/lib/job-metadata.ts');
  const original = { title: 'Registered Nurse', employerName: 'Fixture', salary: { min: 50 }, location: 'Town' };
  const projected = normalizeJobDiscoveryMetadata(original);
  assert.equal(projected.category, 'Health & Wellness');
  assert.equal(original.category, undefined);
  assert.equal(projected.salary, original.salary);
  assert.equal(projected.location, original.location);
});
