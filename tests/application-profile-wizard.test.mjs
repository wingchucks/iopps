import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';
import { submitApplication } from '../src/lib/server/application-submission.ts';
import { applicationReceiptRecord } from '../src/lib/application-receipt.ts';

const chrome = [process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome',
  '/usr/bin/chromium', chromium.executablePath()].find(candidate => candidate && fs.existsSync(candidate));

// Actual React wizard, loaders and event handlers with explicit local data adapters.
// Not a Next middleware/auth/emulator test. No production job reads or email.
test('profile wizard: accessible selection, explained requirements and profile-only receipt', { skip: !chrome && 'Install Chrome or Playwright Chromium to run the isolated browser fixture' }, async t => {
  const require = createRequire(import.meta.url);
  const root = path.resolve('.');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'iopps-apply-fixture-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const write = (name, text) => { const p = path.join(temp, name); fs.writeFileSync(p, text); return p; };
  const profile = { uid: 'fixture-applicant', displayName: 'Fictional Applicant', email: 'applicant@example.test', headline: 'Fixture skills', skills: ['Testing'] };
  const job = { id: 'fixture-role', type: 'job', title: 'Fictional role', status: 'active', orgId: 'fixture-org', orgName: 'Fictional employer' };
  let fixture = { job, profile };
  const records = new Map();
  let writes = 0, submitted, notifications = 0;
  const db = { collection: c => ({ doc: id => ({ path: `${c}/${id}` }) }), runTransaction: async fn => fn({
    get: async ref => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
    create: (ref, data) => { writes++; records.set(ref.path, data); },
  }) };
  const noop = write('noop.js', 'export const assertLaunchAvailable=async()=>{}; export const trackJobFunnelEvent=()=>{};');
  const shell = write('shell.js', 'export default function Shell({children}) {return children;}');
  const link = write('link.js', "import React from 'react'; export default function Link(props){return React.createElement('a',props);}");
  const auth = write('auth.js', `const user={uid:'fixture-applicant',getIdToken:async()=>'fictional-token'}; export const useAuth=()=>({user});`);
  const navigation = write('navigation.js', `const router={replace:()=>{}}; export const useRouter=()=>router; export const useParams=()=>({slug:'fixture-role'});`);
  const toast = write('toast.js', 'const showToast=()=>{}; export const useToast=()=>({showToast});');
  const data = write('data.js', 'export const getPost=async()=>window.fixture.job; export const getMemberProfile=async()=>window.fixture.profile; export const getApplicantReceipt=async()=>null;');
  const storage = write('storage.js', `
    export const storage={}; export const ref=()=>({});
    export const uploadBytesResumable=(ref,file,metadata)=>{
      if(metadata?.contentType!=='application/pdf') throw Error('Missing resume content type');
      const task={snapshot:{ref,bytesTransferred:0,totalBytes:file.size},on:(event,progress,error,complete)=>{
        if(event!=='state_changed') throw Error('Unexpected upload event');
        progress(task.snapshot);
        window.finishFixtureUpload=()=>{task.snapshot.bytesTransferred=file.size;progress(task.snapshot);complete();};
      }};
      return task;
    };
    export const getDownloadURL=async()=>'https://fixture.invalid/resume.pdf';
    export const getBlob=async()=>{throw Error('Unexpected saved resume read');};
  `);
  const loader = write('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;};`);
  const entry = write('entry.js', `import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from ${JSON.stringify(path.join(root, 'src/app/jobs/[slug]/apply/page.tsx'))}; createRoot(document.getElementById('root')).render(React.createElement(Page));`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry, devtool: false,
    output: { path: temp, filename: 'bundle.js' },
    module: { rules: [{ test: /\.tsx?$/, use: loader }] },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')], alias: {
      '@/lib/launch-client': noop, '@/lib/job-funnel-analytics': noop,
      '@/components/ProtectedRoute': shell, '@/components/AppShell': shell,
      'next/link': link, 'next/navigation': navigation, '@/lib/auth-context': auth,
      '@/lib/toast-context': toast, '@/lib/firestore/posts': data, '@/lib/firestore/members': data,
      '@/lib/firestore/applications': data, '@/lib/firebase': storage, 'firebase/storage': storage,
      '@': path.join(root, 'src'),
    } },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString('errors-only'))) : resolve()));
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(fs.readFileSync(path.join(temp, 'bundle.js'))); return; }
      if (req.url?.startsWith('/api/applications?')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ application: null })); return; }
      if (req.url === '/api/applications/notify') { notifications++; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ sent: false, reason: 'fixture-no-email' })); return; }
      if (req.url === '/api/applications' && req.method === 'POST') {
        assert.equal(req.headers.authorization, 'Bearer fictional-token');
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        submitted = JSON.parse(Buffer.concat(chunks).toString());
        const result = await submitApplication(db, 'fixture-applicant', submitted);
        // Return a read-back receipt from the real submission orchestration's fixture store.
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ created: result.created, application: applicationReceiptRecord({ ...records.get(`applications/${result.application.id}`), id: result.application.id }) })); return;
      }
      if (req.url !== '/') { res.statusCode = 404; res.end('Unexpected fixture request'); return; }
      res.setHeader('content-type', 'text/html');
      res.end(`<!doctype html><html><body><div id="root"></div><script>window.fixture=${JSON.stringify(fixture)}</script><script src="/bundle.js"></script></body></html>`);
    } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: error.message })); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const escaped = [], errors = [];
  await context.route('**/*', route => { if (new URL(route.request().url()).origin !== base) { escaped.push(route.request().url()); return route.abort(); } return route.continue(); });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  async function load(overrides = {}, candidate = profile) {
    const record = { ...job, ...overrides }; records.set('jobs/fixture-role', record);
    fixture = { job: record, profile: candidate };
    await page.goto(base); await page.getByRole('heading', { name: 'Resume', exact: true }).waitFor();
  }
  const next = () => page.getByRole('button', { name: 'Next', exact: false });
  const toggle = () => page.getByRole('switch', { name: 'Use my IOPPS Profile as my application', exact: true });

  await t.test('required file remains enforced and explains how to recover with profile selected', async () => {
    await load({ requiresResume: true }); await toggle().click();
    await expect(toggle()).toBeChecked(); await expect(next()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('This employer requires a resume file');
    await expect(next()).toHaveAttribute('aria-describedby', 'application-next-requirement');
  });
  await t.test('no resume gives a reason; toggle on enables Next and off disables it again', async () => {
    await load(); await expect(next()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Upload a resume or choose your IOPPS profile');
    await toggle().focus(); await page.keyboard.press('Space');
    await expect(toggle()).toBeChecked(); await expect(next()).toBeEnabled();
    await page.keyboard.press('Space'); await expect(toggle()).not.toBeChecked(); await expect(next()).toBeDisabled();
    await toggle().click(); await next().click();
    await expect(page.getByRole('heading', { name: 'Cover Letter', exact: true })).toBeVisible();
    await expect(next()).toBeEnabled();
  });
  await t.test('missing profile explains unavailable choice and upload alternative', async () => {
    await load({}, null); await expect(toggle()).toBeDisabled(); await expect(next()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Your IOPPS profile is unavailable');
  });
  await t.test('a saved resume satisfies a required-file job without a new upload', async () => {
    await load({ requiresResume: true }, { ...profile, resumeUrl: 'https://fixture.invalid/saved.pdf' });
    await toggle().click(); await expect(next()).toBeEnabled(); await next().click();
    await expect(page.getByRole('heading', { name: 'Cover Letter', exact: true })).toBeVisible();
    await expect(next()).toBeEnabled();
  });
  await t.test('pending upload explains disabled Next; completion and removal update eligibility', async () => {
    await load({ requiresResume: true });
    await page.locator('input[type=file]').setInputFiles({ name: 'fictional.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fictional document') });
    await expect(next()).toBeDisabled(); await expect(toggle()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Please wait for your resume upload to finish');
    await page.evaluate(() => window.finishFixtureUpload()); await expect(next()).toBeEnabled();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(next()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Upload a resume or choose your IOPPS profile');
  });
  await t.test('cover letter and references requirements explain each disabled Next; profile-only submission is saved', async () => {
    await load({ requiresCoverLetter: true, requiresReferences: true });
    await toggle().click(); await next().click(); await expect(next()).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('A cover letter is required');
    await page.getByLabel('Cover letter', { exact: true }).fill('Fictional cover letter');
    await expect(next()).toBeDisabled(); await expect(page.getByRole('status')).toContainText('References are required');
    await page.getByLabel('References (required)', { exact: true }).fill('Fictional reference, permission granted');
    await expect(next()).toBeEnabled(); await next().click();
    await expect(page.getByRole('heading', { name: 'Review Your Application' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit Application', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Application saved' })).toBeVisible();
    assert.equal(submitted.resumeUrl, ''); assert.equal(submitted.resumeType, 'profile');
    assert.equal(writes, 1); assert.equal(records.get('applications/fixture-applicant_fixture-role').profileSnapshot.displayName, profile.displayName);
    await expect(page.getByRole('status')).toContainText('notification delivery is not confirmed');
    assert.equal(notifications, 1);
    assert.equal(records.get('applications/fixture-applicant_fixture-role').resumeUrl, '');
  });
  assert.deepEqual(escaped, []); assert.deepEqual(errors, []);
});
