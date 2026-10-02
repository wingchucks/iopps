import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/memory-firestore.mjs';

const BUCKET = 'demo-iopps-preview.appspot.com';
const PDF = 'application/pdf';
const objectUrl = (objectPath, bucket = BUCKET) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=fictional`;
const SAVED = 'resumes/candidate/saved.pdf';

// The real route, submission transaction, ownership validator and archive copy. Only the ID token
// check, Firestore (in-memory transactions) and the Admin Storage bucket are doubles.
function harness({ objects = { [SAVED]: { size: 1200, contentType: PDF, generation: '42' } }, member = { displayName: 'Candidate', resumeUrl: objectUrl(SAVED), resumeFileName: 'Saved CV.pdf' }, token = {}, onCopy } = {}) {
  const memory = memoryFirestore({
    'jobs/optional': { type: 'job', title: 'Optional role', status: 'active', orgId: 'org' },
    'jobs/required': { type: 'job', title: 'Required role', status: 'active', orgId: 'org', requiresResume: true },
    ...(member ? { 'members/candidate': member } : {}),
  });
  const copies = [], metadataReads = [];
  const bucket = {
    name: BUCKET,
    file: (objectPath, options) => ({
      name: objectPath,
      async getMetadata() {
        metadataReads.push(objectPath);
        const object = objects[objectPath];
        if (!object) throw Object.assign(new Error('No such object'), { code: 404 });
        return [{ size: String(object.size), contentType: object.contentType, generation: object.generation ?? '7' }];
      },
      async copy(destination, copyOptions) {
        copies.push({ source: objectPath, generation: options?.generation, destination: destination.name, copyOptions });
        await onCopy?.(memory, copies.length);
      },
    }),
  };
  const { POST } = sourceModule('src/app/api/applications/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/api-auth': { verifyAuthToken: async () => ({ success: true, viewerEmail: 'candidate@example.invalid',
      decodedToken: { uid: 'candidate', email_verified: true, firebase: { sign_in_provider: 'password' }, ...token } }) },
    '@/lib/firebase-admin': { getAdminDb: () => memory.db },
    'firebase-admin/storage': { getStorage: () => ({ bucket: name => { assert.equal(name, BUCKET); return bucket; } }) },
  // One Error constructor across the module contexts, as in a single production realm.
  }, globals: { Error, process: { env: { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: BUCKET } } } });
  const submit = async body => {
    const response = await POST(new Request('https://www.iopps.ca/api/applications', { method: 'POST', headers: { authorization: 'Bearer fictional', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json() };
  };
  return { submit, copies, metadataReads, saved: postId => memory.read(`applications/candidate_${postId}`) };
}

test('no browser code downloads Storage objects, which would need a CORS policy on the bucket', () => {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full); else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
    }
  };
  walk('src');
  assert.deepEqual(files.filter(file => /\b(getBlob|getBytes|getStream)\b/.test(readFileSync(file, 'utf8'))), []);
  const page = readFileSync('src/app/jobs/[slug]/apply/page.tsx', 'utf8');
  const submit = page.slice(page.indexOf('const handleSubmit'), page.indexOf('const retryNotification'));
  assert.doesNotMatch(submit, /uploadBytes|getDownloadURL|ref\(storage/, 'submitting an application never touches Storage from the browser');
  assert.match(submit, /resumeUrl: useProfile \? "" : resumeUrl/);
});

test('a saved profile resume is copied by the server from the applicant\'s own folder, never from a client URL', async () => {
  const h = harness({ objects: { [SAVED]: { size: 1200, contentType: PDF, generation: '42' }, 'resumes/other/theirs.pdf': { size: 10, contentType: PDF } } });
  const result = await h.submit({ postId: 'required', resumeType: 'profile', resumeUrl: objectUrl('resumes/other/theirs.pdf'), resumeFileName: 'Forged.pdf' });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.deepEqual(h.metadataReads, [SAVED]);
  assert.equal(h.copies.length, 1);
  const [copy] = h.copies;
  assert.equal(copy.source, SAVED);
  assert.equal(copy.generation, '42', 'the inspected generation is the one copied');
  assert.match(copy.destination, /^application-documents\/candidate\/[0-9a-f-]{36}$/);
  assert.equal(copy.copyOptions.preconditionOpts.ifGenerationMatch, 0);
  assert.equal(copy.copyOptions.contentType, PDF);
  const stored = h.saved('required');
  assert.equal(stored.resumeUrl, `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(copy.destination)}?alt=media&token=${copy.copyOptions.metadata.firebaseStorageDownloadTokens}`);
  assert.deepEqual([stored.resumeType, stored.resumeFileName], ['profile', 'Saved CV.pdf']);
  assert.equal(result.body.application.resumeUrl, stored.resumeUrl);
  assert.equal(result.body.application.resumeFileName, 'Saved CV.pdf');
});

test('a saved resume that is not the applicant\'s own, outside the limits or missing is refused before anything is saved', async () => {
  for (const [label, resumeUrl, objects] of [
    ['another member\'s resume', objectUrl('resumes/other/theirs.pdf'), { 'resumes/other/theirs.pdf': { size: 10, contentType: PDF } }],
    ['another bucket', objectUrl(SAVED, 'other-bucket.appspot.com'), { [SAVED]: { size: 10, contentType: PDF } }],
    ['not a Storage object', 'https://evil.example/resume.pdf', {}],
    ['not a URL', SAVED, { [SAVED]: { size: 10, contentType: PDF } }],
    ['outside the resume folder', objectUrl('avatars/candidate.pdf'), { 'avatars/candidate.pdf': { size: 10, contentType: PDF } }],
    ['5 MB or larger', objectUrl(SAVED), { [SAVED]: { size: 5 * 1024 * 1024, contentType: PDF } }],
    ['not a PDF or Word document', objectUrl(SAVED), { [SAVED]: { size: 10, contentType: 'image/png' } }],
    ['deleted', objectUrl(SAVED), {}],
  ]) {
    const h = harness({ objects, member: { displayName: 'Candidate', resumeUrl, resumeFileName: 'Saved CV.pdf' } });
    const result = await h.submit({ postId: 'optional', resumeType: 'profile' });
    assert.equal(result.status, 422, label);
    assert.match(result.body.error, /^Your saved resume could not be attached\. Upload a resume for this application, or replace the one on your profile/, label);
    assert.deepEqual(h.copies, [], label);
    assert.equal(h.saved('optional'), undefined, label);
  }
});

test('without a saved resume a profile application attaches none, unless the job requires a file', async () => {
  const h = harness({ member: { displayName: 'Candidate', resumeUrl: '', resumeFileName: '' } });
  const optional = await h.submit({ postId: 'optional', resumeType: 'profile' });
  assert.equal(optional.status, 201);
  assert.deepEqual([h.saved('optional').resumeUrl, h.saved('optional').resumeFileName], ['', null]);
  const required = await h.submit({ postId: 'required', resumeType: 'profile', resumeUrl: objectUrl(SAVED) });
  assert.equal(required.status, 422);
  assert.equal(required.body.error, 'A resume file is required.');
  assert.deepEqual(h.metadataReads, []);
  assert.equal(h.saved('required'), undefined);
});

test('an uploaded file keeps the same server checks and messages', async () => {
  const upload = 'resumes/candidate/upload.pdf';
  const h = harness({ objects: { [upload]: { size: 900, contentType: PDF }, 'resumes/other/theirs.pdf': { size: 10, contentType: PDF } } });
  const denied = await h.submit({ postId: 'required', resumeType: 'file', resumeUrl: objectUrl('resumes/other/theirs.pdf') });
  assert.deepEqual([denied.status, denied.body.error], [422, 'Invalid resume ownership.']);
  const accepted = await h.submit({ postId: 'required', resumeType: 'file', resumeUrl: objectUrl(upload), resumeFileName: 'Upload.pdf' });
  assert.equal(accepted.status, 201);
  assert.deepEqual(h.copies.map(copy => copy.source), [upload]);
  assert.deepEqual([h.saved('required').resumeType, h.saved('required').resumeFileName], ['file', 'Upload.pdf']);
});

test('a transaction retry reuses the copy of an unchanged saved resume and copies a replaced one', async () => {
  const unchanged = harness({ onCopy: async (memory, count) => { if (count === 1) await memory.db.doc('members/candidate').update({ headline: 'Edited while applying' }); } });
  assert.equal((await unchanged.submit({ postId: 'optional', resumeType: 'profile' })).status, 201);
  assert.equal(unchanged.copies.length, 1, 'the retried transaction reuses the first copy');
  assert.match(unchanged.saved('optional').resumeUrl, new RegExp(encodeURIComponent(unchanged.copies[0].destination)));
  const replacement = 'resumes/candidate/replacement.pdf';
  const replaced = harness({ objects: { [SAVED]: { size: 10, contentType: PDF }, [replacement]: { size: 20, contentType: PDF } },
    onCopy: async (memory, count) => { if (count === 1) await memory.db.doc('members/candidate').update({ resumeUrl: objectUrl(replacement), resumeFileName: 'Replacement.pdf' }); } });
  assert.equal((await replaced.submit({ postId: 'optional', resumeType: 'profile' })).status, 201);
  assert.deepEqual(replaced.copies.map(copy => copy.source), [SAVED, replacement]);
  const stored = replaced.saved('optional');
  assert.match(stored.resumeUrl, new RegExp(encodeURIComponent(replaced.copies[1].destination)));
  assert.equal(stored.resumeFileName, 'Replacement.pdf', 'the stored name and copy come from the same profile read');
});

test('an unverified password account is refused before any Storage read', async () => {
  const h = harness({ token: { email_verified: false } });
  const result = await h.submit({ postId: 'optional', resumeType: 'profile' });
  assert.equal(result.status, 403);
  assert.deepEqual([h.metadataReads, h.copies], [[], []]);
  assert.equal(h.saved('optional'), undefined);
});
