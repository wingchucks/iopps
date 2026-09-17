import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('read-only release audit denies unauthenticated and non-owner requests before scanning', async () => {
  let identity = 'anonymous';
  let scans = 0;
  let project = 'demo-audit';
  const exports: Record<string, (r: Request) => Promise<Response>> = {};
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (data: unknown, options: ResponseInit) => Response.json(data, options) } },
    'firebase-admin/firestore': { FieldPath: {} },
    '@/lib/api-auth': { verifyAdminToken: async () => identity === 'anonymous'
      ? { success: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
      : { success: true, isSuperAdmin: identity === 'owner' } },
    '@/lib/firebase-admin': { getAdminDb: () => ({}), getAdminApp: () => ({ options: { projectId: project } }) },
    '@/lib/server/release-inventory.mjs': {
      AUDIT_FIELDS: { users: ['role'] },
      scanCollection: async () => { scans++; return {}; },
      summarizeCollections: () => ({ countsOnly: true }),
    },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/release-audit/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, process: { env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-audit' } }, require: (id: string) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  const request = new Request('https://example.test/api/admin/release-audit', { method: 'POST' });
  assert.equal((await exports.POST(request)).status, 401);
  identity = 'admin';
  assert.equal((await exports.POST(request)).status, 403);
  assert.equal(scans, 0);
  identity = 'owner'; project = 'different-project';
  assert.equal((await exports.POST(request)).status, 503);
  assert.equal(scans, 0);
  project = 'demo-audit';
  const response = await exports.POST(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(scans, 1);
});
