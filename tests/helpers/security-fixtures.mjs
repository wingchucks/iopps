// No real DNS, sockets, credentials or provider traffic in these fixtures.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { isIP } from 'node:net';
import vm from 'node:vm';
import paths from 'node:path';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
export const BASELINE = '005b228d4b59dc9aba3b1c1b2850dcc745579324';
export function sourceModule(file, { mocks = {}, globals = {}, baseline = process.env.IOPPS_SECURITY_BASELINE === 'true' } = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = baseline ? execFileSync('git', ['show', `${BASELINE}:${path}`], { encoding: 'utf8' }) : readFileSync(path, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const exports = {};
    cache.set(path, exports);
    vm.runInNewContext(compiled, {
      exports, Buffer, Headers, Request, Response, URL, URLSearchParams, File, AbortController, AbortSignal,
      setTimeout, clearTimeout, queueMicrotask, console: { log() {}, error() {}, warn() {} },
      process: { env: { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-security.appspot.com' } },
      fetch: async () => { throw new Error('Unexpected fetch: no network permitted'); },
      ...globals,
      require(id) {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`);
        if (id.startsWith('.')) {
          const resolved = paths.posix.join(paths.posix.dirname(path), id);
          return load(paths.posix.extname(resolved) ? resolved : resolved + '.ts');
        }
        if (['node:https', 'node:http', 'node:dns', 'node:dns/promises'].includes(id)) throw new Error(`Network dependency must be isolated: ${id}`);
        return nativeRequire(id);
      },
    }, { filename: path });
    return exports;
  }
  return load(file);
}

export function offlineNetwork({ answer = () => [{ address: '8.8.8.8', family: 4 }], response = () => ({ body: 'image', headers: { 'content-type': 'image/png' } }), all = true } = {}) {
  const dnsCalls = [], requests = [], connections = [], streams = [];
  async function resolve(hostname) {
    dnsCalls.push(hostname);
    // Node dns.lookup does not accept URL-style brackets around IPv6 literals.
    if (hostname.startsWith('[')) throw new Error('ENOTFOUND: bracketed IPv6 hostname');
    if (isIP(hostname)) return [{ address: hostname, family: isIP(hostname) }];
    const result = await answer(hostname, dnsCalls.length);
    if (result instanceof Error) throw result;
    return result;
  }
  function request(url, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = url;
      url = new URL(`https://${options.headers.Host}${options.path}`);
    } else {
      url = new URL(url);
    }
    requests.push({ url, options });
    const req = new EventEmitter();
    let aborted = false;
    const abort = () => { aborted = true; req.emit('error', new Error('aborted')); };
    req.end = () => {
      options.signal?.addEventListener('abort', abort, { once: true });
      queueMicrotask(async () => {
        try {
          let address, family;
          const hostname = (options.hostname || url.hostname).replace(/^\[|\]$/g, '');
          if (isIP(hostname)) { address = hostname; family = isIP(hostname); }
          else {
            assert.equal(typeof options.lookup, 'function', 'actual transport must use validating lookup');
            const selected = await new Promise((resolve, reject) => options.lookup(hostname, { all }, (error, value, selectedFamily) => error ? reject(error) : resolve(all ? value[0] : { address: value, family: selectedFamily })));
            ({ address, family } = selected);
          }
          if (aborted) return;
          connections.push({ url: url.href, address, family, authorization: options.headers?.Authorization });
          const fixture = response(url);
          if (fixture.stallHeaders) return;
          const res = new PassThrough();
          Object.assign(res, { statusCode: fixture.status || 200, headers: fixture.headers || {} });
          streams.push(res);
          res.on('close', () => options.signal?.removeEventListener('abort', abort));
          callback(res);
          if (fixture.stallBody || res.destroyed) return;
          for (const chunk of fixture.chunks || [Buffer.from(fixture.body || '')]) {
            if (res.destroyed) break;
            res.write(chunk);
          }
          if (!res.destroyed) res.end();
        } catch (error) { req.emit('error', error); }
      });
    };
    return req;
  }
  // Model native fetch's default follow behavior AND independent DNS resolution,
  // so the unchanged vulnerable candidate can be exercised without any network.
  async function fetchFixture(value, options = {}) {
    let url = new URL(value);
    // Native WHATWG fetch rejects embedded credentials before DNS or transport.
    new Request(url);
    for (let i = 0; i < 20; i++) {
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      const address = isIP(hostname) ? hostname : (await resolve(hostname))[0].address;
      connections.push({ url: url.href, address });
      const fixture = response(url);
      if ([301, 302, 303, 307, 308].includes(fixture.status) && options.redirect !== 'manual') {
        if (options.redirect === 'error') throw new Error('redirect');
        url = new URL(fixture.headers.location, url); continue;
      }
      const res = new Response(fixture.body || '', { status: fixture.status || 200, headers: fixture.headers });
      Object.defineProperty(res, 'url', { value: url.href });
      return res;
    }
    throw new Error('fixture redirect limit');
  }
  return {
    dnsCalls, requests, connections, streams,
    mocks: {
      'node:dns': { lookup(hostname, _options, cb) { resolve(hostname).then(v => cb(null, v), e => cb(e)); } },
      'node:dns/promises': { lookup: resolve },
      'node:https': { request },
    },
    globals: { fetch: fetchFixture },
  };
}

export function uploadRoute(network, { authenticated = true, member = true } = {}) {
  const saved = [];
  const route = sourceModule('src/app/api/org/upload/route.ts', {
    ...network,
    mocks: {
      ...network.mocks,
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/api-auth': { verifyAuthToken: async () => authenticated ? { success: true, decodedToken: { uid: 'fixture-user' } } : { success: false, response: Response.json({}, { status: 401 }) } },
      '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: member, data: () => ({ orgId: 'fixture-org' }) }) }) }) }) },
      'firebase-admin/storage': { getStorage: () => ({ bucket: () => ({ name: 'demo-security', file: path => ({ save: async (body, options) => saved.push({ path, body, options }), makePublic: async () => {} }) }) }) },
    },
  });
  return {
    saved,
    post(body) { return route.POST(new Request('https://fixture.test/api/org/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); },
  };
}
