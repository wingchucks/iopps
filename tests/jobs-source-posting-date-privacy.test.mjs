import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

const secret = 'FICTIONAL-PRIVATE-DATE-NOTE-DO-NOT-PUBLISH';
const validDate = '2028-02-29';
const cases = [
  ['nested internal note', { value: validDate, internalNote: { secret } }],
  ['array', [validDate, { internalNote: secret }]],
  ['null prototype', Object.assign(Object.create(null), { value: validDate, internalNote: secret })],
  ['custom prototype', Object.assign(Object.create({ value: validDate }), { internalNote: secret })],
  ['boxed string', Object.assign(new String(validDate), { internalNote: secret })],
  ['impossible day', '2026-02-29'],
  ['impossible month', '2026-13-01'],
  ['timestamp', '2028-02-29T00:00:00.000Z'],
  ['padded string', ` ${validDate} `],
  ['unstructured string', secret],
  ['empty string', ''],
  ['null', null],
  ['number', 20280229],
  ['boolean', true],
  ['missing', undefined],
];

async function publicResponse(endpoint, sourcePostingDate) {
  const record = { title: 'Fictional privacy fixture', active: true, source: 'feed', sourcePostingDate };
  const doc = { id: 'fictional-date', exists: true, data: () => record, ref: {
    set: () => assert.fail('No writes permitted'), update: () => assert.fail('No writes permitted'),
  } };
  const net = offlineNetwork();
  const route = sourceModule(endpoint === 'list' ? 'src/app/api/jobs/route.ts' : 'src/app/api/jobs/[id]/route.ts', {
    ...net,
    mocks: {
      ...net.mocks,
      '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => doc }) }) }) },
      '@/lib/server/public-job-documents': { loadPublicJobDocuments: async () => ({ posts: [], jobs: [doc] }) },
      '@/lib/server/public-job-routing': { findPublicJobDocument: async () => ({ id: doc.id, source: 'jobs', routeSlug: doc.id }) },
      'next/server': { NextResponse: { json: Response.json } },
    },
  });
  const response = await route.GET(new Request(`https://fixture.test/api/jobs${endpoint === 'list' ? '' : '/' + doc.id}`), { params: Promise.resolve({ id: doc.id }) });
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(net.connections.length, 0, 'No provider traffic permitted');
  assert.equal(net.dnsCalls.length, 0, 'No DNS permitted');
  if (endpoint === 'list') assert.equal(body.count, 1, 'Malformed date must not hide the job');
  return { text, job: endpoint === 'list' ? body.jobs[0] : body.job };
}

for (const endpoint of ['list', 'detail']) {
  for (const [label, value] of cases) {
    test(`actual ${endpoint} GET omits sourcePostingDate: ${label}`, async () => {
      const { text, job } = await publicResponse(endpoint, value);
      assert.ok(!text.includes(secret), 'Nested/private fictional marker must not be serialized');
      assert.equal(Object.hasOwn(job, 'sourcePostingDate'), false);
      assert.equal(job.title, 'Fictional privacy fixture');
    });
  }
  test(`actual ${endpoint} GET preserves a validated leap-day string`, async () => {
    const { job } = await publicResponse(endpoint, validDate);
    assert.equal(job.sourcePostingDate, validDate);
  });
}

const project = sourceModule('src/lib/server/public-content-record.ts').publicContentRecord;
test('projection does not promote inherited sourcePostingDate into public data', () => {
  const record = Object.assign(Object.create({ sourcePostingDate: validDate }), { title: 'Fictional inherited fixture' });
  assert.equal(Object.hasOwn(project(record), 'sourcePostingDate'), false);
});
