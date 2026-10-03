// Servers run in UTC; event expiry must follow the event's own calendar day.
process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { hasEventEnded, isEventCompleted, isPublicEventVisible } from '../src/lib/public-events.ts';

const at = iso => new Date(iso);
// [description, event, instant, ended]
const cases = [
  ['a date-only Saskatchewan event is still on at 7 pm local (01:00 UTC next day)', { startDate: '2026-10-02' }, '2026-10-03T01:00:00Z', false],
  ['a date-only Saskatchewan event is still on at 11:59 pm local', { startDate: '2026-10-02' }, '2026-10-03T05:59:00Z', false],
  ['a date-only Saskatchewan event ends at local midnight', { startDate: '2026-10-02' }, '2026-10-03T06:00:00Z', true],
  ['an evening event is visible before its end time', { startDate: '2026-10-02', startTime: '19:00', endTime: '21:00', timeZone: 'America/Regina' }, '2026-10-03T02:59:00Z', false],
  ['an evening event ends after its end time', { startDate: '2026-10-02', startTime: '19:00', endTime: '21:00', timeZone: 'America/Regina' }, '2026-10-03T03:01:00Z', true],
  ['the event time zone decides the calendar day', { startDate: '2026-10-02', timeZone: 'America/Toronto' }, '2026-10-03T03:59:00Z', false],
  ['an Eastern event ends at Eastern midnight', { startDate: '2026-10-02', timeZone: 'America/Toronto' }, '2026-10-03T04:01:00Z', true],
  ['an unknown time zone falls back to Saskatchewan time', { startDate: '2026-10-02', timeZone: 'Not/AZone' }, '2026-10-03T05:59:00Z', false],
  ['a multi-day event honours its end date and end time', { startDate: '2026-10-02', endDate: '2026-10-04', endTime: '5 PM' }, '2026-10-04T22:59:00Z', false],
  ['a multi-day event ends at its end time on the last day', { startDate: '2026-10-02', endDate: '2026-10-04', endTime: '5 PM' }, '2026-10-04T23:01:00Z', true],
  ['a same-day listing ending after midnight runs into the next day', { startDate: '2026-10-02', startTime: '20:00', endTime: '02:00' }, '2026-10-03T07:59:00Z', false],
  ['an overnight listing ends at its end time the next morning', { startDate: '2026-10-02', startTime: '20:00', endTime: '02:00' }, '2026-10-03T08:01:00Z', true],
  ['a legacy range label ends after its last day', { dates: 'October 1-2, 2026' }, '2026-10-03T05:59:00Z', false],
  ['a legacy range label is over the next day', { dates: 'October 1-2, 2026' }, '2026-10-03T06:00:00Z', true],
  ['a cross-month label uses its last date', { dates: 'Oct 30 - Nov 2, 2026' }, '2026-11-02T23:00:00Z', false],
  ['a stored timestamp start is read as its local day', { startDate: { toDate: () => new Date('2026-10-02T16:00:00Z') } }, '2026-10-03T05:59:00Z', false],
  ['a stored date-only value at midnight UTC keeps its calendar day', { endDate: '2026-10-02T00:00:00.000Z' }, '2026-10-03T05:59:00Z', false],
  ['an explicit end instant is honoured exactly', { endDate: '2026-10-02T23:00:00.000Z' }, '2026-10-02T23:01:00Z', true],
  ['a long-form legacy date is read as written', { date: 'Friday, October 2, 2026' }, '2026-10-03T05:59:00Z', false],
  ['an event without readable dates never expires by date', { title: 'Date to be confirmed' }, '2030-01-01T00:00:00Z', false],
];

test('the test process really runs in UTC', () => {
  assert.equal(new Date(2026, 9, 2).getTimezoneOffset(), 0);
});

for (const [description, event, instant, ended] of cases) {
  test(description, () => {
    assert.equal(hasEventEnded(event, at(instant)), ended);
    assert.equal(isPublicEventVisible({ ...event, status: 'active' }, at(instant)), !ended);
  });
}

test('event expiry does not depend on the server time zone', () => {
  try {
    for (const zone of ['Pacific/Kiritimati', 'America/Regina', 'Asia/Kolkata']) {
      process.env.TZ = zone;
      for (const [description, event, instant, ended] of cases) assert.equal(hasEventEnded(event, at(instant)), ended, `${zone}: ${description}`);
    }
  } finally {
    process.env.TZ = 'UTC';
  }
});

test('hidden statuses and unpublished records stay completed regardless of dates', () => {
  for (const status of ['draft', 'pending', 'rejected', 'deleted', 'completed']) {
    assert.equal(isEventCompleted({ status, startDate: '2099-01-01' }, at('2026-10-02T12:00:00Z')), true, status);
  }
  assert.equal(isEventCompleted({ active: false, startDate: '2099-01-01' }, at('2026-10-02T12:00:00Z')), true);
});

function fakeDb(collections) {
  const snapshot = row => ({ id: row.id, exists: true, data: () => ({ ...row }) });
  const query = (collection, filters = []) => {
    const rows = () => (collections[collection] ?? [])
      .filter(row => filters.every(([field, operator, value]) => operator === 'in' ? value.includes(row[field]) : row[field] === value));
    return {
      where: (field, operator, value) => query(collection, [...filters, [field, operator, value]]),
      select: () => query(collection, filters),
      doc: id => ({ collection, id }),
      get: async () => ({ docs: rows().map(snapshot) }),
      count: () => ({ get: async () => ({ data: () => ({ count: rows().length }) }) }),
    };
  };
  return {
    collection: name => query(name),
    getAll: async (...refs) => refs.map(ref => {
      const row = (collections[ref.collection] ?? []).find(item => item.id === ref.id);
      return row ? snapshot(row) : { id: ref.id, exists: false, data: () => undefined };
    }),
  };
}

test('/api/events and /api/events/[id] keep an evening event listed until it ends in Saskatchewan', async () => {
  const evening = { id: 'round-dance', slug: 'round-dance', title: 'Fictional round dance', status: 'active', startDate: '2026-10-02', startTime: '19:00', endTime: '23:00', timeZone: 'America/Regina', city: 'Saskatoon', province: 'SK' };
  const yesterday = { id: 'yesterday', slug: 'yesterday', title: 'Fictional finished event', status: 'active', startDate: '2026-10-01' };
  for (const [instant, listed] of [['2026-10-03T01:30:00Z', true], ['2026-10-03T05:01:00Z', false]]) {
    const fixed = class extends Date { constructor(...args) { super(...(args.length ? args : [instant])); } };
    const options = { globals: { Date: fixed }, mocks: {
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/firebase-admin': { getAdminDb: () => fakeDb({ events: [evening, yesterday], posts: [], event_rsvps: [] }) },
    } };
    const list = await sourceModule('src/app/api/events/route.ts', options).GET();
    assert.equal(list.status, 200);
    assert.deepEqual((await list.json()).events.map(item => item.id), listed ? ['round-dance'] : [], instant);
    const detail = await sourceModule('src/app/api/events/[id]/route.ts', options)
      .GET(new Request('https://example.test/api/events/round-dance'), { params: Promise.resolve({ id: 'round-dance' }) });
    assert.equal(detail.status, listed ? 200 : 404, instant);
  }
});
