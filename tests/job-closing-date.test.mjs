process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { closesByEndOfToday, isClosingDateBeforeToday, isValidClosingDate, reginaCalendarDay } from '../src/lib/job-closing-date.ts';

// 21:00 on 2026-10-02 in Saskatchewan is already 2026-10-03 in UTC.
const evening = new Date('2026-10-03T03:00:00Z');

test('today is the Saskatchewan calendar day, not the server (UTC) day', () => {
  assert.equal(reginaCalendarDay(evening), '2026-10-02');
  assert.equal(reginaCalendarDay(new Date('2026-10-03T06:00:00Z')), '2026-10-03');
});

test('a closing date before today blocks publishing; today, later and blank do not', () => {
  assert.equal(isClosingDateBeforeToday('2026-10-01', evening), true);
  for (const value of ['2026-10-02', '2026-10-03', '', '   ', undefined, null]) assert.equal(isClosingDateBeforeToday(value, evening), false, String(value));
  assert.equal(isClosingDateBeforeToday({ toDate: () => new Date('2026-09-30T12:00:00Z') }, evening), true, 'stored timestamps follow expiry rules');
});

test('reopening prompts when the job would close by tonight', () => {
  assert.equal(closesByEndOfToday('2026-10-02', evening), true);
  assert.equal(closesByEndOfToday('2026-10-01', evening), true);
  assert.equal(closesByEndOfToday('2026-10-03', evening), false);
  assert.equal(closesByEndOfToday('', evening), false);
});

test('format validation is unchanged', () => {
  assert.equal(isValidClosingDate('2028-02-29'), true);
  assert.equal(isValidClosingDate('2026-02-29'), false);
});
