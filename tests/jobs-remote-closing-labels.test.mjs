import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';

// The actual /jobs page with inert hooks; `filters` sets URL filter values.
function renderJobs(records, filters = {}) {
  let state = 0;
  const shell = ({ children }) => React.createElement('div', null, children);
  const page = sourceModule('src/app/jobs/page.tsx', { mocks: {
    react: { ...React, useEffect() {}, useState(initial) { return [state++ === 0 ? records : state === 3 ? false : initial, () => {}]; } },
    'next/link': { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) },
    '@/components/OpportunityHeader': { __esModule: true, default: shell },
    '@/components/EmployerLogo': { __esModule: true, default: shell },
    '@/components/Card': { __esModule: true, default: shell },
    '@/components/DirectoryPagination': { __esModule: true, default: () => null, useDirectoryFilter: (key, fallback) => [key in filters ? filters[key] : fallback, () => {}], useDirectoryFilterActions: () => () => {}, useDirectoryPagination: items => ({ page: 1, pageItems: items, totalPages: 1, setPage() {} }) },
    './useJobSearchDrafts': { useJobSearchDrafts: () => ({ drafts: { q: '', location: '' }, edit() {}, flush() {}, reset() {} }) },
    '@/lib/job-funnel-analytics': { trackJobFunnelEvent() {} },
  } });
  return renderToStaticMarkup(React.createElement(page.default));
}

test('Remote only accepts structured locations instead of crashing the whole jobs page', () => {
  const jobs = [
    { id: 'structured-remote', title: 'Structured remote role', location: { city: 'Regina', province: 'SK', remote: true } },
    { id: 'structured-onsite', title: 'Structured onsite role', location: { city: 'Saskatoon', province: 'SK' } },
    { id: 'text-remote', title: 'Text remote role', location: 'Remote, Canada' },
    { id: 'work-location', title: 'Hybrid role', location: 'Prince Albert, SK', workLocation: 'Remote' },
    { id: 'flagged', title: 'Flagged role', location: 'Winnipeg, MB', remoteFlag: true },
    { id: 'onsite', title: 'Onsite role', location: 'Winnipeg, MB' },
  ];
  const html = renderJobs(jobs, { remote: '1' });
  assert.match(html, /4 jobs found/);
  for (const title of ['Structured remote role', 'Text remote role', 'Hybrid role', 'Flagged role']) assert.ok(html.includes(title), title);
  assert.ok(!html.includes('Structured onsite role') && !html.includes('Onsite role'));
  assert.match(renderJobs(jobs), /6 jobs found/);
  // Keyword search reads a structured location as its place, not "[object Object]".
  assert.match(renderJobs(jobs, { q: 'saskatoon' }), /1 job found/);
  assert.doesNotMatch(renderJobs(jobs, { q: 'object' }), /Structured/);
});

test('cards show the application deadline and a listing expiry as Saskatchewan days', () => {
  const html = renderJobs([
    // A paid listing published Oct 1, 8:30 pm in Regina expires 2099-11-01T02:30Z, i.e. Oct 31 there.
    { id: 'paid', title: 'Paid listing', expiresAt: '2099-11-01T02:30:00.000Z' },
    { id: 'deadline', title: 'Deadline role', closingDate: '2099-10-15', expiresAt: '2099-11-01T02:30:00.000Z' },
  ]);
  assert.match(html, /Listed until Oct 31, 2099/);
  assert.match(html, /Closes Oct 15, 2099/);
  assert.doesNotMatch(html, /Closes Nov 1|Closes Oct 31/);
});

test('a calendar closing day stays open, and in "Closing in 7 days", through that Saskatchewan day', () => {
  const { closesAt, matchesDiscoveryFilters } = sourceModule('src/lib/job-discovery.ts');
  assert.equal(closesAt({ closingDate: '2026-10-15' }), Date.parse('2026-10-16T06:00:00Z'));
  assert.equal(closesAt({ expiresAt: '2026-11-01T02:30:00.000Z' }), Date.parse('2026-11-01T02:30:00.000Z'));
  assert.equal(closesAt({ closingDate: 'Open until filled' }), 0);
  const filters = { employer: '', area: '', added: '', closing: '1', disclosed: '', training: '', salaryPeriod: 'year', salaryMin: '', salaryMax: '' };
  const evening = Date.parse('2026-10-16T03:00:00Z'); // Oct 15, 9 pm in Regina
  assert.equal(matchesDiscoveryFilters({ id: 'today', title: 'Closes today', closingDate: '2026-10-15' }, filters, evening), true);
  assert.equal(matchesDiscoveryFilters({ id: 'week', title: 'Closes in a week', closingDate: '2026-10-22' }, filters, evening), true);
  assert.equal(matchesDiscoveryFilters({ id: 'later', title: 'Closes later', closingDate: '2026-10-23' }, filters, evening), false);
  assert.equal(matchesDiscoveryFilters({ id: 'past', title: 'Closed', closingDate: '2026-10-14' }, filters, evening), false);
});
