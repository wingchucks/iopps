import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import { Firestore, FieldValue } from '@google-cloud/firestore';

// Actual report route, moderation queue route and ReportButton with an in-memory
// Firestore. The real Firestore serializer validates every write; nothing commits.
const validator = new Firestore({ projectId: 'demo-content-reports-offline' });
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function load(file, imports, globals = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(compile(file), { module: loaded, exports: loaded.exports, console: { error() {} }, ...globals, require: id => {
    if (id in imports) return imports[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return loaded.exports;
}
const reports = () => load('src/lib/firestore/reports.ts', {});

function database() {
  const rows = new Map();
  let auto = 0, failure = null, queue = Promise.resolve();
  const snapshot = path => ({ id: path.split('/')[1], exists: rows.has(path), data: () => rows.get(path) && structuredClone(rows.get(path)) });
  const collection = name => ({
    doc: (id = `auto-${++auto}`) => ({
      path: `${name}/${id}`, id,
      get: async () => snapshot(`${name}/${id}`),
      update: async data => { validator.batch().update(validator.doc(`${name}/${id}`), data); rows.set(`${name}/${id}`, { ...rows.get(`${name}/${id}`), ...data }); },
    }),
    orderBy() { return this; }, limit() { return this; },
    async get() {
      const docs = [...rows.keys()].filter(path => path.startsWith(`${name}/`)).map(snapshot)
        .map(doc => ({ ...doc, data: () => doc.data() }));
      return { docs };
    },
  });
  const db = {
    rows, collection,
    fail(error) { failure = error; },
    runTransaction(fn) {
      const task = queue.then(async () => {
        if (failure) throw failure;
        const writes = [];
        const tx = {
          get: async ref => snapshot(ref.path),
          getAll: async (...refs) => refs.map(ref => snapshot(ref.path)),
          create: (ref, data) => { validator.batch().create(validator.doc(ref.path), data); writes.push(['create', ref.path, data]); },
          set: (ref, data) => { validator.batch().set(validator.doc(ref.path), data); writes.push(['set', ref.path, data]); },
        };
        const result = await fn(tx);
        for (const [kind, path, data] of writes) {
          if (kind === 'create' && rows.has(path)) throw new Error('ALREADY_EXISTS');
          rows.set(path, data);
        }
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
  return db;
}

function api() {
  const db = database();
  const users = {
    'member-a': { decodedToken: { uid: 'member-a', name: 'Token Name' }, userData: {}, viewerEmail: 'member-a@example.invalid' },
    'member-b': { decodedToken: { uid: 'member-b' }, userData: { displayName: '  Profile   Name ' }, viewerEmail: null },
  };
  const json = (body, init = {}) => ({ status: init.status || 200, body });
  const route = load('src/app/api/reports/route.ts', {
    'next/server': { NextResponse: { json } },
    'firebase-admin/firestore': { FieldValue },
    'node:crypto': crypto,
    '@/lib/api-auth': { verifyAuthToken: async request => {
      const viewer = users[request.headers.authorization?.replace('Bearer ', '')];
      return viewer ? { success: true, ...viewer } : { success: false, response: json({ error: 'Unauthorized' }, { status: 401 }) };
    } },
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/firestore/reports': reports(),
  }, { Date: { now: () => clock.now } });
  const clock = { now: 1_800_000_000_000 };
  const send = (body, uid = 'member-a') => route.POST({
    headers: { authorization: uid ? `Bearer ${uid}` : undefined },
    json: async () => { if (body instanceof Error) throw body; return body; },
  });
  const flags = () => [...db.rows].filter(([path]) => path.startsWith('contentFlags/')).map(([path, data]) => ({ id: path.split('/')[1], ...data }));
  return { db, clock, send, flags };
}

const report = (overrides = {}) => ({ targetType: 'post', targetId: 'event-fictional-gathering', targetTitle: 'Fictional Gathering', reason: 'spam', ...overrides });

test('a signed-in report with blank details and no profile name reaches the moderation queue', async () => {
  const h = api();
  const result = await h.send(report({ reason: 'harassment' }), 'member-a');
  assert.equal(result.status, 201);
  const [flag] = h.flags();
  assert.deepEqual(Object.keys(flag).sort(), ['category', 'createdAt', 'id', 'reason', 'reporter', 'reporterEmail', 'reporterId', 'reporterName', 'severity', 'source', 'status', 'subjectId', 'subjectTitle', 'subjectType', 'updatedAt'].sort());
  assert.equal(flag.status, 'pending');
  assert.equal(flag.severity, 'high');
  assert.equal(flag.category, 'harassment');
  assert.equal(flag.subjectType, 'post');
  assert.equal(flag.subjectId, 'event-fictional-gathering');
  assert.equal(flag.subjectTitle, 'Fictional Gathering');
  assert.equal(flag.reporterId, 'member-a');
  assert.equal(flag.reporterName, 'Token Name');
  assert.ok(Object.values(flag).every(value => value !== undefined));

  // The admin moderation API reads the same document shape.
  const moderation = load('src/app/api/admin/moderation/route.ts', {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, body }) } },
    '@/lib/api-auth': { verifyAdminToken: async () => ({ success: true }) },
    '@/lib/firebase-admin': { adminDb: h.db },
  }, { URL });
  const queue = await moderation.GET({ url: 'https://www.iopps.ca/api/admin/moderation' });
  assert.equal(queue.status, 200);
  assert.equal(queue.body.reports.length, 1);
  assert.equal(queue.body.reports[0].status, 'pending');
  assert.equal(queue.body.reports[0].category, 'harassment');
  assert.equal(queue.body.reports[0].reporterName, 'Token Name');
});

test('optional text is omitted rather than stored as undefined or blank, and details are kept', async () => {
  const h = api();
  assert.equal((await h.send({ targetType: 'post', targetId: 'story-one', reason: 'other', targetTitle: '   ', details: '   ' }, 'member-b')).status, 201);
  assert.equal((await h.send({ targetType: 'post', targetId: 'story-two', reason: 'misinformation', details: '  The dates\r\nare wrong.  ' }, 'member-b')).status, 201);
  const [blank, detailed] = h.flags();
  for (const key of ['subjectTitle', 'description', 'reporterEmail']) assert.equal(Object.hasOwn(blank, key), false, key);
  assert.equal(blank.reporterName, 'Profile Name');
  assert.equal(detailed.description, 'The dates\nare wrong.');
  assert.equal(detailed.severity, 'medium');
});

test('signed-out and invalid reports are rejected without writing', async () => {
  const h = api();
  assert.equal((await h.send(report(), null)).status, 401);
  for (const body of [
    report({ reason: 'offensive' }), report({ targetType: 'job' }), report({ targetId: '' }), report({ targetId: 'posts/other' }),
    report({ targetId: 'x'.repeat(301) }), report({ targetTitle: 't'.repeat(301) }), report({ targetTitle: 42 }),
    report({ details: 'd'.repeat(2001) }), report({ details: ['array'] }), null, [], 'text', new SyntaxError('bad json'),
  ]) {
    const result = await h.send(body);
    assert.equal(result.status, 400, JSON.stringify(body));
  }
  assert.equal((await h.send(report({ details: 'd'.repeat(2000), targetTitle: 't'.repeat(300) }))).status, 201);
  assert.equal(h.flags().length, 1);
});

test('repeat reports of the same content by the same member are de-duplicated until moderators close it', async () => {
  const h = api();
  assert.equal((await h.send(report())).status, 201);
  const repeat = await h.send(report({ reason: 'harassment', details: 'Again' }));
  assert.equal(repeat.status, 200);
  assert.equal(repeat.body.duplicate, true);
  assert.equal(h.flags().length, 1);
  assert.equal((await h.send(report(), 'member-b')).status, 201, 'another member is a separate report');
  assert.equal((await h.send(report({ targetId: 'event-other' }))).status, 201, 'other content is a separate report');
  const [first] = h.flags();
  h.db.rows.set(`contentFlags/${first.id}`, { ...h.db.rows.get(`contentFlags/${first.id}`), status: 'resolved' });
  assert.equal((await h.send(report())).status, 201, 'closed reports do not block a new report');
  assert.equal(h.flags().length, 4);
  const concurrent = await Promise.all([h.send(report({ targetId: 'event-race' })), h.send(report({ targetId: 'event-race' }))]);
  assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 201]);
});

test('reports are rate limited per member per hour and per day', async () => {
  const h = api();
  for (let index = 0; index < 10; index++) assert.equal((await h.send(report({ targetId: `event-${index}` }))).status, 201);
  const limited = await h.send(report({ targetId: 'event-over' }));
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /try again later/);
  assert.equal((await h.send(report({ targetId: 'event-over' }), 'member-b')).status, 201, 'limits are per member');
  assert.equal((await h.send(report({ targetId: 'event-0' }))).body.duplicate, true, 'duplicates do not need quota');
  let created = 10;
  for (let hour = 1; hour <= 3; hour++) {
    h.clock.now += 60 * 60 * 1000 + 1;
    for (let index = 0; index < 10; index++) if ((await h.send(report({ targetId: `event-${hour}-${index}` }))).status === 201) created++;
  }
  assert.equal(created, 30);
  h.clock.now += 24 * 60 * 60 * 1000;
  assert.equal((await h.send(report({ targetId: 'event-next-day' }))).status, 201);
});

test('moderators can resolve a submitted report, which lets the member report that content again', async () => {
  const h = api();
  assert.equal((await h.send(report())).status, 201);
  const [flag] = h.flags();
  const { Timestamp } = await import('@google-cloud/firestore');
  const action = load('src/app/api/admin/moderation/[reportId]/route.ts', {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, body }) } },
    '@/lib/api-auth': { verifyAdminToken: async () => ({ success: true, decodedToken: { uid: 'admin-a' } }) },
    '@/lib/firebase-admin': { adminDb: h.db },
    'firebase-admin/firestore': { FieldValue, Timestamp },
  });
  for (const step of ['save_notes', 'dismiss']) {
    const result = await action.POST({ json: async () => ({ action: step, notes: 'Reviewed', adminNotes: 'Fictional note' }) }, { params: Promise.resolve({ reportId: flag.id }) });
    assert.equal(result.status, 200, step);
  }
  assert.equal(h.db.rows.get(`contentFlags/${flag.id}`).status, 'resolved');
  assert.equal(h.db.rows.get(`contentFlags/${flag.id}`).resolution, 'dismiss');
  assert.equal((await h.send(report())).status, 201);
});

