import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Error, console, URLSearchParams, window: { scrollTo() {} }, setTimeout, clearTimeout, AbortController, process: { env: {} },
    fetch: mocks.fetch || (async () => ({ ok: true, json: async () => ({ sent: true }) })),
    require(id) {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/lib/')) return load(`src/lib/${id.slice(6)}.ts`, mocks);
      throw Error(`Unexpected dependency ${id}`);
    },
  });
  return exports;
}
function provider({ createError, profileError, emailError, currentUser, response, fetcher } = {}) {
  const calls = [];
  const created = { uid: 'created-by-this-attempt', email: 'fictional@example.invalid', emailVerified: false, getIdToken: async () => 'fictional-token' };
  const auth = { currentUser: currentUser ?? created };
  const context = load('src/lib/auth-context.tsx', {
    ...(fetcher ? { fetch: fetcher } : response ? { fetch: async () => response } : {}),
    react: { createContext: () => ({ Provider: 'provider' }), useState: () => [null, () => {}], useEffect: () => {} },
    'react/jsx-runtime': { jsx: (type, props) => props },
    './firebase': { auth, getAppCheckTokenValue: async () => { if (emailError) throw emailError; return ''; } },
    'firebase/auth': {
      createUserWithEmailAndPassword: async () => { calls.push('create'); if (createError) throw createError; return { user: created }; },
      updateProfile: async () => { calls.push('profile'); if (profileError) throw profileError; },
      sendEmailVerification: async () => { calls.push('email'); if (emailError) throw emailError; },
      signOut: async () => { calls.push('signout'); },
    },
  }).AuthProvider({ children: null }).value;
  return { context, calls, created, auth };
}
function signupPage({ user = null, outcome, signupError, query = new URLSearchParams() } = {}) {
  const state = []; let cursor = 0; const calls = []; const destinations = [];
  const react = { useEffect() {}, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; }, useCallback: f => f, useRef: value => ({ current: value }), Suspense: 'Suspense' };
  const jsx = (type, props) => ({ type, props });
  const page = load('src/app/signup/page.tsx', {
    react: { ...react, default: react }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: path => calls.push(['push', path]) }), useSearchParams: () => query },
    '@/lib/auth-context': { useAuth: () => ({ user, sendVerificationEmail: async () => true, signUp: async (_name, _email, _password, destination) => { destinations.push(destination); calls.push('create'); if (signupError) throw signupError; return outcome; }, signInWithGoogle: async () => { calls.push('google'); throw Error('No provider access in tests'); } }) },
    'firebase/storage': {}, '@/lib/firebase': {}, '@/lib/pricing': {},
    './StepHeader': { StepHeader: 'StepHeader' },
    '@/components/signup/ui': new Proxy({}, { get: (_, name) => name }),
    '@/components/signup/constants': { CSS: {}, EMPLOYER_CAPABILITIES: [] },
  }).default;
  function render() { cursor = 0; return page().props.children.type(); }
  function find(predicate, node = render()) { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const match = find(predicate, child ?? null); if (match) return match; } return null; }
  function by(type, value) { const item = find(n => n.type === type && (!value || n.props.id === value || n.props.label === value)); assert.ok(item, `Missing ${type} ${value}`); return item; }
  by('RoleCard', 'Individual').props.onClick(); by('BtnPrimary').props.onClick();
  for (const [id, value] of Object.entries({ name: 'Fictional', email: 'fictional@example.invalid', password: 'Fictional1!', confirmPassword: 'Fictional1!' })) by('FormInput', id).props.onChange({ target: { value } });
  return { calls, destinations, render, find, by, setUser: value => { user = value; } };
}
test('creation outcome waits for UID-bound secure-session reconciliation (existing behavior)', async () => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let sessionStarted;
  const started = new Promise(resolve => { sessionStarted = resolve; });
  const { context, created } = provider({ fetcher: async url => {
    if (url === '/api/auth/session') { sessionStarted(); return held; }
    return { ok: false, status: 429 };
  } });
  let settled = false;
  const pending = context.signUp('Fictional', created.email, 'Fictional1!').then(value => { settled = true; return value; });
  await started;
  assert.equal(settled, false, 'no failure or success outcome before session reconciliation');
  release({ ok: true });
  const result = await pending;
  assert.equal(result.user.uid, created.uid);
  assert.equal(result.sessionReady, true);
  assert.equal(result.verificationEmailSent, false);
  assert.match(result.verificationError, /account was created/);
});

