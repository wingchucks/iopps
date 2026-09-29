/* eslint-disable @typescript-eslint/no-explicit-any -- Narrow VM double for admin route database/auth boundary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

interface FakeDoc {
  exists: boolean;
  data: () => any;
}

function makeDb() {
  const employers = new Map<string, any>([
    ['kitsaki', { displayName: 'Kitsaki Management Limited Partnership', standardPostCredits: 0 }],
    ['no-balance-field', { displayName: 'No Balance Co' }],
  ]);
  const auditLogs: any[] = [];
  const applyUpdate = (store: Map<string, any>, id: string, patch: any) => {
    const current = store.get(id) ?? {};
    const next = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === 'object' && '__increment' in (value as any)) {
        const base = typeof next[key] === 'number' ? next[key] : 0;
        next[key] = base + (value as any).__increment;
      } else {
        next[key] = value;
      }
    }
    store.set(id, next);
  };
  const db = {
    collection: (name: string) => {
      if (name === 'employers') {
        return {
          doc: (id: string) => ({
            get: async (): Promise<FakeDoc> => ({
              exists: employers.has(id),
              data: () => employers.get(id),
            }),
            update: async (patch: any) => applyUpdate(employers, id, patch),
          }),
        };
      }
      if (name === 'auditLogs') {
        return { add: async (entry: any) => { auditLogs.push(entry); return { id: 'audit-1' }; } };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };
  return { db, employers, auditLogs };
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
      body: JSON.stringify(body),
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
  assert.match(auditLogs[0].message, /kitsaki/i);
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