test('storage failures are reported as temporarily unavailable', async () => {
  const h = api();
  h.db.fail(new Error('fictional outage'));
  const result = await h.send(report());
  assert.equal(result.status, 503);
  assert.equal(h.flags().length, 0);
});

// ── ReportButton ──────────────────────────────────────────────────────────────
function button(user, responder = async () => ({ status: 201, body: { success: true, duplicate: false } })) {
  let cells = [], cursor = 0;
  const requests = [], toasts = [], timers = [];
  const react = { useState(initial) { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }]; } };
  const jsx = (type, props) => ({ type, props });
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const { status, body } = await responder(JSON.parse(options.body));
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  const globals = { fetch, window: { location: { pathname: '/events/fictional-gathering', search: '?tab=details' } }, setTimeout: callback => timers.push(callback) };
  const Component = load('src/components/ReportButton.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'a' }, './Button': { default: 'button' },
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: (message, type) => toasts.push({ message, type }) }) },
    '@/lib/firestore/reports': load('src/lib/firestore/reports.ts', {}, globals),
  }, globals).default;
  const nodes = tree => tree == null || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const text = tree => nodes(tree).flatMap(node => [node.props?.children].flat()).filter(value => typeof value === 'string' || typeof value === 'number').join(' ');
  const render = () => { cursor = 0; return Component({ targetType: 'post', targetId: 'event-fictional-gathering', targetTitle: 'Fictional Gathering' }); };
  const find = predicate => nodes(render()).find(predicate);
  return { requests, toasts, timers, render, text: () => text(render()), find, open: () => find(node => node.props?.title === 'Report').props.onClick() };
}

