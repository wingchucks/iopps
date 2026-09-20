// Owned demo-only aggregate runner; never inherit application credentials.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const output = 'C:/Users/natha/Documents/Codex/2026-09-19/so-i-need-you-to-go/output/qa-round2';
assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
fs.mkdirSync(output,{recursive:true});
const results=[];
function run(name,args,extra={}) {
 const logfile=path.join(output,`integration-${name}.log`), fd=fs.openSync(logfile,'w');
 const result=spawnSync(process.execPath,args,{env:{...process.env,...extra,TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming'},stdio:['ignore',fd,fd]}); fs.closeSync(fd);
 results.push({name,command:[process.execPath,...args],status:result.status,error:result.error?.message,logfile});
 fs.writeFileSync(path.join(output,'integration-commands.json'),JSON.stringify(results,null,2));
 console.log(name,result.status);
 return result.status===0;
}
run('final-build',['node_modules/next/dist/bin/next','build']);
run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);
run('release-lint',['node_modules/eslint/bin/eslint.js','src','public','packages','tests','e2e','scripts/*.mjs','next.config.ts','postcss.config.mjs','eslint.config.mjs','playwright.config.ts']);
run('full-suite',['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'--test',...fs.readdirSync('tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).map(n=>'tests/'+n)],{IOPPS_TEST_MEMBER_RETIREMENT:'true'});
run('opt-in-browsers',['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'--test','tests/jobs-listing-browser.test.mjs','tests/qa-accessibility-nav-browser.test.mjs','tests/organization-admin-assignment-browser.test.mjs','tests/job-detail-ui.test.mjs'],{IOPPS_TEST_JOB_DETAIL_BROWSER:'true',IOPPS_TEST_JOBS_BROWSER:'true',IOPPS_QA_ACCESSIBILITY_BROWSER:'true',IOPPS_TEST_ASSIGNMENT_BROWSER:'true',IOPPS_QA_ACCESSIBILITY_EVIDENCE:output});
run('next-browser',['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'scripts/qa-round2-browser.mjs']);
process.exitCode=results.some(r=>r.status!==0)?1:0;
