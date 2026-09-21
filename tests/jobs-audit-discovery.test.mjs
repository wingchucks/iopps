import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';
import { readFileSync } from 'node:fs';

const capturedPairs = JSON.parse(readFileSync(new URL('./fixtures/jobs-audit-adp-discovery.json', import.meta.url), 'utf8'));
test('JOB-02 six captured pair shapes project to six untouched representatives', async () => {
  const before = structuredClone(capturedPairs);
  const body = await api(capturedPairs)();
  assert.equal(capturedPairs.length, 12);
  assert.equal(body.count, 6);
  assert.equal(new Set(body.jobs.map(row => row.externalUrl)).size, 6);
  assert.deepEqual(capturedPairs, before);
});

test('JOB-02 preserves distinct locations, intakes, requisitions, destinations and uncertain identities', () => {
  const { projectPublicJobDiscovery: project } = sourceModule('src/lib/server/public-job-discovery-projection.ts');
  for (const extra of [
    { location: 'Other City' }, { employerName: 'Other Council' }, { title: 'Other role' },
    { publishedAt: '2025-06-17T00:00:00.000Z' }, { closingDate: '2099-01-01' },
    { intakeId: 'summer' }, { requisitionId: 'other' }, { externalId: 'other' },
    { applicationUrl: 'https://example.test/other' }, { applicationLink: 'https://example.test/other' },
    { externalUrl: url.replace('101_1', '102_1') }, { externalUrl: url.replace('fixture-tenant', 'other-tenant') },
    { externalUrl: 'https://example.test/careers' }, { source: 'manual' },
    { publishedAt: '' }, { publishedAt: '2025-02-30T00:00:00.000Z' },
  ]) {
    const rows = [job('a'), job('z', extra)];
    assert.equal(project(rows).length, 2, JSON.stringify(extra));
  }
  assert.equal(project([job('a', { publishedAt: '2025-06-16T10:00:00.000Z' }), job('z', { publishedAt: '2025-06-16T11:00:00.000Z' })]).length, 2);
  for (const target of [url.replace('https:', 'http:'), url.replace('adp.com', 'adp.com.evil.test'), `${url}&jobId=other`, `${url}#other`, url.replace('workforcenow.', 'user:password@workforcenow.')]) {
    assert.equal(project([job('a', { externalUrl: target }), job('z', { externalUrl: target })]).length, 2, target);
  }
});

test('JOB-02 structured or additional explicit intake evidence is never silently discarded', () => {
  const { projectPublicJobDiscovery: project } = sourceModule('src/lib/server/public-job-discovery-projection.ts');
  for (const extra of [{ intakeId: { id: 'summer' } }, { startDate: '2099-05-01' }, { endDate: '2099-08-01' }, { intakeStartDate: '2099-05-01' }, { sourceUrl: 'https://example.test/other' }, { salary: '$20 hourly' }, { workLocation: 'Remote' }]) {
    assert.equal(project([job('a'), job('z', extra)]).length, 2, JSON.stringify(extra));
  }
});

test('JOB-02 list merge must not discard explicit same-owner intake differences before projection', async () => {
  for (const extra of [{ intakeId: 'summer' }, { intakeId: { id: 'summer' } }, { startDate: '2099-05-01' }, { requisitionNumber: 'secondary-requisition' }, { applicationDeadline: '2099-10-01' }]) {
    const base = job('a', { employerId: 'same-owner', requisitionId: 'primary' });
    const body = await api([base, { ...base, id: 'z', ...extra }])();
    assert.equal(body.count, 2, JSON.stringify(extra));
  }
});