test('signed-out visitors get a sign-in prompt that returns to the reported page', () => {
  const h = button(null);
  h.open();
  const link = h.find(node => node.type === 'a');
  assert.equal(link.props.href, '/login?redirect=%2Fevents%2Ffictional-gathering%3Ftab%3Ddetails');
  assert.match(h.text(), /Sign in to report content/);
  assert.equal(h.find(node => node.type === 'textarea'), undefined);
  assert.equal(h.find(node => node.props?.children === 'Submit Report'), undefined);
  assert.equal(h.requests.length, 0);
});

test('a signed-in report with blank details submits through the API and confirms', async () => {
  const user = { uid: 'member-a', displayName: null, getIdToken: async () => 'fictional-token' };
  const h = button(user);
  h.open();
  assert.equal(h.find(node => node.props?.children === 'Submit Report').props.disabled, true, 'a reason is required');
  h.find(node => node.type === 'input' && node.props.value === 'spam').props.onChange();
  assert.equal(h.find(node => node.type === 'textarea').props.maxLength, 2000);
  await h.find(node => node.props?.children === 'Submit Report').props.onClick();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, '/api/reports');
  assert.equal(h.requests[0].options.method, 'POST');
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer fictional-token');
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { targetType: 'post', targetId: 'event-fictional-gathering', reason: 'spam', targetTitle: 'Fictional Gathering' });
  assert.match(h.text(), /Report Submitted/);
  assert.deepEqual(h.toasts, []);
  h.timers.forEach(callback => callback());
  assert.equal(h.find(node => node.type === 'textarea'), undefined, 'dialog closes after confirmation');
});

test('duplicate, rate-limited and failed reports give accurate feedback', async () => {
  const user = { uid: 'member-a', getIdToken: async () => 'fictional-token' };
  for (const [status, body, expected] of [
    [200, { success: true, duplicate: true }, /Already Reported/],
    [429, { error: 'Too many' }, /several reports recently/],
    [503, { error: 'Unavailable' }, /Failed to submit report/],
    [401, { error: 'Unauthorized' }, /sign in again/],
  ]) {
    const h = button(user, async () => ({ status, body }));
    h.open();
    h.find(node => node.type === 'input' && node.props.value === 'other').props.onChange();
    h.find(node => node.type === 'textarea').props.onChange({ target: { value: '  Context for moderators  ' } });
    await h.find(node => node.props?.children === 'Submit Report').props.onClick();
    assert.equal(JSON.parse(h.requests[0].options.body).details, 'Context for moderators');
    if (status === 200) assert.match(h.text(), expected);
    else {
      assert.match(h.toasts[0].message, expected);
      assert.ok(h.find(node => node.type === 'textarea'), 'the draft stays open for retry');
    }
  }
});
