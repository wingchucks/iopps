import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
test('candidate preview disabled with prior settings and crons unchanged',()=>{
 const current=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 const original=JSON.parse(execFileSync('git',['show','HEAD:vercel.json'],{encoding:'utf8'}));
 assert.equal(current.git.deploymentEnabled['fix/employer-qa-20260920'],false);
 delete original.git.deploymentEnabled['fix/employer-qa-20260920'];
 delete current.git.deploymentEnabled['fix/employer-qa-20260920'];assert.deepEqual(current,original);
});
test('onboarding step zero permits optional workspace branding',()=>{
 const source=fs.readFileSync('src/app/org/onboarding/page.tsx','utf8');
 const next=source.slice(source.indexOf('const handleNext'),source.indexOf('const handleBack'));
 assert.doesNotMatch(next,/missing.push\("upload your logo"\)/);
 assert.match(source,/Organization Logo \(optional for workspace\)/);
});