// Keep every ordinary field equal: these differences previously disappeared in
// the content merge, before the conservative discovery projection could see them.
for (const [field, value] of Object.entries({
  applicationDeadline: '2099-10-01', deadline: '2099-11-01',
  salary: '$20 hourly', salaryRange: '$20–$25 hourly',
  orgId: 'secondary-owner', orgName: 'Secondary council', companyName: 'Secondary company',
  source: 'manual', sourceUrl: 'https://example.test/source',
  postedAt: '2025-06-16T11:00:00.000Z', department: 'Other department',
  employmentType: 'Contract', jobType: 'Casual', workLocation: 'Remote',
  remoteFlag: false, positions: 2, intake: 'winter', intakeEndDate: '2099-11-01',
})) {
  test(`JOB-02 real route preserves independent ${field} with shared primary evidence`, async () => {
    const base = job('a', { employerId: 'same-owner', closingDate: '2099-12-01', requisitionId: 'primary' });
    const rows = [base, { ...base, id: 'z', [field]: value }];
    const before = structuredClone(rows);
    const body = await api(rows)();
    assert.equal(body.count, 2, field);
    assert.deepEqual(body.jobs.map(row => row.id).sort(), ['a', 'z']);
    assert.deepEqual(rows, before);
    assert.equal((await api([...rows].reverse())()).count, 2);
  });
}

// Shared primary timestamps/deadlines cannot erase independent source evidence.
for (const field of ['sourcePostingDate', 'datePosted', 'expiresAt', 'sourceVerifiedAt', 'endAt']) {
  for (const owner of ['same-owner', 'other-owner']) {
    for (const reversed of [false, true]) {
      test(`JOB-02 lifecycle ${field} ${owner} reversed=${reversed}`, async () => {
        const base = job('a', { employerId: 'same-owner', closingDate: '2099-12-01', [field]: '2099-06-01' });
        for (const value of ['2099-07-01', undefined, { value: '2099-07-01' }]) {
          const rows = [base, { ...base, id: 'z', employerId: owner, [field]: value, privateNotes: 'never-public' }];
          const before = structuredClone(rows);
          const body = await api(reversed ? [...rows].reverse() : rows)();
          assert.equal(body.count, 2, `${field}: ${JSON.stringify(value)}`);
          assert.deepEqual(body.jobs.map(row => row.id).sort(), ['a', 'z']);
          assert.ok(body.jobs.every(row => !Object.hasOwn(row, 'privateNotes')));
          assert.ok(!JSON.stringify(body).includes('never-public'));
          assert.deepEqual(rows, before);
        }
        const compatible = [base, { ...base, id: 'z', employerId: owner }];
        const projected = await api(reversed ? [...compatible].reverse() : compatible)();
        assert.equal(projected.count, 1, 'equal independent evidence remains compatible');
        assert.equal(projected.jobs[0].id, 'a');
      });
    }
  }
}

test('JOB-02 real route retains structured salary evidence before display normalization', async () => {
  for (const salary of [{ min: 20, max: 25 }, { display: '$20 hourly', min: 20, max: 25 }, { compensation: { min: 20, max: 25 } }]) {
    const base = job('a', { employerId: 'same-owner', salary: salary.display || '' });
    const rows = [base, { ...base, id: 'z', salary, privateNotes: { secret: 'never-public' } }];
    const before = structuredClone(rows);
    for (const ordered of [rows, [...rows].reverse()]) {
      const body = await api(ordered)();
      assert.equal(body.count, 2, 'structured salary must veto merging before it becomes display text');
      assert.deepEqual(body.jobs.map(row => row.id).sort(), ['a', 'z']);
      assert.equal(body.jobs.find(row => row.id === 'z').salary, salary.display || '');
      assert.ok(body.jobs.every(row => !Object.hasOwn(row, 'privateNotes')));
      assert.ok(!JSON.stringify(body).includes('never-public'));
    }
    assert.deepEqual(rows, before);
  }
});

test('JOB-02 real route retains nested compensation evidence without exposing it', async () => {
  for (const owner of ['same-owner', 'other-owner']) {
    const base = job('a', { employerId: 'same-owner' });
    const rows = [base, { ...base, id: 'z', employerId: owner, compensation: { salary: { min: 20, max: 25 }, internalNote: 'never-public' } }];
    const before = structuredClone(rows);
    for (const ordered of [rows, [...rows].reverse()]) {
      const body = await api(ordered)();
      assert.equal(body.count, 2, 'nested compensation must veto both merge and discovery projection');
      assert.deepEqual(body.jobs.map(row => row.id).sort(), ['a', 'z']);
      assert.ok(body.jobs.every(row => !Object.hasOwn(row, 'compensation')));
      assert.ok(!JSON.stringify(body).includes('never-public'));
    }
    assert.deepEqual(rows, before);
  }
});

