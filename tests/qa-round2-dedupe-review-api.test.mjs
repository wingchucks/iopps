import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

const base = { employerId: 'fictional-employer', employerName: 'Example Employer', title: 'Branch Manager', location: 'Winnipeg', closingDate: '2099-10-01', description: 'Manage the branch.', active: true };
const organization = { id: 'fictional-employer', name: 'Example Employer', logoUrl: 'https://example.test/logo.png', description: 'Fictional employer.', website: 'https://example.test', status: 'approved', onboardingComplete: true, plan: 'premium', partnerTier: 'premium', partnerDirectory: { enabled: true } };

async function projections(rows) {
 const docs = rows.map(row => ({ id: row.id, data: () => row }));
 const net = offlineNetwork();
 const db = { getAll: async () => [], collection: name => {
  const query = { where: () => query, limit: () => query, get: async () => ({ docs: name === 'organizations' ? [{ id: organization.id, data: () => organization }] : name === 'jobs' ? docs : [] }) };
  return query;
 } };
 const options = { ...net, mocks: { ...net.mocks,
  '@/lib/firebase-admin': { getAdminDb: () => db, hasAdminRuntimeSupport: () => true },
  '@/lib/server/public-organization-resolver': { resolvePublicOrganization: async () => organization },
  'next/server': { NextResponse: { json: Response.json } },
 } };
 const request = new Request('https://fixture.test/api/jobs');
 const paths = ['jobs', 'org/[slug]', 'organizations', 'partners'];
 const results = [];
 for (const path of paths) {
  const response = await sourceModule(`src/app/api/${path}/route.ts`, options).GET(request, { params: Promise.resolve({ slug: organization.id }) });
  assert.equal(response.status, 200, path);
  results.push(await response.json());
 }
 const partnerOrgs = await sourceModule('src/app/api/organizations/route.ts', options).GET(new Request('https://fixture.test/api/organizations?partners=true'));
 assert.equal(partnerOrgs.status, 200);
 results.push(await partnerOrgs.json());
 assert.equal(net.connections.length, 0);
 return results;
}

test('review P2 API: mixed formats have matching jobs, organization detail, directory and partner counts', async () => {
 const rows = [{ ...base, id: 'a', description: '<p>Manage the branch.</p>', descriptionFormat: 'html' }, { ...base, id: 'b', descriptionFormat: 'plain-text' }];
 const before = structuredClone(rows);
 const [jobs, detail, directory, partners, partnerDirectory] = await projections(rows);
 assert.equal(jobs.count, 1);
 assert.deepEqual(jobs.jobs.map(row => row.id), ['a']);
 assert.equal(jobs.jobs[0].description, 'Manage the branch.');
 assert.deepEqual(detail.jobs.map(row => row.id), ['a']);
 assert.equal(detail.jobs[0].description, rows[0].description);
 for (const records of [directory.orgs, partners.partners, partnerDirectory.orgs]) {
  assert.equal(records.length, 1);
  assert.equal(records[0].openJobs, 1);
 }
 assert.deepEqual(rows, before);
});
