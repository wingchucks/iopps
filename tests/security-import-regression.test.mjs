import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Parser } from 'htmlparser2';
import { offlineNetwork, sourceModule, uploadRoute } from './helpers/security-fixtures.mjs';

const tenant = 'https://fixture.fa.ca2.oraclecloud.com';
const oracleJob = `${tenant}/hcmUI/CandidateExperience/en/sites/Fixture/job/123`;
const feedUrl = `${tenant}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?finder=findReqs;siteNumber=Fixture`;
const adpJob = 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=123&jobId=fixture&lang=en_CA';
const imageBody = { source: 'link', slot: 'logo', url: 'https://images.fixture.test/logo.png' };

function renderJob(description) {
  let state = 0;
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const page = sourceModule('src/app/jobs/[slug]/JobDetailClient.tsx', { mocks: {
    react: { ...React, useState(initial) { const i = state++; return [i === 0 ? { id: 'fixture', title: 'Fixture role', description } : i === 1 ? false : initial, () => {}]; }, useEffect() {} },
    'next/navigation': { useParams: () => ({ slug: 'fixture' }), useRouter: () => ({}), usePathname: () => '/jobs/fixture', useSearchParams: () => new URLSearchParams() },
    'next/link': { default: ({ children, href }) => React.createElement('a', { href }, children), __esModule: true },
    ...Object.fromEntries(['employer/HiringDetailsSummary', 'AppShell', 'EmployerLogo', 'Badge', 'Button', 'Card', 'ShareButton'].map(name => [`@/components/${name}`, { default: wrapper, __esModule: true }])),
    '@/components/jobs/JobDescription': sourceModule('src/components/jobs/JobDescription.tsx'),
    '@/lib/job-discovery': {}, '@/lib/auth-context': { useAuth: () => ({ user: null }) },
    '@/lib/firestore/savedItems': {}, '@/lib/firestore/applications': {}, '@/lib/job-funnel-analytics': {},
  } });
  return renderToStaticMarkup(React.createElement(page.default));
}

function assertInert(markup) {
  const violations = [];
  const parser = new Parser({ onopentag(name, attrs) { if (['script', 'img', 'svg', 'iframe', 'math'].includes(name) || Object.keys(attrs).some(k => /^on/i.test(k))) violations.push({ name, attrs }); } });
  parser.end(markup);
  assert.deepEqual(violations, [], 'untrusted description must never create elements or event attributes');
}

test('image redirect chain rejects a private hop BEFORE connecting', async () => {
  const net = offlineNetwork({ response: url => url.hostname === 'images.fixture.test' ? { status: 302, headers: { location: 'https://cdn.fixture.test/one' } } : url.hostname === 'cdn.fixture.test' ? { status: 307, headers: { location: 'https://127.0.0.1/fixture.png' } } : { body: 'inert image', headers: { 'content-type': 'image/png' } } });
  const route = uploadRoute(net);
  const res = await route.post(imageBody);
  assert.equal(net.connections.some(c => c.address === '127.0.0.1'), false);
  assert.equal(res.status, 400);
  assert.equal(route.saved.length, 0);
});

test('image DNS validation is the transport lookup, with no rebinding lookup gap', async () => {
  const net = offlineNetwork({ answer: (_host, call) => [{ address: call === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }] });
  const route = uploadRoute(net);
  const res = await route.post(imageBody);
  assert.equal(net.connections.some(c => c.address === '127.0.0.1'), false);
  assert.equal(net.dnsCalls.length, 1);
  assert.equal(res.status, 200);
});

test('nonpublic mapped IPv6, full link-local and documentation addresses are classified', () => {
  const profile = sourceModule('src/lib/profile-media.ts');
  for (const value of ['::ffff:127.0.0.1', '::ffff:7f00:1', '[::ffff:a00:1]', 'febf::1', 'fe90::1', 'fec0::1', '192.0.2.1', '2001:db8::1', '3fff::1', '64:ff9b::7f00:1']) {
    assert.equal(profile.isPrivateIpAddress(value), true, value);
  }
  assert.equal(profile.isPrivateIpAddress('8.8.8.8'), false);
  assert.equal(profile.isPrivateIpAddress('2606:4700:4700::1111'), false);
});

for (const url of ['https://[::ffff:7f00:1]/x.png', 'https://[fe90::1]/x.png', 'https://images.fixture.test:8443/x.png', 'https://user:pass@images.fixture.test/x.png']) {
  test(`image boundary rejects unsupported destination ${url}`, async () => {
    const net = offlineNetwork(); const route = uploadRoute(net);
    const res = await route.post({ ...imageBody, url });
    assert.equal(net.connections.length, 0); assert.notEqual(res.status, 200); assert.equal(route.saved.length, 0);
  });
}

