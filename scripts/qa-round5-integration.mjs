// One serial gate owner, inside demo emulators. No real credentials or endpoints.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [key,value] of Object.entries({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[key],value);
const out=path.resolve('reports/round5/acceptance');fs.mkdirSync(out,{recursive:true});
const results=[];
const env={...process.env,IOPPS_TEST_EMULATORS:'true',IOPPS_TEST_MEMBER_RETIREMENT:'true',IOPPS_AUDIT_OUTPUT:out,IOPPS_CLEANUP_OUTPUT:out,IOPPS_QA3_OUTPUT:out,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files',TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'};
const clean=s=>String(s).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]');
function run(name,args){const start=new Date().toISOString();const logfile=path.join(out,name+'.log');const r=spawnSync(process.execPath,args,{env,encoding:'utf8',maxBuffer:60*1024*1024,timeout:20*60*1000});fs.writeFileSync(logfile,clean((r.stdout||'')+(r.stderr||'')));results.push({name,status:r.status,error:r.error?.message,start,end:new Date().toISOString(),logfile});fs.writeFileSync(path.join(out,'commands.json'),JSON.stringify(results,null,2));console.log(name,r.status);return r.status===0;}
const loader=new URL('./test-typescript-loader.mjs',import.meta.url).href;
// Expected behavioral RED is exact-baseline mounted-kind change, NOT ordinary retry.
const baseline=spawnSync(process.execPath,['--import',loader,'--test','tests/opportunity-directory-retry.test.ts'],{env:{...env,IOPPS_SECURITY_BASELINE:'true'},encoding:'utf8',timeout:180000,maxBuffer:10*1024*1024});
fs.writeFileSync(path.join(out,'opportunity-baseline.log'),clean((baseline.stdout||'')+(baseline.stderr||'')));
const baselineRows=JSON.parse(fs.readFileSync('reports/opportunity-directory-retry/baseline/results.json','utf8')).rows;
assert.equal(baseline.status,1);assert.equal(baselineRows.length,8);
assert.equal(baselineRows.filter(r=>r.scenario==='retry'&&r.status==='passed').length,4);
assert.equal(baselineRows.filter(r=>r.scenario==='kind-change'&&r.status==='failed').length,4);
const browserOnly=process.argv.includes('--browser-only');
const built=browserOnly?fs.existsSync('.next/BUILD_ID'):run('build',['node_modules/next/dist/bin/next','build','--webpack']);
if(!browserOnly){run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);run('lint',['node_modules/eslint/bin/eslint.js','src','public','packages','tests','e2e','scripts/*.mjs','next.config.ts','postcss.config.mjs','eslint.config.mjs','playwright.config.ts']);run('full-suite',['--import',loader,'--test','--test-concurrency=1',...fs.readdirSync('tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).map(n=>'tests/'+n)]);}
if(built)for(const [name,file] of [['round5-browser','qa-round5-browser'],['individual-browser','qa-individual3-browser'],['round2-browser','qa-round2-browser'],['public-browser','qa-public-audit-browser'],['employer-browser','qa-employer-browser'],['opportunity-retry-browser','qa-opportunity-retry'],['avatar-component-browser','qa-round5-avatar'],['avatar-built-browser','qa-round5-avatar-built']])run(name,['--import',loader,`scripts/${file}.mjs`]);
process.exitCode=results.some(r=>r.status!==0)?1:0;
