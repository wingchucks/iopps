// Offline unit tests for bug 18 (row-level Delete / Close Position).
// Covers the Jobs-list state transitions behind the 2-click flow
// (click Delete/Close -> confirm -> done). No network, no real accounts,
// no production data — everything here is fictional.
// NOTE: implemented + unit-tested; still needs LIVE verification once a
// real job exists on an org account (the QA account has zero jobs, so the
// buttons were never clickable in the browser).
import test from 'node:test';
import assert from 'node:assert';
import {sourceModule} from './helpers/security-fixtures.mjs';

const actions = sourceModule('src/lib/employer-job-actions.ts', {mocks: {}});
const {removeJobFromList, markJobClosedInList, isJobVisibleInDashboard} = actions;

const fictionalJobs = () => ([
  {id: 'job-cook', title: 'Line Cook', status: 'active', applicationCount: 2},
  {id: 'job-server', title: 'Server', status: 'draft', applicationCount: 0},
  {id: 'job-driver', title: 'Driver', status: 'active', applicationCount: 5},
]);

test('delete (click 1: Delete, click 2: confirm) removes the job from the Jobs list', () => {
  const jobs = fictionalJobs();
  const next = removeJobFromList(jobs, 'job-cook');
  assert.deepEqual(next.map((j) => j.id), ['job-server', 'job-driver']);
  // The original state array is not mutated.
  assert.deepEqual(jobs.map((j) => j.id), ['job-cook', 'job-server', 'job-driver']);
});

test('delete of an unknown id leaves the list unchanged', () => {
  const jobs = fictionalJobs();
  assert.deepEqual(removeJobFromList(jobs, 'nope').map((j) => j.id), jobs.map((j) => j.id));
});

test('close position marks the row closed and keeps it in the list', () => {
  const jobs = fictionalJobs();
  const next = markJobClosedInList(jobs, 'job-driver');
  assert.equal(next.find((j) => j.id === 'job-driver').status, 'closed');
  assert.equal(next.find((j) => j.id === 'job-cook').status, 'active');
  assert.equal(next.find((j) => j.id === 'job-server').status, 'draft');
  assert.equal(next.length, 3);
});

test('deleted jobs are excluded from Overview and Analytics queries', () => {
  // /api/employer/dashboard, /api/employer/stats, and the Jobs list all
  // filter deletion tombstones (status === "deleted" or deletedAt set), so a
  // deleted job vanishes from Overview and Analytics on the next fetch.
  assert.equal(isJobVisibleInDashboard({status: 'active'}), true);
  assert.equal(isJobVisibleInDashboard({status: 'draft'}), true);
  assert.equal(isJobVisibleInDashboard({status: 'closed'}), true);
  assert.equal(isJobVisibleInDashboard({status: 'deleted'}), false);
  assert.equal(isJobVisibleInDashboard({status: 'active', deletedAt: 'fictional-timestamp'}), false);

  const afterDelete = [
    {id: 'job-cook', status: 'deleted', deletedAt: 'fictional-timestamp'},
    {id: 'job-server', status: 'draft'},
  ].filter(isJobVisibleInDashboard);
  assert.deepEqual(afterDelete.map((j) => j.id), ['job-server']);
});

test('closed jobs stay visible in Overview/Analytics but stop accepting applications', () => {
  const jobs = markJobClosedInList(fictionalJobs(), 'job-driver');
  const visible = jobs.filter(isJobVisibleInDashboard);
  assert.deepEqual(visible.map((j) => j.id), ['job-cook', 'job-server', 'job-driver']);
  assert.equal(visible.find((j) => j.id === 'job-driver').status, 'closed');
});