test('organization image auth and organization membership gates precede imports', async () => {
  for (const access of [{ authenticated: false }, { member: false }]) {
    const net = offlineNetwork(); const route = uploadRoute(net, access);
    const res = await route.post(imageBody);
    assert.equal(res.status, access.authenticated === false ? 401 : 403);
    assert.equal(net.connections.length, 0); assert.equal(route.saved.length, 0);
  }
});

test('supported direct, Drive, Dropbox and OneDrive link imports persist scoped image bytes', async () => {
  for (const url of [imageBody.url, 'https://drive.google.com/file/d/fixture/view', 'https://www.dropbox.com/s/fixture/logo.png?dl=0', 'https://1drv.ms/i/fixture']) {
    const net = offlineNetwork(); const route = uploadRoute(net);
    assert.equal((await route.post({ ...imageBody, url })).status, 200);
    assert.match(route.saved[0].path, /^organizations\/fixture-org\/profile\/logo\//);
    assert.equal(route.saved[0].body.toString(), 'image');
  }
});

for (const externalUrl of [
  oracleJob.replace('fixture.fa.ca2.oraclecloud.com', 'oraclecloud.com.attacker.test'),
  oracleJob.replace('fixture.fa.ca2.oraclecloud.com', 'notoraclecloud.com'),
  oracleJob.replace('https:', 'http:'),
  oracleJob.replace('oraclecloud.com', 'oraclecloud.com:8443'),
  oracleJob.replace('https://', 'https://user:pass@'),
  oracleJob.replace('fixture.fa.', 'other.fa.'),
]) {
  test(`Oracle rejects untrusted URL before any network: ${externalUrl}`, async () => {
    const net = offlineNetwork({ response: () => ({ body: '<meta property="og:description" content="Fictional role">' }) });
    const imports = sourceModule('src/lib/server/imported-job-descriptions.ts', net);
    const patch = await imports.fetchImportedDescriptionPatch({ externalUrl, feedUrl });
    assert.equal(net.connections.length, 0); assert.equal(patch, null);
  });
}

test('Oracle needs the configured tenant feed and rejects cross-origin redirects', async () => {
  for (const configuredFeed of [undefined, feedUrl]) {
    const net = offlineNetwork({ response: url => url.origin === tenant ? { status: 302, headers: { location: 'https://cdn.fixture.test/metadata' } } : { body: '<meta property="og:description" content="Fictional role">' } });
    const imports = sourceModule('src/lib/server/imported-job-descriptions.ts', net);
    assert.equal(await imports.fetchImportedDescriptionPatch({ externalUrl: oracleJob, feedUrl: configuredFeed }), null);
    assert.equal(net.connections.length, configuredFeed ? 1 : 0);
  }
});

test('supported Oracle metadata, reordered attributes and same-tenant redirects hydrate text', async () => {
  const net = offlineNetwork({ response: url => url.search ? { body: '<meta content="Team &amp; community" property="og:description">' } : { status: 302, headers: { location: `${oracleJob}?locale=en_CA` } } });
  const patch = await sourceModule('src/lib/server/imported-job-descriptions.ts', net).fetchImportedDescriptionPatch({ externalUrl: oracleJob, feedUrl });
  assert.equal(patch?.description, 'Team & community');
  assert.equal(patch?.descriptionFormat, 'plain-text');
});

test('ADP retains its fixed HTTPS endpoint, feed CID fallback, formatting and closed-posting behavior', async () => {
  for (const closed of [false, true]) {
    const net = offlineNetwork({ response: () => ({ body: JSON.stringify(closed ? {} : { requisitionDescription: '<p>Join our team &amp; community.</p><ul><li>Flexible hours</li><li>Training</li></ul>', requisitionLocations: [{ nameCode: { shortName: 'Saskatoon' } }] }) }) });
    const patch = await sourceModule('src/lib/server/imported-job-descriptions.ts', net).fetchImportedDescriptionPatch({ externalUrl: adpJob, feedUrl: 'https://workforcenow.adp.com/feed?cid=fixture-tenant' });
    const url = new URL(net.connections[0].url);
    assert.equal(url.origin, 'https://workforcenow.adp.com');
    assert.equal(url.searchParams.get('cid'), 'fixture-tenant');
    assert.match(url.pathname, /job-requisitions\/fixture$/);
    if (closed) { assert.equal(patch.active, false); assert.equal(patch.status, 'expired'); }
    else { assert.match(patch.description, /Join our team & community\./); assert.match(patch.description, /Flexible hours\n/); assert.equal(patch.location, 'Saskatoon'); }
  }
});

test('ADP lookalike classification and HTTP are rejected without claiming arbitrary-host fetch', async () => {
  for (const externalUrl of [adpJob.replace('https:', 'http:'), adpJob.replace('adp.com', 'adp.com.attacker.test')]) {
    const net = offlineNetwork({ response: () => ({ body: '{}' }) });
    const patch = await sourceModule('src/lib/server/imported-job-descriptions.ts', net).fetchImportedDescriptionPatch({ externalUrl });
    assert.equal(patch, null); assert.equal(net.connections.length, 0);
  }
});

test('encoded imported event markup remains inert through provider, public projection and actual job page', async () => {
  const net = offlineNetwork({ response: () => ({ body: JSON.stringify({ requisitionDescription: '<p>Fictional role &lt;img src=x onerror="fixture()"&gt;</p>' }) }) });
  const imports = sourceModule('src/lib/server/imported-job-descriptions.ts', net);
  const patch = await imports.fetchImportedDescriptionPatch({ externalUrl: adpJob });
  const projection = sourceModule('src/lib/server/public-content-record.ts');
  const publicJob = projection.publicContentRecord(patch);
  const markup = renderJob(publicJob.description);
  assertInert(markup);
  assert.match(markup, /&lt;img/);
  assert.equal(publicJob.descriptionFormat, 'plain-text');
});

test('malformed and stored legacy HTML never becomes executable job page markup', () => {
  for (const description of ['<img src=x onerror="fixture()">', '<svg/onload=fixture()>', '<math><mtext><img src=x onerror=fixture()>', '&lt;img src=x onerror=fixture()&gt;', '<script>fixture()</script><p>Normal job</p>', '<p>5 < 10 &amp; &#x110000; &#0;</p>']) {
    const projection = sourceModule('src/lib/server/public-content-record.ts');
    const job = projection.publicContentRecord({ description });
    assertInert(renderJob(job.description));
  }
});

for (const address of ['::ffff:7f00:1', 'fe90::1']) {
  test(`ordinary image hostname rejects nonpublic DNS answer ${address} before connecting`, async () => {
    const net = offlineNetwork({ answer: () => [{ address, family: 6 }] });
    const route = uploadRoute(net);
    const res = await route.post(imageBody);
    assert.equal(net.connections.length, 0);
    assert.notEqual(res.status, 200);
    assert.equal(route.saved.length, 0);
  });
}

test('actual GET hydration stores the text contract and detail/list projections preserve decoded literal text', async () => {
  const net = offlineNetwork({ response: () => ({ body: JSON.stringify({ requisitionDescription: '<p>Fictional role &lt;img src=x onerror="fixture()"&gt; &amp; community</p>' }) }) });
  const record = { title: 'Fictional role', active: true, status: 'active', externalUrl: adpJob, feedId: 'fixture-feed' };
  const writes = [];
  const snapshot = { id: 'fixture', exists: true, data: () => ({ ...record }), ref: { id: 'fixture', parent: { id: 'jobs' }, update: async patch => { writes.push(patch); Object.assign(record, patch); } } };
  const db = { collection(name) {
    const query = { where: () => query, get: async () => ({ docs: name === 'jobs' ? [snapshot] : [] }), doc: () => ({ parent: { id: name }, get: async () => name === 'rssFeeds' ? { data: () => ({ feedUrl: 'https://workforcenow.adp.com/feed?cid=fixture-tenant' }) } : snapshot }) };
    return query;
  }, runTransaction: async fn => fn({
    get: async ref => ref.parent.id === 'jobs' ? snapshot : { exists: false },
    update: (_ref, patch) => { writes.push(patch); Object.assign(record, patch); },
  }) };
  const options = { ...net, mocks: { ...net.mocks,
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/server/public-job-routing': { findPublicJobDocument: async () => ({ id: 'fixture', source: 'jobs', routeSlug: 'fixture-role' }) },
  } };
  const detail = sourceModule('src/app/api/jobs/[id]/route.ts', options);
  const get = () => detail.GET(new Request('https://fixture.test/api/jobs/fixture'), { params: Promise.resolve({ id: 'fixture' }) });
  const first = await get();
  assert.equal(first.status, 200);
  const job = (await first.json()).job;
  assert.equal(writes.length, 1, 'GET is deliberately tested as a writer in a fake DB');
  assert.equal(writes[0].descriptionFormat, 'plain-text');
  assert.equal(job.description, writes[0].description, 'no second HTML parse/entity decode');
  assert.equal(job.descriptionFormat, 'plain-text');
  assertInert(renderJob(job.description));
  const second = await get();
  assert.equal((await second.json()).job.description, job.description);
  assert.equal(writes.length, 1);
  const list = sourceModule('src/app/api/jobs/route.ts', options);
  const response = await list.GET(new Request('https://fixture.test/api/jobs'));
  const listed = (await response.json()).jobs[0];
  assert.equal(listed.description, job.description);
  assert.equal(listed.descriptionFormat, 'plain-text');
});