test('JOB-02 hidden and expired representatives cannot suppress another owner lane', async () => {
  for (const change of [{ active: false }, { status: 'draft' }, { closingDate: '2000-01-01' }]) {
    const body = await api([job('a', change), job('z')])();
    assert.equal(body.count, 1);
    assert.equal(body.jobs[0].id, 'z');
  }
});

test('JOB-02 authoritative lifecycle suppresses stale same-owner content before discovery', async () => {
  for (const lifecycle of [{ active: false }, { status: 'deleted' }, { expiresAt: '2000-01-01' }]) {
    const base = job('a', { employerId: 'same-owner', closingDate: '2099-12-01' });
    const hidden = { ...base, id: 'z', ...lifecycle };
    const mirrored = await api([hidden], [base])();
    assert.equal(mirrored.count, 0, 'canonical expiry also suppresses a stale legacy mirror');
    for (const rows of [[base, hidden], [hidden, base]]) {
      const before = structuredClone(rows);
      const body = await api(rows)();
      assert.deepEqual(body.jobs, [], JSON.stringify(lifecycle));
      assert.equal(body.count, 0);
      assert.deepEqual(rows, before);
    }
    for (const difference of [
      { employerId: 'other-owner' }, { source: 'manual' }, { sourceUrl: 'https://example.test/other' },
      { intakeId: 'summer' }, { salary: '$20 hourly' }, { salary: { min: 20 } },
      { publishedAt: '2099-06-01T00:00:00.000Z' }, { sourcePostingDate: '2099-06-01' },
      { expiresAt: '2099-06-01' }, { closingDate: '2099-11-01' },
    ]) {
      const body = await api([{ ...base, ...difference }, hidden])();
      assert.equal(body.count, 1, JSON.stringify({ lifecycle, difference }));
      assert.equal(body.jobs[0].id, 'a');
    }
  }
});

const url = 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=fixture-tenant&jobId=101_1&lang=en_CA&source=CC2';
const job = (id, extra = {}) => ({ id, title: 'Support Worker', employerName: 'Fixture Council', employerId: `owner-${id}`, source: 'feed', active: true, location: 'Fixture City, SK, CA', externalUrl: url, publishedAt: '2025-06-16T00:00:00.000Z', description: 'Original source description.', ...extra });
function api(rows, posts = []) {
  const net = offlineNetwork();
  const documents = records => records.map(row => ({ id: row.id, data: () => row }));
  const db = { getAll: async () => [], collection: name => { const q = { doc: id => ({ id }), where: () => q, get: async () => ({ docs: documents(name === 'jobs' ? rows : name === 'posts' ? posts : []) }) }; return q; } };
  const route = sourceModule('src/app/api/jobs/route.ts', { ...net, mocks: { ...net.mocks, '@/lib/firebase-admin': { getAdminDb: () => db }, 'next/server': { NextResponse: { json: Response.json } } } });
  return async (query = '') => { const response = await route.GET(new Request(`https://fixture.test/api/jobs${query}`)); assert.equal(response.status, 200); assert.equal(net.connections.length, 0); return response.json(); };
}

test('JOB-02 conflicting explicit employment labels are not erased by a shared jobType', async () => {
  const read = api([job('a', { jobType: 'Casual', employmentType: 'Contract' }), job('z', { jobType: 'Casual', employmentType: 'Casual' })]);
  assert.equal((await read()).count, 2);
});

test('JOB-02 same ADP tenant/requisition contributes once in public discovery without changing owners', async () => {
  const rows = [job('z', { publishedAt: '2025-06-16T20:30:00.000Z', description: 'Older formatting of the source description.' }), job('a')];
  const before = structuredClone(rows);
  const read = api(rows);
  const body = await read();
  assert.equal(body.count, 1);
  assert.equal(body.jobs[0].id, 'a');
  assert.equal(body.jobs[0].employerId, 'owner-a');
  assert.deepEqual(rows, before);
  assert.deepEqual((await api([...rows].reverse())()).jobs, body.jobs);
  // Filter BEFORE discovery selection: a read projection is not an ownership alias.
  assert.equal((await read('?employerId=owner-z')).jobs[0].id, 'z');
  assert.equal((await read('?employerId=unrelated')).count, 0);
});
