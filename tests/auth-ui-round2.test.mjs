import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, URL, URLSearchParams, setTimeout, clearTimeout, process: { env: {} }, ...mocks.__globals, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts', mocks);
    return require(id);
  } });
  return loaded.exports;
}

test('email action is public in real middleware without weakening setup protection', () => {
  const middleware = load('src/middleware.ts', {
    'next/server': { NextResponse: { next: () => 'allow', redirect: url => url.pathname } },
    jose: { decodeJwt: () => { throw Error('No credentials permitted'); } },
    './lib/launch-maintenance': { maintenanceResponse: () => null },
  }).middleware;
  function request(path) { const url = new URL(path, 'https://fixture.invalid'); url.clone = () => new URL(url); return { nextUrl: url, url: url.href, cookies: { get: () => undefined }, method: 'GET' }; }
  assert.equal(middleware(request('/auth/action?mode=verifyEmail&oobCode=fictional-code')), 'allow');
  assert.equal(middleware(request('/setup')), '/login');
  assert.equal(middleware(request('/verify-email')), '/login');
});

test('email subjects and notification sender remain exact (existing behavior)', () => {
  const source = readFileSync('src/lib/email.ts', 'utf8');
  assert.match(source, /const FROM_EMAIL = "IOPPS <notifications@iopps.ca>"/);
  assert.match(source, /subject: "Reset your IOPPS password"/);
  assert.match(source, /subject: "Confirm your IOPPS account"/);
});

test('action effect replay consumes a code once and does not report success before application', async () => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const values = []; let cursor = 0; let effect; let checks = 0; let applies = 0;
  const reference = { current: null }, history = [];
  const Component = load('src/app/auth/action/ActionContent.tsx', {
    react: { useRef: () => reference, useEffect: callback => { effect = callback; }, useState: initial => { const index = cursor++; values[index] = initial; return [initial, value => { values[index] = value; }]; } },
    './verification-action': load('src/app/auth/action/verification-action.ts'),
    '@/lib/firebase': { auth: {} },
    'firebase/auth': { checkActionCode: async () => { checks++; return { operation: 'VERIFY_EMAIL' }; }, applyActionCode: async () => { applies++; await held; } },
    __globals: { window: { location: { search: '?mode=verifyEmail&oobCode=fictional-code', origin: 'https://fixture.invalid', pathname: '/auth/action' }, history: { state: null, replaceState: (...args) => history.push(args) } } },
  }).default;
  Component();
  const cleanup = effect(); cleanup(); effect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(checks, 1); assert.equal(applies, 1);
  assert.equal(values[0], 'loading');
  assert.equal(history.length, 1); assert.equal(history[0][2], '/auth/action');
  release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(values[0], 'success');
});

test('reset action displays accessible password form and safe failure', () => {
  const { PasswordResetView } = load('src/app/auth/action/ActionContent.tsx', {
    './verification-action': load('src/app/auth/action/verification-action.ts'), '@/lib/firebase': { auth: {} }, 'firebase/auth': {},
  });
  assert.equal(typeof PasswordResetView, 'function');
  for (const [state, text] of [['loading', 'Checking your reset link'], ['ready', 'Choose a new password'], ['success', 'Password updated'], ['error', 'Request a new reset link']]) {
    const html = renderToStaticMarkup(React.createElement(PasswordResetView, { state, continuePath: '/login', onSubmit: async () => {} }));
    assert.ok(DomUtils.textContent(parseDocument(html)).includes(text));
    if (state === 'ready') { assert.match(html, /autocomplete="new-password"/i); assert.match(html, /New password/); assert.match(html, /Confirm new password/); }
    assert.doesNotMatch(html, /oobCode|Firebase/);
  }
});

