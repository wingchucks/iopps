// Parent prepares the build and demo emulators. This script never builds or starts emulators.
// Run with Node 24, QA_BUILD_DIR and the explicit demo environment below.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';

const project = 'demo-iopps-preview';
assert.equal(process.env.GCLOUD_PROJECT, project);
for (const [key, value] of Object.entries({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' })) assert.equal(process.env[key], value, key);
for (const key of ['GOOGLE_CLOUD_PROJECT', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID']) if (process.env[key]) assert.equal(process.env[key], project, key);
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'NODE_OPTIONS', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY']) assert.ok(!process.env[key], `Refusing credential/proxy/injection environment: ${key}`);
const output = process.env.IOPPS_AUDIT_OUTPUT || 'C:/Users/natha/Documents/Codex/2026-09-21/public-audit-remediation/acceptance';
await fs.mkdir(output, { recursive: true });
const prefix = 'qa-public-' + randomUUID();
// Standard Admin initialization; guarded demo project and emulator hosts above.
const app = initializeApp({ projectId: project }, prefix);
const db = getFirestore(app);
const docs = [], checks = [], blocked = [], pageErrors = [], externalNavigations = [];
const gaps = ['No account creation, OAuth/provider, email delivery, authenticated account switching, saved-job or application mutations in this public acceptance suite.', 'Exact 10px Role progress contrast uses a conservative mesh/grid-inclusive lower bound; role-card solid composites are supplementary only. Not a complete WCAG audit.'];
let browser, context, page, server, failure;
const draftKey = 'iopps:signup-draft:v1';
const scrub = value => String(value).replace(/([?&](?:oobCode|apiKey|token|key)=)[^\s&"']+/gi, '$1[REDACTED]').replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
async function json(name, value) { await fs.writeFile(path.join(output, name + '.json'), JSON.stringify(value, null, 2)); }
async function record(name, data = {}) { checks.push({ name, status: 'pass', ...data }); await json('results', { checks, gaps }); }
async function shot(name) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }); }
const manifest = { run: prefix, project, emulator: process.env.FIRESTORE_EMULATOR_HOST, fixtures: [] };
async function bounded(name, action, ms = 15000) {
  let timer;
  try { return await Promise.race([Promise.resolve().then(action), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(name + ' timed out after ' + ms + 'ms')), ms); })]); }
  finally { clearTimeout(timer); }
}
async function seed(id, data) {
  const ref = db.doc('jobs/' + id);
  assert.equal((await ref.get()).exists, false, 'Refuse preexisting fixture ' + ref.path);
  // Persist ownership before create; a lost acknowledgement remains recoverable.
  const entry = { path: ref.path, status: 'create-pending' };
  manifest.fixtures.push(entry);
  await json('fixture-manifest-' + prefix, manifest);
  docs.push(ref);
  await ref.create(data);
  entry.status = 'created';
  await json('fixture-manifest-' + prefix, manifest);
  return ref;
}
async function inventory() {
  const response = await fetch(server.base + '/api/jobs?employerId=' + encodeURIComponent(prefix), { redirect: 'error', signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  const body = await response.json();
  assert.equal(body.count, body.jobs.length);
  return body;
}
async function noOverflow() {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1, JSON.stringify(dimensions));
}
async function cleanDraft() {
  await page.goto(server.base + '/signup');
  await page.evaluate(key => sessionStorage.removeItem(key), draftKey);
  await page.reload();
  await expect(page.getByRole('button', { name: /^(?:✓ )?👤 Individual/ })).toBeEnabled();
}
async function progressRoleContrast(state, role, width) {
  const label = page.getByText('Role', { exact: true });
  await expect(label).toHaveCount(1);
  await expect(label).toBeVisible();
  const sample = await label.evaluate(element => {
    const rgba = text => {
      if (!/^rgba?\(/.test(text)) throw new Error('Unsupported color ' + text);
      const v = text.match(/[\d.]+/g).map(Number);
      return [...v.slice(0, 3), v[3] ?? 1];
    };
    const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const style = getComputedStyle(element);
    let root;
    const ancestors = [];
    for (let node = element; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      ancestors.push({ tag: node.tagName, opacity: cs.opacity, background: cs.backgroundColor, image: cs.backgroundImage });
      if (cs.opacity !== '1' || cs.filter !== 'none' || cs.backdropFilter !== 'none' || cs.mixBlendMode !== 'normal' || cs.backgroundImage !== 'none') throw new Error('Unsupported Role ancestor compositing');
      const bg = rgba(cs.backgroundColor);
      if (bg[3] === 1) { root = node; break; }
      if (bg[3] !== 0) throw new Error('Unsupported translucent Role ancestor');
    }
    if (!root) throw new Error('Role has no opaque background');
    // BackgroundMesh is a sibling, not an ancestor. Validate its live layers,
    // then bound every channel for ALL alpha values, ignoring mask attenuation.
    // This is at least as conservative as signup-draft-browser's max-alpha mesh.
    const layers = [...root.children].filter(node => getComputedStyle(node).position === 'fixed');
    if (layers.length !== 2) throw new Error('BackgroundMesh layer count changed');
    const expected = [[20,184,166,.08], [14,165,233,.06], [167,139,250,.04], [20,184,166,.02], [20,184,166,.02]];
    const colors = [];
    const backgrounds = layers.map(node => {
      const cs = getComputedStyle(node);
      if (cs.opacity !== '1' || cs.filter !== 'none' || cs.backdropFilter !== 'none' || cs.mixBlendMode !== 'normal' || rgba(cs.backgroundColor)[3] !== 0 || /url\(/.test(cs.backgroundImage)) throw new Error('Unsupported mesh compositing');
      const matches = cs.backgroundImage.match(/rgba?\([^)]+\)/g) || [];
      for (const text of matches) { const color = rgba(text); if (color[3]) colors.push(color); }
      return { image: cs.backgroundImage, mask: cs.maskImage, opacity: cs.opacity };
    });
    if (JSON.stringify(colors) !== JSON.stringify(expected)) throw new Error('Mesh palette/alpha changed: revalidate contrast bound');
    const background = rgba(getComputedStyle(root).backgroundColor).slice(0, 3);
    // Channel-independent envelope includes every overlay order and grid/mesh position.
    const low = [...background], high = [...background];
    for (let i = 0; i < 3; i++) {
      const alphaSum = expected.reduce((sum, c) => sum + c[3], 0);
      low[i] = Math.max(0, background[i] - alphaSum * Math.max(0, background[i] - Math.min(...expected.map(c => c[i]))));
      high[i] = Math.min(255, background[i] + alphaSum * Math.max(0, Math.max(...expected.map(c => c[i])) - background[i]));
    }
    const ink = rgba(style.color);
    if (ink[3] !== 1 || style.webkitTextFillColor !== style.color || style.textShadow !== 'none') throw new Error('Unsupported Role ink compositing');
    const inkL = lum(ink.slice(0, 3)), minL = lum(low), maxL = lum(high);
    const ratio = inkL > maxL ? (inkL + .05) / (maxL + .05) : inkL < minL ? (minL + .05) / (inkL + .05) : 1;
    return { text: element.textContent, size: style.fontSize, color: style.color, opacity: style.opacity, transition: style.transitionDuration, background, backgrounds, ancestors, backgroundBounds: { low, high }, ratio, method: 'conservative channel/luminance envelope including all mesh and grid layers' };
  });
  assert.equal(sample.size, '10px');
  assert.equal(sample.opacity, '1');
  assert.equal(sample.transition, '0s');
  assert.ok(sample.ratio >= 4.5, JSON.stringify(sample));
  await record(`signup-Role-progress-${state}-${role}-${width}`, sample);
}
async function roleContrast() {
  // Source: RoleCard renders its title and description as the last two div children.
  const samples = await page.locator('button[aria-pressed]').evaluateAll(cards => {
    const rgba = text => { const values = text.match(/[\d.]+/g)?.map(Number); if (!values || values.length < 3) throw new Error('Unsupported color ' + text); return [...values.slice(0, 3), values[3] ?? 1]; };
    const over = (top, base) => [...top.slice(0, 3).map((v, i) => v * top[3] + base[i] * (1 - top[3])), 1];
    const lum = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    return cards.flatMap(card => [...card.children].slice(-2).map(element => {
      const chain = []; for (let node = element; node; node = node.parentElement) chain.unshift(node);
      let background = [255, 255, 255, 1];
      for (const node of chain) { const style = getComputedStyle(node); if (Number(style.opacity) !== 1) throw new Error('Unsupported ancestor opacity'); background = over(rgba(style.backgroundColor), background); }
      const style = getComputedStyle(element), foreground = over(rgba(style.color), background);
      const a = lum(foreground), b = lum(background);
      return { text: element.textContent, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), color: style.color, background };
    }));
  });
  assert.equal(samples.length, 4);
  for (const sample of samples) assert.ok(sample.ratio >= 4.5, `Role text contrast below 4.5: ${JSON.stringify(sample)}`);
  return samples;
}
try {
  server = await startIsolatedQaServer();
  await json('fixture-manifest-' + prefix, manifest);
  const base = new URL(server.base); assert.equal(base.hostname, '127.0.0.1'); assert.equal(base.protocol, 'http:');
  const chromeEnv = {};
  for (const key of ['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMFILES', 'PROGRAMDATA']) if (process.env[key]) chromeEnv[key] = process.env[key];
  browser = await chromium.launch({ channel: 'chrome', headless: true, env: chromeEnv });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Regina', serviceWorkers: 'block' });
  const allowedPorts = new Set([base.port, '8080', '9099', '9199']);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && allowedPorts.has(url.port)) return route.continue();
    const entry = { protocol: url.protocol, host: url.hostname, path: url.pathname };
    blocked.push(entry);
    if (route.request().isNavigationRequest()) externalNavigations.push(entry);
    return route.abort();
  });
  await context.routeWebSocket('**/*', socket => { blocked.push({ kind: 'websocket' }); socket.close(); });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(scrub(error.message)));

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await cleanDraft();
    const unselected = await roleContrast();
    const individual = page.getByRole('button', { name: /^(?:✓ )?👤 Individual/ });
    await individual.click(); await expect(individual).toHaveAttribute('aria-pressed', 'true');
    const selected = await roleContrast();
    await noOverflow(); await shot(`signup-role-${width}`);
    await record(`signup-role-card-supplementary-solid-composites-layout-${width}`, { unselected, selected });
  }
  // Both current role paths, using actual page storage and reload rather than mocked components.
  for (const width of [360, 768, 1440]) for (const [role, buttonName, orgType] of [['community', /^(?:✓ )?👤 Individual/, ''], ['organization', /^🏢 Business or organization/, 'employer']]) {
    await page.setViewportSize({ width, height: 1000 });
    await cleanDraft();
    await page.getByRole('button', { name: buttonName }).click();
    await progressRoleContrast('step1-active', role, width);
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(page.locator('#name')).toBeVisible();
    await progressRoleContrast('step2-completed', role, width);
    const name = 'Fictional Public Audit ' + role, email = prefix + '-' + role + '@example.invalid';
    await page.locator('#name').fill(name); await page.locator('#email').fill(email);
    const password = 'Fictional-not-persisted-2026!';
    await page.locator('#password').fill(password); await page.locator('#confirmPassword').fill(password); await page.locator('#signup-consent').check();
    await expect.poll(() => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '{}').email, draftKey)).toBe(email);
    const draft = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), draftKey);
    assert.deepEqual(Object.keys(draft).sort(), ['version', 'expiresAt', 'role', 'orgType', 'step', 'name', 'email'].sort());
    assert.deepEqual({ role: draft.role, orgType: draft.orgType, step: draft.step, name: draft.name, email: draft.email }, { role, orgType, step: 2, name, email });
    assert.ok(draft.expiresAt > Date.now() && draft.expiresAt <= Date.now() + 1800000);
    const passwordStored = await page.evaluate(secret => [localStorage, sessionStorage].some(storage => Object.values(storage).some(value => String(value).includes(secret))), password);
    assert.equal(passwordStored, false);
    await page.reload(); await expect(page.locator('#name')).toHaveValue(name); await expect(page.locator('#email')).toHaveValue(email);
    await expect(page.locator('#password')).toHaveValue(''); await expect(page.locator('#confirmPassword')).toHaveValue(''); await expect(page.locator('#signup-consent')).not.toBeChecked();
    const restored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), draftKey); assert.equal(restored.expiresAt, draft.expiresAt); assert.equal(restored.role, role);
    await progressRoleContrast('step2-restored', role, width);
    await shot('signup-restored-' + role + '-' + width); await record('signup-reload-' + role + '-' + width + '-safe-fields-only-expiry-not-extended');
  }
  const validShape = { version: 1, expiresAt: Date.now() + 900000, role: 'community', orgType: '', step: 2, name: 'Fictional invalid draft', email: 'invalid@example.invalid' };
  for (const [label, raw] of [['malformed', '{broken'], ['expired', JSON.stringify({ ...validShape, expiresAt: Date.now() - 1 })], ['invalid-role', JSON.stringify({ ...validShape, role: 'admin' })], ['invalid-step', JSON.stringify({ ...validShape, step: 10 })], ['future-expiry', JSON.stringify({ ...validShape, expiresAt: Date.now() + 86400000 })]]) {
    await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key: draftKey, raw }); await page.reload();
    await expect(page.getByRole('button', { name: /^(?:✓ )?👤 Individual/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Continue →', exact: true })).toBeDisabled();
    await expect(page.locator('#name')).toHaveCount(0);
    const fresh = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || 'null'), draftKey);
    if (fresh) { assert.equal(fresh.step, 1); assert.equal(fresh.role, ''); assert.equal(fresh.name, ''); assert.equal(fresh.email, ''); }
    await record('signup-rejects-' + label);
  }
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/businesses', '/scholarships', '/events']) {
      await page.goto(server.base + route);
      const utility = page.getByRole('navigation', { name: 'Utility navigation', exact: true }); await expect(utility).toBeVisible();
      for (const [label, href] of [['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact'], ['info@iopps.ca', 'mailto:info@iopps.ca']]) {
        const link = utility.getByRole('link', { name: label, exact: true }); await expect(link).toBeVisible(); await expect(link).toHaveAttribute('href', href);
        await link.focus(); await expect(link).toBeFocused();
      }
      await noOverflow(); await shot(`directory-${route.slice(1)}-${width}`); await record(`directory-utility-links-no-overflow-${route.slice(1)}-${width}`);
    }
    await page.goto(server.base + '/jobs');
    const menu = page.locator('.op-header button[aria-controls="op-mobile-nav"]');
    if (width < 1440) {
      await expect(menu).toBeVisible(); await menu.focus(); await page.keyboard.press('Enter'); await expect(menu).toHaveAttribute('aria-expanded', 'true');
      const mobile = page.getByRole('navigation', { name: 'Mobile navigation', exact: true }); await expect(mobile).toBeVisible();
      await page.keyboard.press('Tab'); await expect(mobile.getByRole('link', { name: 'Jobs', exact: true })).toBeFocused();
      await page.keyboard.press('Tab'); await expect(mobile.getByRole('link', { name: 'IOPPS Live', exact: true })).toBeFocused();
      await page.keyboard.press('Escape'); await expect(menu).toBeFocused(); await expect(menu).toHaveAttribute('aria-expanded', 'false'); await expect(mobile).toBeHidden();
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('#op-mobile-nav'))), false);
    } else {
      await expect(menu).toBeHidden();
      const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
      await nav.getByRole('link', { name: 'Jobs', exact: true }).focus(); await page.keyboard.press('Tab'); await expect(nav.getByRole('link', { name: 'IOPPS Live', exact: true })).toBeFocused();
      await page.keyboard.press('Enter'); await expect(page).toHaveURL(server.base + '/livestreams');
    }
    await record('header-keyboard-' + width);
  }

  const now = Timestamp.now();
  const common = { employerId: prefix, orgId: prefix, employerName: 'Fictional ' + prefix, location: 'Saskatoon, SK', description: 'Fictional emulator-only acceptance opening. No provider activity.', category: 'Social Services', active: true, status: 'active', applicationMethod: 'external', createdAt: now, updatedAt: now };
  const variants = [
    ['full', 'Full-time', { employmentType: 'Permanent Full Time' }],
    ['part', 'Part-time', { employmentType: 'part_time' }],
    ['contract', 'Contract', { employmentType: 'Contract (12 months)' }],
    ['temporary', 'Temporary', { employmentType: 'Temporary full-time' }],
    ['internship', 'Internship', { jobType: 'Internship' }],
    ['casual', 'Casual', { employmentType: 'Casual' }],
    ['not-inferred', null, { employmentType: 'Term' }],
  ];
  const fixtures = [];
  for (const [suffix, facet, fields] of variants) {
    const id = prefix + '-' + suffix;
    const data = { ...common, ...fields, title: `Fictional ${prefix} ${suffix}`, source: 'feed', sourcePostingDate: '2026-09-19', publishedAt: '2026-09-20T00:00:00.000Z', externalUrl: 'https://example.invalid/fictional/' + id };
    await seed(id, data); fixtures.push({ id, facet, data });
  }
  const missingId = prefix + '-missing', manualId = prefix + '-manual';
  await seed(missingId, { ...common, title: `Fictional ${prefix} missing`, source: 'feed', sourcePostingDate: '2026-09-19', publishedAt: '2026-09-20T00:00:00.000Z', externalUrl: 'https://example.invalid/fictional/' + missingId });
  await seed(manualId, { ...common, title: `Fictional ${prefix} manual`, source: 'manual', externalUrl: 'https://example.invalid/fictional/' + manualId });
  const duplicateIds = [prefix + '-duplicate-a', prefix + '-duplicate-b'];
  const adpTarget = 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=00000000-0000-4000-8000-000000000001&jobId=' + encodeURIComponent(prefix);
  const duplicate = { ...common, title: `Fictional ${prefix} duplicate`, source: 'feed', employmentType: 'Full-time', sourcePostingDate: '2026-09-19', externalUrl: adpTarget };
  for (const [index, id] of duplicateIds.entries()) await seed(id, { ...duplicate, publishedAt: index ? '2026-09-19T08:30:00.000Z' : '2026-09-19T00:00:00.000Z' });
  const before = await Promise.all(docs.map(async ref => ({ ref, data: (await ref.get()).data() })));
  const api = await inventory();
  assert.equal(api.count, docs.length - 1);
  assert.deepEqual(api.jobs.map(job => job.id).sort(), [...fixtures.map(f => f.id), missingId, manualId, duplicateIds[0]].sort());
  for (const job of api.jobs) {
    if (job.id === manualId) assert.equal(job.sourceMetadata, undefined);
    else assert.deepEqual(job.sourceMetadata, { salary: 'not-imported', closingDate: 'not-imported', employmentType: job.id === missingId ? 'not-imported' : 'available' });
  }
  await json('jobs-http', api); await record('actual-jobs-http-exact-count-derived-projection-adp-duplicate');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.base + '/jobs?q=' + encodeURIComponent(prefix));
  const cards = page.locator('.job-rich-card'); await expect(cards).toHaveCount(api.count);
  const type = page.getByRole('combobox', { name: 'Filter jobs by employment type', exact: true });
  for (const facet of ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Casual']) {
    const expected = fixtures.filter(f => f.facet === facet || (facet === 'Full-time' && f.id.endsWith('-temporary'))).map(f => f.data.title);
    if (facet === 'Full-time') expected.push(duplicate.title);
    await type.selectOption(facet); await expect(cards).toHaveCount(expected.length);
    assert.deepEqual((await cards.getByRole('heading').allTextContents()).sort(), expected.sort());
    await shot('jobs-filter-' + facet.toLowerCase()); await record('canonical-filter-' + facet, { titles: expected });
  }
  await type.selectOption('All'); await expect(cards).toHaveCount(api.count);
  const missingCard = cards.filter({ hasText: `Fictional ${prefix} missing` });
  await expect(missingCard.getByText('Pay not imported', { exact: true })).toBeVisible(); await expect(missingCard.getByText('Closing details not imported', { exact: true })).toBeVisible();
  const manualCard = cards.filter({ hasText: `Fictional ${prefix} manual` }); await expect(manualCard.getByText(/not imported/)).toHaveCount(0);
  await shot('missing-import-list'); await record('missing-import-list-honest-feed-only-labels');
  // List/API projection must not write anything. Detail visits independently POST
  // the existing view endpoint; await and account for that exact analytics write.
  for (const { ref, data } of before) assert.deepEqual((await ref.get()).data(), data, 'List projection must not mutate ' + ref.path);
  await record('list-projection-all-fixture-fields-unchanged');
  const visitedIds = [fixtures[0].id, missingId, ...duplicateIds];
  for (const id of visitedIds) {
    // Direct ID routes must retain both duplicate records; list projection is not an alias.
    const view = page.waitForResponse(response => response.url() === server.base + '/api/jobs/' + id + '/view' && response.request().method() === 'POST');
    await page.goto(server.base + '/jobs/' + id);
    assert.equal((await view).status(), 200, 'Detail view analytics completed');
    const expectedTitle = id.startsWith(prefix + '-duplicate') ? duplicate.title : id === missingId ? `Fictional ${prefix} missing` : fixtures[0].data.title;
    await expect(page.getByRole('heading', { name: expectedTitle, exact: true })).toBeVisible();
    await expect(page.getByText('Originally posted: 2026-09-19', { exact: true })).toBeVisible();
    const structured = await page.locator('script[type="application/ld+json"]').allTextContents();
    const flatten = value => Array.isArray(value) ? value.flatMap(flatten) : value && typeof value === 'object' ? [value, ...flatten(value['@graph'] || [])] : [];
    const posting = structured.flatMap(text => flatten(JSON.parse(text))).find(value => value['@type'] === 'JobPosting');
    assert.ok(posting, 'Actual server JSON-LD JobPosting'); assert.equal(posting.datePosted, '2026-09-19');
    await expect(page.getByText(/^Last source check:/)).toHaveCount(0);
    if (id === missingId) {
      const heading = page.locator('.journey-role-heading');
      await expect(heading.getByText('Pay not imported', { exact: true })).toBeVisible();
      await expect(heading.getByText('Closing details not imported', { exact: true })).toBeVisible();
      const original = heading.getByRole('link', { name: 'Check original posting (opens in a new tab)', exact: true });
      await expect(original).toHaveAttribute('href', 'https://example.invalid/fictional/' + missingId);
      await expect(original).toHaveAttribute('target', '_blank');
      await expect(original).toHaveAttribute('rel', /noopener/);
      await record('missing-import-detail-honest-labels-safe-original-link-not-followed');
    }
    await shot('detail-' + id.slice(prefix.length + 1)); await record('detail-calendar-jsonld-' + id.slice(prefix.length + 1));
  }
  for (const { ref, data } of before) assert.deepEqual((await ref.get()).data(), visitedIds.includes(ref.id) ? { ...data, viewCount: 1 } : data, 'Only the exact detail-view analytics increment may change ' + ref.path);
  await record('all-fixture-fields-unchanged-except-exact-detail-view-counts-no-persisted-derived-metadata');
  // Fictional emulator-only unsafe URLs are never clicked; navigation is denied.
  for (const [kind, externalUrl] of [
    ['script', 'javascript:window.__publicAuditInjected=true'],
    ['credentials', 'https://fictional-user:fictional-password@example.invalid/source'],
    ['html-url', '<svg onload="window.__publicAuditInjected=true">'],
  ]) {
    const id = prefix + '-unsafe-' + kind;
    const title = `Fictional ${id} <svg data-public-audit-injection="true" onload="window.__publicAuditInjected=true">`;
    const data = { ...common, source: 'feed', title, externalUrl };
    const ref = await seed(id, data);
    const view = page.waitForResponse(response => response.url() === server.base + '/api/jobs/' + id + '/view' && response.request().method() === 'POST');
    await page.goto(server.base + '/jobs/' + id);
    assert.equal((await view).status(), 200, 'Unsafe-source fixture view analytics completed');
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.journey-role-heading').getByRole('link', { name: 'Check original posting (opens in a new tab)', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-public-audit-injection]')).toHaveCount(0);
    assert.equal(await page.evaluate(() => Boolean(window.__publicAuditInjected)), false);
    await expect(page).toHaveURL(server.base + '/jobs/' + id);
    assert.equal(context.pages().length, 1, 'No popup navigation');
    assert.deepEqual(externalNavigations, [], 'No attempted external navigation');
    assert.deepEqual((await ref.get()).data(), { ...data, viewCount: 1 });
    await record('unsafe-source-' + kind + '-rejected-html-title-escaped-no-navigation');
  }
  assert.deepEqual(pageErrors, [], 'Unexpected browser page errors');
} catch (error) {
  failure = error; checks.push({ name: 'public-browser-acceptance', status: 'fail', error: scrub(error.message) });
  if (page && !page.isClosed()) try {
    await shot('failure');
    await json('failure-dom', {
      url: page.url(),
      roleCards: await page.locator('button[aria-pressed]').evaluateAll(cards => cards.map(card => ({ text: card.textContent, pressed: card.getAttribute('aria-pressed'), html: card.outerHTML }))),
      accessibility: await page.locator('body').ariaSnapshot(),
    });
  } catch { /* retain original error */ }
} finally {
  const cleanup = { documents: [], serverStopped: !server, browserStopped: !browser, errors: [] };
  const clean = async (name, action) => {
    try { await bounded(name, action); checks.push({ name: 'cleanup-' + name, status: 'pass' }); }
    catch (error) { const message = scrub(error.message); cleanup.errors.push({ name, error: message }); checks.push({ name: 'cleanup-' + name, status: 'fail', error: message }); }
  };
  // Every deletion/readback is independently bounded; one failure never skips another.
  for (const ref of docs) await clean(ref.path, async () => {
    const result = { path: ref.path, absent: false }; cleanup.documents.push(result);
    const snapshot = await ref.get();
    if (snapshot.exists) assert.equal(snapshot.data().employerId, prefix, 'Refuse deletion of a fixture not owned by this run');
    await ref.delete(); result.absent = !(await ref.get()).exists; assert.equal(result.absent, true);
  });
  await clean('browser', async () => { if (browser) { await browser.close(); assert.equal(browser.isConnected(), false); } cleanup.browserStopped = true; });
  await clean('server', async () => {
    if (server) {
      await server.stop();
      await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(Number(new URL(server.base).port), '127.0.0.1', () => probe.close(resolve)); });
    }
    cleanup.serverStopped = true;
  });
  await clean('firestore', () => db.terminate());
  await clean('admin-app', () => deleteApp(app));
  await clean('fixture-manifest', async () => {
    for (const entry of manifest.fixtures) entry.cleanup = cleanup.documents.find(result => result.path === entry.path) || { absent: false, unattempted: true };
    await json('fixture-manifest-' + prefix, manifest);
  });
  await json('cleanup', cleanup); await json('results', { checks, gaps });
  await json('network', { blocked, externalNavigations, pageErrors, policy: 'Browser permits only HTTP on owned 127.0.0.1 port and explicit demo emulator ports; service workers and WebSockets blocked. Admin explicitly targets demo emulator. Next child uses local-qa-server credential allowlist. No external navigation.' });
  if (cleanup.errors.length && !failure) failure = new Error('Cleanup verification failed; inspect cleanup.json');
}
if (failure) { console.error(scrub(failure.message)); process.exitCode = 1; }
else console.log('Public audit acceptance and exact fixture absence verified. Evidence: ' + output);
