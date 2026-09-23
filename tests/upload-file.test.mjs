import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const libUrl = new URL('../src/lib/upload-file.ts', import.meta.url);
const {
  MAX_UPLOAD_SIZE,
  resumeContentType,
  validateResumeFile,
  validateImageFile,
  uploadToStorage,
} = await import(libUrl.href);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- validation ---------------------------------------------------------

test('validateResumeFile accepts PDF/DOC/DOCX by MIME type', () => {
  for (const type of [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]) {
    assert.equal(
      validateResumeFile({ name: 'resume.pdf', type, size: 1024 }),
      null,
      `expected ${type} to be accepted`
    );
  }
});

test('validateResumeFile accepts resume by extension when the browser reports no MIME type', () => {
  // Android browsers commonly send an empty type for .doc/.docx files.
  assert.equal(validateResumeFile({ name: 'resume.docx', type: '', size: 1024 }), null);
  assert.equal(validateResumeFile({ name: 'resume.PDF', type: '', size: 1024 }), null);
});

test('validateResumeFile rejects non-resume types and oversized files', () => {
  const typeError = validateResumeFile({ name: 'photo.png', type: 'image/png', size: 1024 });
  assert.ok(typeError && typeError.includes('.pdf'), `unexpected: ${typeError}`);
  const sizeError = validateResumeFile({
    name: 'resume.pdf',
    type: 'application/pdf',
    size: MAX_UPLOAD_SIZE + 1,
  });
  assert.ok(sizeError && sizeError.includes('5MB'), `unexpected: ${sizeError}`);
});

test('resumeContentType derives storage content types from extensions', () => {
  assert.equal(resumeContentType('resume.pdf'), 'application/pdf');
  assert.equal(resumeContentType('resume.doc'), 'application/msword');
  assert.equal(
    resumeContentType('resume.DOCX'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  assert.equal(resumeContentType('photo.png'), null);
});

test('validateImageFile accepts images and rejects other files with clear errors', () => {
  assert.equal(validateImageFile({ name: 'me.jpg', type: 'image/jpeg', size: 1024 }), null);
  const typeError = validateImageFile({ name: 'notes.txt', type: 'text/plain', size: 1024 });
  assert.ok(typeError && typeError.toLowerCase().includes('image'), `unexpected: ${typeError}`);
  const sizeError = validateImageFile({
    name: 'me.jpg',
    type: 'image/jpeg',
    size: MAX_UPLOAD_SIZE + 1,
  });
  assert.ok(sizeError && sizeError.includes('5MB'), `unexpected: ${sizeError}`);
});

// --- uploadToStorage with a mocked storage SDK ---------------------------

function mockDeps({ uploadError = null, urlError = null } = {}) {
  const calls = { ref: [], upload: [], getDownloadURL: [] };
  const deps = {
    ref: (storage, p) => {
      calls.ref.push([storage, p]);
      return { path: p };
    },
    uploadBytesResumable: (storageRef, file, metadata) => {
      calls.upload.push([storageRef, file, metadata]);
      return {
        snapshot: { ref: storageRef },
        on: (event, next, error, complete) => {
          assert.equal(event, 'state_changed');
          next({ bytesTransferred: 50, totalBytes: 100 });
          next({ bytesTransferred: 100, totalBytes: 100 });
          if (uploadError) error(uploadError);
          else complete();
        },
      };
    },
    getDownloadURL: async (storageRef) => {
      calls.getDownloadURL.push(storageRef);
      if (urlError) throw urlError;
      return 'https://firebasestorage.googleapis.com/v0/b/demo/o/resumes%2Fu%2Ff.pdf';
    },
  };
  return { deps, calls };
}

test('uploadToStorage success path: persists via the storage SDK, reports progress, resolves the download URL', async () => {
  const { deps, calls } = mockDeps();
  const file = { name: 'resume.pdf', type: 'application/pdf', size: 2048 };
  const seen = [];
  const url = await uploadToStorage(
    deps,
    { bucket: 'fictional' },
    'resumes/user-1/uuid-resume.pdf',
    file,
    { contentType: 'application/pdf' },
    (pct) => seen.push(pct)
  );

  assert.equal(url, 'https://firebasestorage.googleapis.com/v0/b/demo/o/resumes%2Fu%2Ff.pdf');
  assert.deepEqual(calls.ref, [[{ bucket: 'fictional' }, 'resumes/user-1/uuid-resume.pdf']]);
  assert.equal(calls.upload.length, 1);
  assert.equal(calls.upload[0][1], file);
  assert.deepEqual(calls.upload[0][2], { contentType: 'application/pdf' });
  assert.deepEqual(seen, [50, 100]);
  assert.equal(calls.getDownloadURL.length, 1);
});

test('uploadToStorage error path: a failed upload rejects so the caller can show an error state', async () => {
  const { deps } = mockDeps({ uploadError: new Error('fictional storage failure') });
  const seen = [];
  await assert.rejects(
    uploadToStorage(
      deps,
      {},
      'resumes/user-1/uuid-resume.pdf',
      { name: 'resume.pdf' },
      { contentType: 'application/pdf' },
      (pct) => seen.push(pct)
    ),
    /fictional storage failure/
  );
  assert.deepEqual(seen, [50, 100]);
});

test('uploadToStorage error path: a failed download-URL fetch rejects', async () => {
  const { deps } = mockDeps({ urlError: new Error('fictional url failure') });
  await assert.rejects(
    uploadToStorage(deps, {}, 'resumes/user-1/x.pdf', { name: 'x.pdf' }, undefined, () => {}),
    /fictional url failure/
  );
});

// --- static wiring checks: the three upload surfaces ---------------------

const surfaces = [
  'src/app/profile/resume/page.tsx',
  'src/app/jobs/[slug]/apply/page.tsx',
  'src/app/profile/page.tsx',
];

for (const rel of surfaces) {
  test(`static: ${rel} wires file selection to the upload helper`, () => {
    const source = readFileSync(path.join(root, rel), 'utf8');
    assert.ok(source.includes('@/lib/upload-file'), 'must use the shared upload helper');
    assert.ok(source.includes('uploadToStorage'), 'must call uploadToStorage');
    assert.ok(
      source.includes('fileInputRef.current?.click()'),
      'must open the picker from a click/keyboard activation'
    );
    assert.ok(source.includes('onChange'), 'file input must have a change handler');
  });
}

for (const rel of surfaces.slice(0, 2)) {
  test(`static: ${rel} dropzone is keyboard-activatable`, () => {
    const source = readFileSync(path.join(root, rel), 'utf8');
    assert.ok(source.includes('tabIndex={0}'), 'dropzone must be focusable');
    assert.ok(source.includes('role="button"'), 'dropzone must expose button semantics');
    assert.ok(source.includes('"Enter"') || source.includes("'Enter'"), 'Enter must activate');
    assert.ok(source.includes('" "'), 'Space must activate');
    assert.ok(source.includes('role="progressbar"'), 'must show visible upload progress');
    assert.ok(source.includes('role="alert"'), 'must show a visible error state');
  });
}

test('static: profile avatar Edit control opens the picker and shows progress/errors', () => {
  const source = readFileSync(path.join(root, 'src/app/profile/page.tsx'), 'utf8');
  assert.ok(
    source.includes('aria-label="Edit profile photo"') ||
      source.includes('aria-label={'),
    'avatar edit control must be labelled'
  );
  assert.ok(source.includes('validateImageFile'), 'must validate the image with a visible error');
  assert.ok(!source.includes('opacity-0 group-hover:opacity-100'), 'edit control must be visible without hover');
});