test('reset action validates code before presenting a form and restricts continuation', async () => {
  const { validateResetAction, resetContinuePath } = load('src/app/auth/action/verification-action.ts');
  assert.equal(typeof validateResetAction, 'function');
  let checks = 0;
  const check = async code => { assert.equal(code, 'fictional'); checks++; return 'fixture@example.invalid'; };
  assert.equal(await validateResetAction(new URLSearchParams('mode=resetPassword&oobCode=fictional'), check), 'fictional');
  for (const params of ['mode=verifyEmail&oobCode=fictional', 'mode=resetPassword&oobCode=fictional&oobCode=other', 'mode=resetPassword']) await assert.rejects(validateResetAction(new URLSearchParams(params), check));
  assert.equal(checks, 1);
  await assert.rejects(validateResetAction(new URLSearchParams('mode=resetPassword&oobCode=fictional'), async () => { throw Error('expired'); }));
  assert.equal(resetContinuePath('https://iopps.ca/jobs/one?save=1', 'https://iopps.ca'), '/login?redirect=%2Fjobs%2Fone%3Fsave%3D1');
  for (const value of ['https://evil.invalid/', '//evil.invalid', '/auth/action', '/login?redirect=//evil.invalid', '/\\\\evil.invalid']) assert.equal(resetContinuePath(value, 'https://iopps.ca'), '/login');
});

test('every installed Firebase Auth error code and unknown code has safe friendly output (existing behavior)', async t => {
  const { AuthErrorCodes } = await import('firebase/auth');
  const { authErrorMessage } = load('src/lib/auth-errors.ts');
  const codes = [...new Set(Object.values(AuthErrorCodes))];
  assert.ok(codes.length > 50, 'exercise the actual installed SDK catalogue');
  for (const code of [...codes, 'auth/future-unknown', 'appCheck/initial-throttle', undefined, null]) {
    const message = authErrorMessage({ code, message: 'Firebase: private-provider-diagnostic' });
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 15);
    assert.doesNotMatch(message, /Firebase|auth\/|appCheck\/|private-provider-diagnostic/);
  }
  for (const error of [null, undefined, 'Firebase: raw error', new Error('Firebase: raw error'), {}, { code: { nested: 'invalid' } }]) {
    assert.equal(authErrorMessage(error, 'Please retry safely.'), 'Please retry safely.');
  }
  t.diagnostic(`Checked ${codes.length} distinct installed Firebase Auth codes plus unknown/malformed errors`);
});

