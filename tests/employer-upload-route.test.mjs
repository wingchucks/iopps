import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

class EmployerApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

function load({ orgRole = 'owner', denied } = {}) {
  const saved = [];
  const bucket = { name: 'demo-security.appspot.com', file: name => ({ save: async (buffer, options) => { saved.push({ name, contentType: options.metadata.contentType, size: buffer.length }); }, makePublic: async () => {} }) };
  const { POST } = sourceModule('src/app/api/employer/upload/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    'firebase-admin/storage': { getStorage: () => ({ bucket: name => { assert.equal(name, 'demo-security.appspot.com'); return bucket; } }) },
    '@/lib/server/employer-auth': { EmployerApiError, requireEmployerContext: async () => { if (denied) throw new EmployerApiError(denied, 'Not an employer'); return { uid: 'owner-uid', orgId: 'org-a', orgRole }; } },
  } });
  const send = (folder, name, type, bytes) => {
    const fd = new FormData(); fd.append('file', new Blob([bytes], { type }), name); if (folder !== undefined) fd.append('folder', folder);
    return POST(new Request('http://localhost/api/employer/upload', { method: 'POST', body: fd }));
  };
  return { send, saved };
}

test('employer uploads are limited to known poster folders under the caller organization', async () => {
  const { send, saved } = load();
  for (const folder of ['events/posters', 'scholarships/posters', undefined]) assert.equal((await send(folder, 'poster.png', 'image/png', PNG)).status, 200);
  assert.deepEqual(saved.map(s => s.name.split('/').slice(0, -1).join('/')), ['events/posters/org-a', 'scholarships/posters/org-a', 'uploads/org-a']);
  for (const folder of ['resumes/victim-uid', 'avatars', 'livestream-promos/admin', '../x', 'events/posters/../../resumes']) {
    assert.equal((await send(folder, 'poster.png', 'image/png', PNG)).status, 400, folder);
  }
  assert.equal(saved.length, 3);
});

test('extension comes from the verified type and content must match the declared image type', async () => {
  const { send, saved } = load();
  const res = await send('events/posters', 'page.html', 'image/png', PNG);
  assert.equal(res.status, 200);
  assert.match(saved[0].name, /\.png$/);
  assert.equal((await send('events/posters', 'x.png', 'image/png', new TextEncoder().encode('<html><script>alert(1)</script></html>'))).status, 400);
  assert.equal((await send('events/posters', 'x.svg', 'image/svg+xml', new TextEncoder().encode('<svg/>'))).status, 400);
  assert.equal(saved.length, 1);
});

test('only verified organization owners or admins may upload', async () => {
  assert.equal((await load({ orgRole: 'member' }).send('events/posters', 'p.png', 'image/png', PNG)).status, 403);
  assert.equal((await load({ denied: 403 }).send('events/posters', 'p.png', 'image/png', PNG)).status, 403);
  assert.equal((await load({ denied: 401 }).send('events/posters', 'p.png', 'image/png', PNG)).status, 401);
});
