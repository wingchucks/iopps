import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

test('applications route passes the current Auth email, not a stale token claim, to the snapshot', async () => {
  const calls = [];
  const persisted = { exists: true, id: 'uid-1_job-1', data: () => ({ userId: 'uid-1', postId: 'job-1', status: 'submitted' }) };
  const { POST } = sourceModule('src/app/api/applications/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/api-auth': { verifyAuthToken: async () => ({ success: true, viewerEmail: 'current@example.invalid', decodedToken: { uid: 'uid-1', email: 'stale@example.invalid', email_verified: true, firebase: { sign_in_provider: 'password' } } }) },
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => persisted }) }) }) },
    '@/lib/server/application-submission': { submitApplication: async (...args) => { calls.push(args); return { created: true, application: { id: 'uid-1_job-1' } }; } },
    '@/lib/server/application-document-archive': { archiveApplicationResume: async () => { throw new Error('no archive expected'); } },
    'firebase-admin/storage': { getStorage: () => { throw new Error('no storage expected'); } },
    'firebase-admin/firestore': { FieldValue: {}, Timestamp: { now: () => ({ toDate: () => new Date() }) } },
  } });
  const request = new Request('http://localhost/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: 'job-1', resumeType: 'profile' }) });
  request.headers.get = (orig => name => name.toLowerCase() === 'content-length' ? '50' : orig.call(request.headers, name))(request.headers.get);
  const response = await POST(request);
  assert.equal(response.status, 201);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][4])), { email: 'current@example.invalid' });
});