test('server-generated verification links target the branded handler without changing continuation', () => {
  const { buildBrandedVerificationActionLink } = load('src/lib/auth-verification-email.ts');
  assert.equal(typeof buildBrandedVerificationActionLink, 'function');
  const link = buildBrandedVerificationActionLink('https://fixture.invalid', 'https://firebase.invalid/__/auth/action?mode=verifyEmail&oobCode=fictional-code&apiKey=fictional-key&continueUrl=https%3A%2F%2Ffixture.invalid%2Fverify-email%3Fnext%3D%252Fsetup');
  const url = new URL(link);
  assert.equal(url.origin, 'https://fixture.invalid');
  assert.equal(url.pathname, '/auth/action');
  assert.equal(url.searchParams.get('mode'), 'verifyEmail');
  assert.equal(url.searchParams.get('oobCode'), 'fictional-code');
  assert.equal(url.searchParams.get('continueUrl'), 'https://fixture.invalid/verify-email?next=%2Fsetup');
  assert.equal(url.searchParams.has('apiKey'), false);
  assert.throws(() => buildBrandedVerificationActionLink('https://fixture.invalid', 'https://firebase.invalid/?mode=resetPassword&oobCode=fictional-code'));
  assert.throws(() => buildBrandedVerificationActionLink('https://fixture.invalid', 'invalid-secret-fixture'), error => !String(error).includes('invalid-secret-fixture') && !('input' in error));
  const route = readFileSync('src/app/api/auth/verification-email/route.ts', 'utf8');
  assert.match(route, /verificationLink: buildBrandedVerificationActionLink\(/);
  assert.match(route, /verifyAppCheckFromRequest/);
  assert.match(route, /reserveVerificationEmail/);
});

test('baseline shared heading already separates words in isolated React SSR (not hosted acceptance)', () => {
  const { StepHeader } = load('src/components/signup/ui.tsx', { './constants': load('src/components/signup/constants.ts') });
  const html = renderToStaticMarkup(React.createElement(StepHeader, { title: 'Create your', highlight: 'Account', eyebrow: '', desc: '' }));
  assert.equal(DomUtils.textContent(parseDocument(html)), 'Create your Account');
});

test('signup headings have explicit whitespace and preserve gradient highlight DOM text', () => {
  const path = 'src/app/signup/StepHeader.tsx';
  assert.ok(existsSync(path), 'signup needs an explicitly spaced heading');
  const { StepHeader } = load(path);
  for (const [title, highlight] of [['Create your', 'Account'], ['What kind of', 'account do you need?'], ['Check your', 'Inbox']]) {
    const html = renderToStaticMarkup(React.createElement(StepHeader, { title, highlight, eyebrow: '', desc: '' }));
    const document = parseDocument(html);
    const heading = DomUtils.findOne(node => node.name === 'h1', document.children, true);
    assert.equal(DomUtils.textContent(heading), `${title} ${highlight}`);
    const span = DomUtils.findOne(node => node.name === 'span', heading.children, true);
    assert.equal(DomUtils.textContent(span), highlight);
    assert.match(span.attribs.style, /background-clip:text/);
  }
  assert.match(readFileSync(path, 'utf8'), /\{title\}\{["'] ["']\}/);
  assert.match(readFileSync('src/app/signup/page.tsx', 'utf8'), /import \{ StepHeader \} from "\.\/StepHeader"/);
});

test('branded email action renders loading, success, and recoverable failure without secrets', () => {
  assert.ok(existsSync('src/app/auth/action/ActionContent.tsx'), 'action UI is missing');
  const { VerificationActionView } = load('src/app/auth/action/ActionContent.tsx', {
    './verification-action': load('src/app/auth/action/verification-action.ts'),
    '@/lib/firebase': { auth: {} }, 'firebase/auth': {},
  });
  for (const [state, text] of [['loading', 'Verifying your email'], ['success', 'Email verified'], ['error', 'We couldn’t verify this link']]) {
    const html = renderToStaticMarkup(React.createElement(VerificationActionView, { state, continuePath: '/verify-email?next=%2Fsetup' }));
    assert.ok(DomUtils.textContent(parseDocument(html)).includes(text));
    assert.match(html, /IOPPS/);
    assert.doesNotMatch(html, /oobCode|Firebase|fictional-code/);
    if (state === 'success') assert.match(html, /Continue to IOPPS/);
    if (state === 'error') assert.match(html, /Request a new verification email/);
  }
});

test('verification action validates mode and server operation before applying, with safe continuation', async () => {
  assert.ok(existsSync('src/app/auth/action/verification-action.ts'), 'branded verification handler is missing');
  const { completeVerificationAction, verificationContinuePath } = load('src/app/auth/action/verification-action.ts');
  const calls = [];
  const adapter = { check: async () => { calls.push('check'); return { operation: 'VERIFY_EMAIL' }; }, apply: async () => { calls.push('apply'); } };
  await completeVerificationAction(new URLSearchParams({ mode: 'verifyEmail', oobCode: 'fictional-code' }), adapter);
  assert.deepEqual(calls, ['check', 'apply']);
  for (const params of [{}, { mode: 'resetPassword', oobCode: 'fictional-code' }, { mode: 'verifyEmail', oobCode: ' ' }]) {
    calls.length = 0;
    await assert.rejects(completeVerificationAction(new URLSearchParams(params), adapter));
    assert.equal(calls.length, 0);
  }
  calls.length = 0;
  await assert.rejects(completeVerificationAction(new URLSearchParams({ mode: 'verifyEmail', oobCode: 'fictional-code' }), { ...adapter, check: async () => ({ operation: 'PASSWORD_RESET' }) }));
  assert.equal(calls.length, 0);
  await assert.rejects(completeVerificationAction(new URLSearchParams({ mode: 'verifyEmail', oobCode: 'fictional-code' }), { ...adapter, check: async () => { throw new Error('expired'); } }));
  const origin = 'https://fixture.invalid';
  assert.equal(verificationContinuePath(origin + '/verify-email?next=%2Fjobs%2Fone%3Fsave%3D1', origin), '/verify-email?next=%2Fjobs%2Fone%3Fsave%3D1');
  for (const value of ['https://evil.invalid/verify-email', '//evil.invalid', '/\\\\evil.invalid', '/verify-email?next=%2F%2Fevil.invalid', '/verify-email?next=%2Fverify-email%2Faction', '/verify-email?next=%2Fauth%2Faction', '/verify-email?next=%2F..%2Fauth%2Faction', '/login?redirect=//evil.invalid']) {
    assert.equal(verificationContinuePath(value, origin), '/verify-email?next=%2Fsetup');
  }
});

test('setup resolves employer and member intents before mounting the member writer', () => {
  assert.ok(existsSync('src/app/setup/destination.ts'), 'setup needs account-aware routing');
  const { setupDestination, setupCompletionDestination } = load('src/app/setup/destination.ts');
  const query = new URLSearchParams({ redirect: '/jobs/example?save=1', plan: 'tier2', intent: 'hiring' });
  assert.equal(setupDestination('/setup', query), null);
  assert.equal(setupDestination('/feed', query), null);
  assert.match(setupDestination('/org/onboarding', query), /^\/org\/onboarding\?/);
  const incomplete = setupDestination('/org/onboarding?reason=incomplete-profile&required=name', query);
  assert.match(incomplete, /reason=incomplete-profile/);
  assert.match(incomplete, /required=name/);
  assert.match(setupDestination('/org/dashboard', query), /^\/org\/checkout\?plan=tier2/);
  assert.equal(setupDestination('/admin', query), '/admin');
  assert.equal(setupDestination('/org/dashboard', new URLSearchParams({ redirect: '/setup' })), '/org/dashboard');
  assert.throws(() => setupDestination('//evil.invalid', query));
  assert.equal(setupCompletionDestination(query), '/jobs/example?save=1');
  for (const redirect of ['/setup', '/onboarding', '//evil.invalid', '/setup?redirect=/setup']) {
    assert.equal(setupCompletionDestination(new URLSearchParams({ redirect })), '/feed');
  }
  const source = readFileSync('src/app/setup/page.tsx', 'utf8');
  assert.match(source, /<SetupAccess/);
  assert.match(source, /router.push\(setupCompletionDestination\(searchParams\)\)/);
});

test('legacy onboarding redirects to the canonical setup without losing supported intent', async () => {
  const source = readFileSync('src/app/onboarding/page.tsx', 'utf8');
  assert.doesNotMatch(source, /const save = async/, 'duplicate onboarding writer must be retired');
  let destination;
  const page = load('src/app/onboarding/page.tsx', { 'next/navigation': { redirect: path => { destination = path; } } }).default;
  await page({ searchParams: Promise.resolve({ redirect: '/jobs/example?save=1', intent: 'hiring', type: 'employer', plan: 'tier2' }) });
  const url = new URL(destination, 'https://fixture.invalid');
  assert.equal(url.pathname, '/setup');
  assert.equal(url.searchParams.get('redirect'), '/jobs/example?save=1');
  assert.equal(url.searchParams.get('intent'), 'hiring');
  assert.equal(url.searchParams.get('plan'), 'tier2');
  await page({ searchParams: Promise.resolve({ redirect: '//evil.invalid' }) });
  assert.equal(destination, '/setup');
});
