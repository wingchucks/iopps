/* eslint-disable @typescript-eslint/no-explicit-any -- Narrow VM double for admin route database/auth boundary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function makeDb() {
  const employers = new Map<string, any>([
    ['kitsaki', { displayName: 'Fictional Employer', standardPostCredits: 0 }],
    ['no-balance-field', { displayName: 'No Balance Co' }],
  ]);
  const receipts = new Map<string, any>();
  const auditLogs: any[] = [];
  let failCommit = false, queue = Promise.resolve();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ name, id }) }),
    runTransaction: (fn: any) => {
      const pending = queue.then(async () => {
        const writes: any[] = [];
        const tx = {
          get: async (ref: any) => { const data = (ref.name === 'employers' ? employers : receipts).get(ref.id); return { exists: !!data, data: () => data }; },
          update: (ref: any, data: any) => writes.push({ ref, data }),
          create: (ref: any, data: any) => writes.push({ ref, data }),
        };
        const result = await fn(tx);
        if (failCommit) throw new Error('synthetic commit failure');
        for (const {ref,data} of writes) {
          if (ref.name === 'employers') employers.set(ref.id, { ...employers.get(ref.id), ...data });
          else { receipts.set(ref.id, data); auditLogs.push(data); }
        }
        return result;
      });
      queue = pending.then(() => undefined, () => undefined);
      return pending;
    },
  };
  return { db, employers, auditLogs, fail: (value: boolean) => { failCommit = value; } };
}

function loadRoute(db: any) {
  const exports: any = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/app/api/admin/employers/credits/route.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      console,
      require: (id: string) => {
        if (id === 'next/server') return { NextResponse: { json: Response.json }, NextRequest: Request };
        if (id === '@/lib/firebase-admin') return { adminDb: db };
        if (id === 'firebase-admin/firestore') {
          return {
            FieldValue: {
              serverTimestamp: () => 'fictional-time',
              increment: (n: number) => ({ __increment: n }),
            },
          };
        }
        if (id === '@/lib/api-auth') {
          return { verifyAdminToken: async () => ({ success: true, viewerEmail: 'admin@iopps.ca' }) };
        }
        throw new Error(id);
      },
    },
  );
  return exports;
}

const post = (exports: any, body: unknown) =>
  exports.POST(
    new Request('http://127.0.0.1/api/admin/employers/credits', {
      method: 'POST',
      body: JSON.stringify({ requestId: crypto.randomUUID(), ...(body as object) }),
    }),
  );

test('admin can grant posting credits to an employer', async () => {
  const { db, employers, auditLogs } = makeDb();
  const exports = loadRoute(db);

  const response = await post(exports, { employerId: 'kitsaki', credits: 1 });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.granted, 1);
  assert.equal(json.balance, 1);
  assert.equal(employers.get('kitsaki').standardPostCredits, 1);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].type, 'credit_grant');
  assert.match(auditLogs[0].message, /Fictional Employer/);
});

test('grant treats a missing balance as zero and accumulates', async () => {
  const { db, employers } = makeDb();
  const exports = loadRoute(db);

  await post(exports, { employerId: 'no-balance-field', credits: 2 });
  const response = await post(exports, { employerId: 'no-balance-field', credits: 3 });
  const json = await response.json();
  assert.equal(json.balance, 5);
  assert.equal(employers.get('no-balance-field').standardPostCredits, 5);
});

test('grant rejects bad input and unknown employers', async () => {
  const { db } = makeDb();
  const exports = loadRoute(db);

  for (const body of [
    { employerId: '', credits: 1 },
    { employerId: 'kitsaki', credits: 0 },
    { employerId: 'kitsaki', credits: 101 },
    { employerId: 'kitsaki', credits: 1.5 },
    { employerId: 'kitsaki', credits: '1' },
    { employerId: '../evil', credits: 1 },
  ]) {
    const response = await post(exports, body);
    assert.equal(response.status, 400, JSON.stringify(body));
  }

  const missing = await post(exports, { employerId: 'ghost', credits: 1 });
  assert.equal(missing.status, 404);
});


test('failed atomic commit changes neither balance nor audit; retry grants once', async () => {
  const h = makeDb(), route = loadRoute(h.db), body = { employerId: 'kitsaki', credits: 1, requestId: crypto.randomUUID() };
  h.fail(true);
  assert.equal((await post(route, body)).status, 500);
  assert.equal(h.employers.get('kitsaki').standardPostCredits, 0);
  assert.equal(h.auditLogs.length, 0);
  h.fail(false);
  assert.equal((await post(route, body)).status, 200);
  assert.equal(h.employers.get('kitsaki').standardPostCredits, 1);
  assert.equal(h.auditLogs.length, 1);
});

test('response-loss retry and concurrent duplicate requests grant only once', async () => {
  const h = makeDb(), route = loadRoute(h.db), body = { employerId: 'kitsaki', credits: 20, requestId: crypto.randomUUID() };
  const responses = await Promise.all([post(route, body), post(route, body), post(route, body)]);
  for (const response of responses) assert.equal((await response.json()).balance, 20);
  assert.equal(h.employers.get('kitsaki').standardPostCredits, 20);
  assert.equal(h.auditLogs.length, 1);
  assert.equal((await post(route, { ...body, credits: 1 })).status, 409);
});

test('independent concurrent grants return accurate serialized balances', async () => {
  const h = makeDb(), route = loadRoute(h.db);
  const results = await Promise.all([post(route, { employerId: 'kitsaki', credits: 2 }), post(route, { employerId: 'kitsaki', credits: 3 })]);
  assert.deepEqual(await Promise.all(results.map(async r => (await r.json()).balance)), [2, 5]);
  assert.equal(h.employers.get('kitsaki').standardPostCredits, 5);
  assert.equal(h.auditLogs.length, 2);
});

test('missing or unsafe retry IDs are refused before mutation', async () => {
  const h = makeDb(), route = loadRoute(h.db);
  for (const requestId of [undefined, '', '../bad', 'x']) assert.equal((await post(route, { employerId: 'kitsaki', credits: 1, requestId })).status, 400);
  assert.equal(h.employers.get('kitsaki').standardPostCredits, 0);
});
