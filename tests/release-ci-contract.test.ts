import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('root CI gates the complete emulator suite on a compatible runtime',()=>{
 const ci=readFileSync('.github/workflows/ci.yml','utf8');assert.match(ci,/root-reliability:/);const job=ci.slice(ci.indexOf('  root-reliability:'));assert.match(job,/node-version: "24.x"/);assert.match(job,/--project demo-iopps-preview/);assert.match(job,/--config firebase.ci.json/);assert.match(job,/--test tests\/\*\.test\.ts tests\/\*\.test\.mjs/);assert.doesNotMatch(job,/continue-on-error: true/);
 const config=JSON.parse(readFileSync('firebase.ci.json','utf8'));assert.equal(config.emulators.firestore.host,'127.0.0.1');assert.equal(config.emulators.auth.port,9099);assert.equal(config.emulators.storage.port,9199);
});
test('freshness external audit is manual-only until explicitly activated',()=>{const text=readFileSync('.github/workflows/listing-freshness.yml','utf8');assert.match(text,/workflow_dispatch:/);assert.doesNotMatch(text,/schedule:/);});

test('applicant-history verification owns its server rather than attaching to an unknown port',()=>{
 const history=readFileSync('tests/applicant-history-emulator.test.mjs','utf8');assert.match(history,/startIsolatedQaServer/);assert.doesNotMatch(history,/127\.0\.0\.1:3100/);
});

test('CI requires lint for the complete root runtime and maintained verification code',()=>{
 const ci=readFileSync('.github/workflows/ci.yml','utf8');
 const build=ci.slice(ci.indexOf('  root-build:'),ci.indexOf('  mobile-lint:'));
 assert.match(build,/run: npm run lint:release/);assert.doesNotMatch(build,/continue-on-error/);
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 assert.equal(pkg.scripts.lint,'eslint');
 assert.equal(pkg.scripts['lint:release'],'eslint src public packages tests e2e scripts/*.mjs next.config.ts postcss.config.mjs eslint.config.mjs playwright.config.ts');
});
