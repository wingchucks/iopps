import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpsRequest, createServer } from 'node:https';
import { createConnection, isIP } from 'node:net';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { offlineNetwork, sourceModule, uploadRoute } from './helpers/security-fixtures.mjs';

const load = net => sourceModule('src/lib/server/safe-outbound-fetch.ts', { ...net, baseline: false }).safeOutboundFetch;
const publicUrl = 'https://fixture.test/file';

test('transport connects to one validated numeric address and keeps TLS and HTTP hostname', async () => {
  const net = offlineNetwork({ answer: (_host, count) => count === 1 ? [{ address: '8.8.8.8', family: 4 }, { address: '1.1.1.1', family: 4 }] : [{ address: '127.0.0.1', family: 4 }] });
  const result = await load(net)(publicUrl, { maxBytes: 100 });
  assert.equal(result.body.toString(), 'image');
  assert.equal(net.dnsCalls.length, 1);
  assert.equal(net.connections[0].address, '8.8.8.8');
  assert.equal(net.requests[0].url.hostname, 'fixture.test');
  assert.equal(net.requests[0].options.hostname, '8.8.8.8');
  assert.equal(net.requests[0].options.servername, 'fixture.test');
  assert.equal(net.requests[0].options.headers.Host, 'fixture.test');
  assert.equal(net.requests[0].options.lookup, undefined, 'numeric target cannot trigger another DNS lookup');
  assert.equal(net.requests[0].options.rejectUnauthorized, true);
  assert.equal(net.requests[0].options.agent, false);
});

for (const addresses of [[], [{ address: '127.0.0.1', family: 4 }], [{ address: '8.8.8.8', family: 4 }, { address: '::ffff:10.0.0.1', family: 6 }], [{ address: 'fe90::1', family: 6 }], [{ address: 'not-an-address', family: 4 }]]) {
  test(`DNS answers fail closed before transport: ${JSON.stringify(addresses)}`, async () => {
    const net = offlineNetwork({ answer: () => addresses });
    await assert.rejects(load(net)(publicUrl, { maxBytes: 100 }), /nonpublic/);
    assert.equal(net.connections.length, 0);
  });
}

