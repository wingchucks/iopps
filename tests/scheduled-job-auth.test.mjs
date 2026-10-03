import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as jose from 'jose';
import { sourceModule } from './helpers/security-fixtures.mjs';

// The daily jobs accept Vercel Cron's secret or a GitHub OIDC token from the scheduled-jobs
// workflow on master. These tokens are signed by a local key standing in for GitHub's.
const ISSUER = 'https://token.actions.githubusercontent.com';
const AUDIENCE = 'iopps-scheduled-jobs';
const WORKFLOW_REF = 'wingchucks/iopps/.github/workflows/scheduled-jobs.yml@refs/heads/master';
const github = await jose.generateKeyPair('RS256');
const impostor = await jose.generateKeyPair('RS256');
const githubKeys = jose.createLocalJWKSet({ keys: [{ ...await jose.exportJWK(github.publicKey), kid: 'github', alg: 'RS256' }] });

function harness(env = {}) {
  const jwksUrls = [];
  let keyLookups = 0;
  const auth = sourceModule('src/lib/server/scheduled-job-auth.ts', {
    globals: { process: { env } },
    mocks: { jose: { ...jose, createRemoteJWKSet: url => {
      jwksUrls.push(String(url));
      return (...args) => { keyLookups++; return githubKeys(...args); };
    } } },
  });
  const allows = authorization => auth.isScheduledJobRequest(new Request('https://www.iopps.ca/api/cron/expire-jobs',
    authorization === undefined ? {} : { headers: { authorization } }));
  return { auth, allows, jwksUrls, get keyLookups() { return keyLookups; } };
}

function githubToken(claims = {}, { key = github.privateKey, issuer = ISSUER, audience = AUDIENCE, expires = '5m' } = {}) {
  return new jose.SignJWT({
    repository: 'wingchucks/iopps', repository_id: '1160177200', workflow_ref: WORKFLOW_REF,
    ref: 'refs/heads/master', event_name: 'schedule', ...claims,
  }).setProtectedHeader({ alg: 'RS256', kid: 'github' }).setIssuer(issuer).setAudience(audience)
    .setIssuedAt().setExpirationTime(expires).sign(key);
}

test('Vercel Cron keeps working with its secret, and nothing passes without one', async () => {
  const configured = harness({ CRON_SECRET: 'fictional-cron' });
  assert.equal(await configured.allows('Bearer fictional-cron'), true);
  for (const header of [undefined, '', 'fictional-cron', 'Bearer wrong', 'Bearer fictional-cron2']) {
    assert.equal(await configured.allows(header), false, String(header));
  }
  for (const secret of [undefined, '']) {
    const missing = harness({ CRON_SECRET: secret });
    for (const header of [undefined, 'Bearer undefined', 'Bearer ', 'Bearer']) {
      assert.equal(await missing.allows(header), false, `${secret}: ${header}`);
    }
    assert.equal(missing.keyLookups, 0, 'a value that is not a token never reaches GitHub');
  }
});

test('the scheduled-jobs workflow on master passes with GitHub-signed tokens', async () => {
  const h = harness();
  assert.deepEqual(h.jwksUrls, [`${ISSUER}/.well-known/jwks`]);
  assert.equal(await h.allows(`Bearer ${await githubToken()}`), true);
  assert.equal(await h.allows(`Bearer ${await githubToken({ event_name: 'workflow_dispatch' })}`), true);
});

test('tokens from any other repository, workflow, branch, event, audience or signer are refused', async () => {
  const h = harness({ CRON_SECRET: 'fictional-cron' });
  const refused = {
    'another repository': await githubToken({ repository: 'someone/iopps', repository_id: '42' }),
    'a recreated namesake': await githubToken({ repository_id: '42' }),
    'another branch': await githubToken({ workflow_ref: WORKFLOW_REF.replace('refs/heads/master', 'refs/heads/feature') }),
    'another workflow': await githubToken({ workflow_ref: WORKFLOW_REF.replace('scheduled-jobs.yml', 'ci.yml') }),
    'a push': await githubToken({ event_name: 'push' }),
    'a pull request': await githubToken({ event_name: 'pull_request_target' }),
    'no event': await githubToken({ event_name: undefined }),
    'another audience': await githubToken({}, { audience: 'https://example.invalid' }),
    'another issuer': await githubToken({}, { issuer: 'https://issuer.example.invalid' }),
    'an expired token': await githubToken({}, { expires: Math.floor(Date.now() / 1000) - 120 }),
    'another signer': await githubToken({}, { key: impostor.privateKey }),
    'an unsigned token': new jose.UnsecuredJWT({ repository_id: '1160177200', workflow_ref: WORKFLOW_REF, event_name: 'schedule' })
      .setIssuer(ISSUER).setAudience(AUDIENCE).setIssuedAt().setExpirationTime('5m').encode(),
  };
  for (const [name, token] of Object.entries(refused)) assert.equal(await h.allows(`Bearer ${token}`), false, name);
});

test('the workflow runs every job vercel.json schedules, after Vercel, without a stored secret', () => {
  const { SCHEDULED_JOBS_AUDIENCE, SCHEDULED_JOBS_WORKFLOW } = harness().auth;
  assert.equal(SCHEDULED_JOBS_AUDIENCE, AUDIENCE);
  assert.ok(existsSync(SCHEDULED_JOBS_WORKFLOW));
  const workflow = readFileSync(SCHEDULED_JOBS_WORKFLOW, 'utf8');
  assert.match(workflow, /^\s+id-token: write$/m);
  assert.match(workflow, new RegExp(`AUDIENCE: ${AUDIENCE}$`, 'm'));
  assert.doesNotMatch(workflow, /secrets\./);

  const minutes = schedule => { const [minute, hour] = schedule.split(' ').map(Number); return hour * 60 + minute; };
  const crons = JSON.parse(readFileSync('vercel.json', 'utf8')).crons.toSorted((a, b) => minutes(a.schedule) - minutes(b.schedule));
  const jobs = /for job in ([\w -]+); do/.exec(workflow)[1].split(' ');
  assert.deepEqual(jobs.map(job => `/api/cron/${job}`), crons.map(cron => cron.path));
  assert.ok(minutes(/cron: "([^"]+)"/.exec(workflow)[1]) > minutes(crons.at(-1).schedule));
  for (const { path } of crons) {
    const route = readFileSync(`src/app${path}/route.ts`, 'utf8');
    assert.match(route, /if \(!await isScheduledJobRequest\((req|request)\)\)/, path);
    assert.doesNotMatch(route, /CRON_SECRET/, path);
  }
});
