import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearJobWizardSnapshot,
  draftPurchaseHref,
  isDraftId,
  jobWizardResumePath,
  readJobWizardSnapshot,
  saveJobWizardSnapshot,
} from '../src/lib/job-wizard-resume.ts';
import { authIntentHref, safeAuthRedirect } from '../src/lib/auth-redirect.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

test('checkout started from a draft returns to that draft through success and cancel', () => {
  const href = draftPurchaseHref('featured-post', 'band-office-admin-mf1x2');
  const url = new URL(href, 'https://www.iopps.ca');
  assert.equal(url.pathname, '/org/checkout');
  assert.equal(url.searchParams.get('plan'), 'featured-post');
  const redirect = url.searchParams.get('redirect');
  assert.equal(redirect, jobWizardResumePath('band-office-admin-mf1x2'));
  assert.equal(safeAuthRedirect(redirect), '/org/dashboard/jobs/new?resume=band-office-admin-mf1x2');
  // The Stripe success and cancel URLs are built with authIntentHref from the same query.
  const success = new URL(authIntentHref('/org/checkout/success', url.searchParams), 'https://www.iopps.ca');
  assert.equal(success.searchParams.get('redirect'), redirect);
  const plans = new URL(draftPurchaseHref('plans', 'band-office-admin-mf1x2'), 'https://www.iopps.ca');
  assert.equal(plans.pathname, '/org/plans');
  assert.equal(plans.searchParams.get('redirect'), redirect);
});

test('the wizard snapshot restores only the same owner and draft within a day', () => {
  const storage = memoryStorage();
  const form = { title: 'Band Office Administrator', responsibilities: ['Answer phones'] };
  const now = Date.parse('2026-09-25T12:00:00Z');
  assert.equal(saveJobWizardSnapshot(storage, 'owner-1', { draftId: 'job-1', step: 2, form, savedAt: now }), true);
  assert.deepEqual(readJobWizardSnapshot(storage, 'owner-1', 'job-1', now + 1000), { draftId: 'job-1', step: 2, form, savedAt: now });
  assert.equal(readJobWizardSnapshot(storage, 'owner-2', 'job-1', now), null, 'another account never sees it');
  assert.equal(readJobWizardSnapshot(storage, 'owner-1', 'job-2', now), null, 'another draft id falls back to the server copy');
  assert.equal(readJobWizardSnapshot(storage, 'owner-1', 'job-1', now + 25 * 3600_000), null, 'stale snapshots are ignored');
  clearJobWizardSnapshot(storage, 'owner-1');
  assert.equal(readJobWizardSnapshot(storage, 'owner-1', 'job-1', now), null);
});

test('malformed snapshots and unavailable storage fail safely', () => {
  const storage = memoryStorage();
  storage.setItem('iopps:job-wizard-resume:v1:owner-1', '{not json');
  assert.equal(readJobWizardSnapshot(storage, 'owner-1', 'job-1'), null);
  storage.setItem('iopps:job-wizard-resume:v1:owner-1', JSON.stringify({ draftId: 'job-1', step: 3, form: {}, savedAt: Date.now() }));
  assert.equal(readJobWizardSnapshot(storage, 'owner-1', 'job-1'), null);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(saveJobWizardSnapshot(throwing, 'owner-1', { draftId: 'job-1', step: 1, form: {}, savedAt: Date.now() }), false);
  assert.equal(readJobWizardSnapshot(throwing, 'owner-1', 'job-1'), null);
  assert.doesNotThrow(() => clearJobWizardSnapshot(throwing, 'owner-1'));
  for (const bad of ['', '../jobs', 'a/b', 'a b', null]) assert.equal(isDraftId(bad), false);
});