test('IP literal path rejects nonpublic addresses without DNS or transport', async () => {
  const net = offlineNetwork();
  for (const host of ['127.1', '0x7f000001', '2130706433', '0177.0.0.1', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[febf::1]', '[fc00::1]', '[2001:db8::1]', '169.254.169.254', '100.64.0.1', '224.0.0.1']) {
    await assert.rejects(load(net)(`https://${host}/fixture`, { maxBytes: 10 }));
  }
  assert.equal(net.connections.length, 0); assert.equal(net.requests.length, 0); assert.equal(net.dnsCalls.length, 0);
});

test('redirect policy checks every destination, including protocol, port and credentials', async () => {
  for (const location of ['http://fixture.test/final', 'https://fixture.test:8443/final', 'https://user:secret@fixture.test/final', 'https://localhost/final', 'https://[::ffff:a9fe:a9fe]/final', 'file:///etc/passwd']) {
    const net = offlineNetwork({ response: () => ({ status: 302, headers: { location } }) });
    await assert.rejects(load(net)(publicUrl, { maxBytes: 10 }));
    assert.equal(net.connections.length, 1);
  }
});

test('redirected hostname must pass its own DNS lookup before a new connection', async () => {
  const net = offlineNetwork({ answer: host => [{ address: host === 'fixture.test' ? '8.8.8.8' : '10.0.0.1', family: 4 }], response: () => ({ status: 302, headers: { location: 'https://private.fixture.test/file' } }) });
  await assert.rejects(load(net)(publicUrl, { maxBytes: 100 }), /nonpublic/);
  assert.deepEqual(net.dnsCalls, ['fixture.test', 'private.fixture.test']);
  assert.equal(net.connections.length, 1);
});

test('redirect chain limit and missing location terminate without consuming redirect bodies', async () => {
  for (const missing of [false, true]) {
    const net = offlineNetwork({ response: () => ({ status: 302, headers: missing ? {} : { location: '/again' }, chunks: [Buffer.alloc(1000)] }) });
    await assert.rejects(load(net)(publicUrl, { maxBytes: 10, maxRedirects: 2 }), missing ? /missing/ : /redirects/);
    assert.equal(net.connections.length, missing ? 1 : 3);
    assert.ok(net.streams.every(s => s.destroyed));
  }
});

test('same-origin authorization survives, cross-origin authorization stays stripped on return', async () => {
  const net = offlineNetwork({ response: url => url.pathname === '/file' ? { status: 301, headers: { location: '/same' } } : url.pathname === '/same' ? { status: 302, headers: { location: 'https://cdn.fixture.test/foreign' } } : url.pathname === '/foreign' ? { status: 303, headers: { location: 'https://fixture.test/final' } } : { body: 'ok' } });
  await load(net)(publicUrl, { maxBytes: 10, authorization: 'Bearer fictional-only' });
  assert.deepEqual(net.connections.map(c => c.authorization), ['Bearer fictional-only', 'Bearer fictional-only', undefined, undefined]);
});

for (const fixture of [
  { headers: { 'content-length': '11' }, body: 'tiny' },
  { chunks: [Buffer.alloc(6), Buffer.alloc(6), Buffer.alloc(100)] },
  { headers: { 'content-length': '2' }, chunks: [Buffer.alloc(6), Buffer.alloc(6)] },
  { headers: { 'content-encoding': 'gzip' }, body: 'compressed' },
]) {
  test(`size/encoding boundary stops the stream: ${JSON.stringify(fixture.headers || 'chunked')}`, async () => {
    const net = offlineNetwork({ response: () => fixture });
    await assert.rejects(load(net)(publicUrl, { maxBytes: 10 }), /size limit|encoding/);
    assert.ok(net.streams[0].destroyed);
  });
}

test('exact byte limit is accepted', async () => {
  const net = offlineNetwork({ response: () => ({ chunks: [Buffer.alloc(5), Buffer.alloc(5)] }) });
  assert.equal((await load(net)(publicUrl, { maxBytes: 10 })).body.length, 10);
});

for (const stage of ['dns', 'headers', 'body']) {
  test(`wall-clock deadline covers stalled ${stage}`, async () => {
    const net = offlineNetwork({ answer: stage === 'dns' ? () => new Promise(() => {}) : undefined, response: () => ({ stallHeaders: stage === 'headers', stallBody: stage === 'body' }) });
    const start = Date.now();
    await assert.rejects(load(net)(publicUrl, { maxBytes: 10, timeoutMs: 30 }), /timed out/);
    assert.ok(Date.now() - start < 2000);
  });
}

test('one deadline covers the entire redirect chain, not a fresh timeout per hop', async () => {
  const net = offlineNetwork({ answer: () => new Promise(resolve => setTimeout(() => resolve([{ address: '8.8.8.8', family: 4 }]), 20)), response: () => ({ status: 302, headers: { location: '/again' } }) });
  await assert.rejects(load(net)(publicUrl, { maxBytes: 10, timeoutMs: 35 }), /timed out/);
  assert.equal(net.connections.length, 1);
});

test('a DNS answer arriving after the deadline cannot start a request', async () => {
  const net = offlineNetwork({ answer: () => new Promise(resolve => setTimeout(() => resolve([{ address: '8.8.8.8', family: 4 }]), 30)) });
  await assert.rejects(load(net)(publicUrl, { maxBytes: 10, timeoutMs: 5 }), /timed out/);
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(net.requests.length, 0);
  assert.equal(net.connections.length, 0);
});

test('Google Drive metadata and authorized media both use the bounded transport', async () => {
  const net = offlineNetwork({ response: url => url.searchParams.has('fields') ? { body: JSON.stringify({ name: 'fixture.png', mimeType: 'image/png', size: '5' }) } : { body: 'image', headers: { 'content-type': 'image/png' } } });
  const route = uploadRoute(net);
  const res = await route.post({ source: 'google-drive', slot: 'gallery', fileId: 'fixture', accessToken: 'fictional-only' });
  assert.equal(res.status, 200); assert.equal(net.requests.length, 2);
  assert.ok(net.connections.every(c => c.authorization === 'Bearer fictional-only'));
  assert.equal(route.saved.length, 1);
});

test('real Node TLS verifies certificates and hostname while retaining SNI (loopback-only adapter)', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'iopps-tls-fixture-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=1.1.1.1', '-addext', 'subjectAltName=DNS:fixture.test,DNS:9.9.9.9,IP:8.8.8.8,IP:2606:4700:4700::1111'], { stdio: 'ignore' });
  const cert = readFileSync(join(directory, 'cert.pem'));
  const sni = [], hosts = [];
  const server = createServer({ key: readFileSync(join(directory, 'key.pem')), cert }, (req, res) => { hosts.push(req.headers.host); res.end('fixture'); });
  server.on('secureConnection', socket => sni.push(socket.servername));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  for (const [hostname, trust, success, dnsAddress = '8.8.8.8'] of [
    ['fixture.test', true, true], ['mismatch.test', true, false], ['fixture.test', false, false],
    ['8.8.8.8', true, true], ['8.8.8.8', false, false], ['1.1.1.1', true, false], ['9.9.9.9', true, false],
    ['[2606:4700:4700::1111]', true, true], ['[2606:4700:4700::1111]', false, false], ['[2606:4700:4700::2222]', true, false],
    ['fixture.test', true, true, '2606:4700:4700::1111'],
  ]) {
    const net = offlineNetwork({ answer: () => [{ address: dnsAddress, family: isIP(dnsAddress) }] });
    const validated = [];
    net.mocks['node:https'] = { request(options, callback) {
      assert.equal(options.rejectUnauthorized, true);
      assert.equal(options.agent, false);
      // Test-only adapter: supply a TCP socket connected solely to loopback.
      // Keep all production hostname, SNI and native TLS identity checks intact.
      const originalHost = hostname.replace(/^\[|\]$/g, '');
      assert.equal(options.hostname, isIP(originalHost) ? originalHost : dnsAddress); validated.push(options.hostname);
      assert.equal(options.lookup, undefined);
      assert.equal(options.servername, isIP(originalHost) ? undefined : hostname);
      return httpsRequest({ ...options, socket: createConnection({ host: '127.0.0.1', port }), ...(trust ? { ca: cert } : {}) }, callback);
    } };
    const operation = load(net)(`https://${hostname}/fixture`, { maxBytes: 100 });
    if (success) assert.equal((await operation).body.toString(), 'fixture');
    else await assert.rejects(operation, trust ? /does not match/ : /self-signed certificate/);
    assert.equal(validated.length, 1);
  }
  assert.deepEqual(sni, ['fixture.test', false, false, 'fixture.test']);
  assert.deepEqual(hosts, ['fixture.test', '8.8.8.8', '[2606:4700:4700::1111]', 'fixture.test']);
});
