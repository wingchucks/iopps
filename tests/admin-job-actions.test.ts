/* eslint-disable @typescript-eslint/no-explicit-any -- Narrow VM double for admin route database/auth boundary. */
import test from 'node:test';
import { isPublicJobRecordVisible } from '../src/lib/public-job-merge.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { activateAdminJob } from '../src/lib/server/admin-job-lifecycle.ts';
import { paidImportMemoryDb } from './helpers/paid-import-fixtures.mjs';

test('admin jobs UI uses the implemented authenticated POST action endpoint', () => {
  const source = readFileSync('src/app/admin/jobs/page.tsx', 'utf8');
  assert.doesNotMatch(source, /fetch\(`\/api\/admin\/jobs\/\$\{/);
  assert.match(source, /jobId: job.id/);
  assert.match(source, /jobId: deleteTarget.id/);
  assert.match(source, /action:.*activate/);
});

test('admin activate/deactivate synchronize both publication fields', async () => {
  const store=paidImportMemoryDb();const updates=store.jobWrites;
  store.rows.set('jobs/fixture',{employerId:'owner',status:'draft',active:false});
  store.rows.set('employers/owner',{standardPostCredits:1});
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/jobs/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, console, require: (id: string) => {
      if (id === 'next/server') return { NextResponse: { json: Response.json } };
      if (id === '@/lib/firebase-admin') return { adminDb: store.db };
      if (id === '@/lib/server/admin-job-lifecycle') return { activateAdminJob };
      if (id === '@/lib/public-job-merge') return { isPublicJobRecordVisible };
      if (id === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => 'fictional-time' } };
      if (id === '@/lib/api-auth') return { verifyAdminToken: async () => ({ success: true }) };
      throw new Error(id);
    },
  });
  for (const [action, status, active] of [['activate', 'active', true], ['deactivate', 'closed', false]]) {
    const response = await exports.POST(new Request('http://127.0.0.1/api/admin/jobs', { method: 'POST', body: JSON.stringify({ jobId: 'fixture', action }) }));
    assert.equal(response.status, 200);
    assert.equal(updates.at(-1).active, active);
    assert.equal(updates.at(-1).status, status);
  }
});
