import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineNetwork, uploadRoute } from './helpers/security-fixtures.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);

function multipart(file) {
  const form = new FormData();
  form.append('slot', 'logo');
  form.append('file', file);
  return new Request('https://fixture.test/api/org/upload', { method: 'POST', body: form });
}

test('only owners and admins of an organization with access can change its images', async () => {
  for (const [options, status] of [[{ orgRole: 'member' }, 403], [{ denied: 'Organization access has been removed.' }, 403], [{ authenticated: false }, 401]]) {
    const route = uploadRoute(offlineNetwork(), options);
    const response = await route.send(multipart(new File([PNG], 'logo.png', { type: 'image/png' })));
    assert.equal(response.status, status, JSON.stringify(options));
    assert.equal(route.saved.length, 0);
  }
  const admin = uploadRoute(offlineNetwork(), { orgRole: 'admin' });
  assert.equal((await admin.send(multipart(new File([PNG], 'logo.png', { type: 'image/png' })))).status, 200);
  assert.match(admin.saved[0].path, /^organizations\/fixture-org\/profile\/logo\//);
});

test('the legacy signed-URL flow can no longer overwrite the live logo or banner', async () => {
  const route = uploadRoute(offlineNetwork());
  for (const body of [{ type: 'logo', contentType: 'image/svg+xml' }, { type: 'banner', contentType: 'image/png' }]) {
    const response = await route.post(body);
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, 'ENDPOINT_RETIRED');
  }
  const put = await route.send(new Request('https://fixture.test/api/org/upload', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'logo' }) }));
  assert.equal(put.status, 410);
  assert.deepEqual(route.signed, [], 'no write URL is ever signed');
  assert.equal(route.saved.length, 0);
});

test('uploaded files must really be raster images; SVG and disguised content are refused', async () => {
  const route = uploadRoute(offlineNetwork());
  for (const file of [
    new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'logo.svg', { type: 'image/svg+xml' }),
    new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.png', { type: 'image/png' }),
    new File(['<html><script>alert(1)</script></html>'], 'logo.png', { type: 'image/png' }),
    new File([Buffer.alloc(5 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' }),
  ]) {
    assert.equal((await route.send(multipart(file))).status, 400, file.name);
  }
  assert.equal(route.saved.length, 0);
  assert.equal((await route.send(multipart(new File([JPEG], 'photo.png', { type: 'image/png' })))).status, 200);
  assert.equal(route.saved[0].options.metadata.contentType, 'image/jpeg', 'stored with the type its bytes prove');
});