test('member signup goes through setup and retains the logged-out save intent', async () => {
  const query = new URLSearchParams({ redirect: '/jobs/fictional?save=1', plan: 'tier2' });
  const page = signupPage({ query, outcome: { user: { uid: 'created' }, verificationEmailSent: false, sessionReady: false } });
  page.by('input', 'signup-consent').props.onChange({ target: { checked: true } });
  await page.by('BtnPrimary').props.onClick();
  assert.equal(page.destinations[0], '/setup?redirect=%2Fjobs%2Ffictional%3Fsave%3D1');
});

test('reload rejects identity switches at every asynchronous boundary', async () => {
  for (const stage of ['reload', 'token', 'session']) {
    const { context, created, auth } = provider();
    const other = { uid: 'other', emailVerified: true, getIdToken: async () => 'other-token' };
    let tokens = 0;
    created.reload = async () => { if (stage === 'reload') auth.currentUser = other; };
    created.getIdToken = async () => { tokens++; if ((stage === 'token' && tokens === 1) || (stage === 'session' && tokens === 2)) auth.currentUser = other; return 'original-token'; };
    await assert.rejects(context.reloadUser(created.uid), error => error.code === 'auth/user-token-expired', stage);
  }
});
const limited = Object.assign(new Error('Firebase: sensitive internal detail (auth/too-many-requests).'), { code: 'auth/too-many-requests' });
test('confirmed creation survives downstream verification rate limit with truthful unsent outcome', async () => {
  const { context, created } = provider({ emailError: limited });
  const result = await context.signUp('Fictional', created.email, 'Fictional1!', '/setup');
  assert.equal(result.user.uid, created.uid);
  assert.equal(result.verificationEmailSent, false);
  assert.match(result.verificationError, /try again later/i);
  assert.doesNotMatch(result.verificationError, /Firebase|auth\//);
});
test('consent is required before either signup action and legal links preserve progress', async () => {
  const page = signupPage();
  const google = page.by('GoogleButton');
  await page.by('BtnPrimary').props.onClick();
  await google.props.onClick();
  assert.deepEqual(page.calls, []);
  const consent = page.by('input', 'signup-consent');
  assert.equal(consent.props.required, true);
  for (const href of ['/terms', '/privacy']) {
    const link = page.find(n => n.type === 'a' && n.props.href === href);
    assert.ok(link);
    assert.equal(link.props.target, '_blank');
  }
});
test('unrelated signed-in identity does not bypass account creation', async () => {
  const page = signupPage({ user: { uid: 'unrelated', emailVerified: true } });
  page.by('input', 'signup-consent').props.onChange({ target: { checked: true } });
  await page.by('BtnPrimary').props.onClick();
  assert.ok(page.find(n => n.type === 'StepHeader' && n.props.highlight === 'Account'));
});
test('created account advances to verification without an email-sent claim on downstream failure', async () => {
  const page = signupPage({ outcome: { user: { uid: 'created' }, verificationEmailSent: false, verificationError: 'Too many attempts. Please wait and try again later.', sessionReady: true, profileError: '' } });
  page.by('input', 'signup-consent').props.onChange({ target: { checked: true } });
  await page.by('BtnPrimary').props.onClick();
  assert.deepEqual(page.calls, ['create']);
  const header = page.by('StepHeader');
  assert.equal(header.props.highlight, 'Inbox');
  assert.doesNotMatch(header.props.desc, /sent a verification/);
  assert.ok(page.find(n => n.props?.role === 'status'));
});
test('successful resend retains profile and session warnings', async () => {
  const page = signupPage({outcome:{user:{uid:'created'}, verificationEmailSent:false, verificationError:'Delivery failed', profileError:'Name could not be saved', sessionReady:false}});
  page.by('input', 'signup-consent').props.onChange({target:{checked:true}});
  await page.by('BtnPrimary').props.onClick();
  page.setUser({uid:'created'});
  const resend = page.find(n => n.type === 'BtnSecondary' && JSON.stringify(n.props.children).includes('Resend'));
  assert.ok(resend); await resend.props.onClick();
  const notice = page.find(n => n.props?.role === 'status');
  assert.ok(notice); assert.match(JSON.stringify(notice.props.children), /Name could not be saved/);
  assert.match(JSON.stringify(notice.props.children), /session needs attention/);
  assert.doesNotMatch(JSON.stringify(notice.props.children), /Delivery failed/);
});
test('unknown creation error stays on account form and never renders raw error', async () => {
  const page = signupPage({ signupError: new Error('Firebase: private diagnostic secret') });
  page.by('input', 'signup-consent').props.onChange({ target: { checked: true } });
  await page.by('BtnPrimary').props.onClick();
  assert.equal(page.by('StepHeader').props.highlight, 'Account');
  assert.doesNotMatch(page.find(n => n.props?.role === 'alert').props.children, /Firebase|secret/);
  assert.equal(page.by('input', 'signup-consent').props.checked, true);
  assert.equal(page.by('FormInput', 'email').props.value, 'fictional@example.invalid');
});
test('email already in use is a real creation failure and not evidence of success', async () => {
  const error = Object.assign(new Error('private error'), { code: 'auth/email-already-in-use' });
  const { context, calls } = provider({ createError: error, currentUser: { uid: 'unrelated' } });
  await assert.rejects(context.signUp('Fictional', 'fictional@example.invalid', 'Fictional1!'), e => e === error);
  assert.deepEqual(calls, ['create']);
});
test('standalone verification does not assume an email was delivered on entry', () => {
  const source = readFileSync('src/app/verify-email/page.tsx', 'utf8');
  assert.ok(source.includes('resent ? "We sent a verification link to" : "Verify the email address"'));
});
test('auth surfaces use safe code mapping rather than rendering raw provider messages', () => {
  for (const route of ['login', 'forgot-password', 'signup', 'verify-email', 'settings/account']) {
    const source = readFileSync(`src/app/${route}/page.tsx`, 'utf8');
    assert.match(source, /authErrorMessage/);
    assert.doesNotMatch(source, /err instanceof Error \? err.message/);
  }
  const { authErrorMessage } = load('src/lib/auth-errors.ts');
  assert.equal(authErrorMessage({ code: 'auth/unknown-secret', message: 'private provider details' }), 'We couldn’t complete this request. Please try again.');
  assert.equal(authErrorMessage(new Error('Firebase: auth/too-many-requests secret')), 'We couldn’t complete this request. Please try again.');
  assert.match(authErrorMessage(limited), /try again later/);
});
test('profile rejection still attempts verification and retains confirmed identity', async () => {
  const { context, created } = provider({ profileError: limited });
  const result = await context.signUp('Fictional', created.email, 'Fictional1!');
  assert.equal(result.user.uid, created.uid);
  assert.equal(result.verificationEmailSent, true);
  assert.match(result.profileError, /try again later/);
});
test('verification HTTP rate limit is not bypassed through another delivery provider', async () => {
  const { context, calls } = provider({ response: { ok: false, status: 429 } });
  const result = await context.signUp('Fictional', 'fictional@example.invalid', 'Fictional1!');
  assert.equal(result.verificationEmailSent, false);
  assert.ok(!calls.includes('email'));
});
test('already verified response is not reported as email sent', async () => {
  const { context } = provider({ response: { ok: true, json: async () => ({ sent: false, alreadyVerified: true }) } });
  const result = await context.signUp('Fictional', 'fictional@example.invalid', 'Fictional1!');
  assert.equal(result.verificationEmailSent, false);
});
test('genuine creation rejection remains failure despite unrelated signed-in user', async () => {
  const { context, calls } = provider({ createError: limited, currentUser: { uid: 'unrelated' } });
  await assert.rejects(context.signUp('Fictional', 'fictional@example.invalid', 'Fictional1!'), e => e === limited);
  assert.deepEqual(calls, ['create']);
});
