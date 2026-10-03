process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';
import {
  canBuyForOrganization, isSessionErrorCode, isSessionFailure, readEmployerRequestFailure, sessionExpiredLoginHref,
} from '../src/lib/employer-api-errors.ts';

test('API failures show the JSON message and code, never raw response text', async () => {
  assert.deepEqual(
    await readEmployerRequestFailure(Response.json({ error: 'A paid posting credit or eligible annual plan is required.', code: 'payment_required' }, { status: 402 }), 'fallback'),
    { status: 402, message: 'A paid posting credit or eligible annual plan is required.', code: 'payment_required' },
  );
  const raw = await readEmployerRequestFailure(new Response('{"error":', { status: 500 }), 'We couldn’t update this job.');
  assert.deepEqual(raw, { status: 500, message: 'We couldn’t update this job.', code: null });
  assert.equal((await readEmployerRequestFailure(new Response('<html>Bad gateway</html>', { status: 503 }), 'fallback')).message, 'IOPPS is temporarily unavailable. Please try again in a moment.');
  const expired = await readEmployerRequestFailure(new Response('', { status: 401 }), 'fallback');
  assert.equal(expired.message, 'Your session has expired. Sign in again to continue.');
  assert.equal(isSessionFailure(expired), true);
  assert.equal(isSessionFailure({ status: 503 }), false, 'an outage is retried, not a sign-in');
});

test('a stale client session sends the person to sign in and back to the page', () => {
  assert.equal(isSessionErrorCode({ code: 'auth/user-token-expired' }), true);
  assert.equal(isSessionErrorCode({ code: 'auth/network-request-failed' }), false);
  assert.equal(sessionExpiredLoginHref('/org/dashboard/jobs'), '/login?reason=expired&redirect=%2Forg%2Fdashboard%2Fjobs');
});

test('only the organization owner account is offered purchases, matching checkout', () => {
  assert.equal(canBuyForOrganization({ uid: 'org-1', orgId: 'org-1', orgRole: 'owner' }), true);
  assert.equal(canBuyForOrganization({ uid: 'teammate', orgId: 'org-1', orgRole: 'admin' }), false);
  assert.equal(canBuyForOrganization({ uid: 'teammate', orgId: 'org-1', orgRole: 'owner' }), false, 'checkout also requires the owner account itself');
  assert.equal(canBuyForOrganization(null), false);
});

function closingDateMarkup(value, publishing, now = '2026-10-03T03:00:00Z') {
  const fixed = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } };
  const { default: ClosingDateField } = sourceModule('src/components/employer/ClosingDateField.tsx', { globals: { Date: fixed }, mocks: { react: React } });
  return renderToStaticMarkup(React.createElement(ClosingDateField, { value, onChange() {}, publishing }));
}

test('the closing date field warns about a passed date only when the job is being published', () => {
  // 21:00 on 2026-10-02 in Saskatchewan: today there is still 2026-10-02.
  assert.match(closingDateMarkup('2026-10-01', true), /This date has passed/);
  assert.match(closingDateMarkup('2026-10-01', true), /aria-invalid="true"/);
  assert.doesNotMatch(closingDateMarkup('2026-10-02', true), /This date has passed/);
  assert.doesNotMatch(closingDateMarkup('2026-10-01', false), /This date has passed/, 'drafts may keep an old date');
});

test('dashboard job screens use the shared rules instead of UTC dates, raw text errors or owner-only links for everyone', () => {
  const list = readFileSync('src/app/org/dashboard/jobs/page.tsx', 'utf8');
  assert.doesNotMatch(list, /res\.text\(\)/);
  assert.match(list, /getIdToken\(forceRefresh\)/);
  assert.match(list, /fetchJobs\(true\)/, 'Retry asks for a fresh token');
  assert.match(list, /closesByEndOfToday\(job\.closingDate\)/, 'reopening asks for a new closing date first');
  assert.match(list, /needsDuration/, 'featured drafts choose their duration in the editor');
  const edit = readFileSync('src/app/org/dashboard/jobs/[id]/edit/page.tsx', 'utf8');
  assert.doesNotMatch(edit, /toISOString\(\)\.split\("T"\)\[0\]/);
  assert.match(edit, /const closedOn = reginaCalendarDay\(\)/);
  assert.match(edit, /canPurchase \? \(/, 'purchase actions only for the owner account');
  const wizard = readFileSync('src/app/org/dashboard/jobs/new/page.tsx', 'utf8');
  assert.equal((wizard.match(/publishing\.purchasePlan && canPurchase &&/g) || []).length, 2, 'buy buttons only for the owner account');
  assert.match(wizard, /isClosingDateBeforeToday\(form\.closingDate\)/);
});
