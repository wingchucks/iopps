// Full public-audit acceptance; credential-minimized demo emulators only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [key,value] of Object.entries({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[key],value);
const output=process.env.IOPPS_AUDIT_OUTPUT||'C:/Users/natha/Documents/Codex/2026-09-21/public-audit-remediation/acceptance';
fs.mkdirSync(output,{recursive:true});
const loader=new URL('./test-typescript-loader.mjs',import.meta.url).href;
const results=[];
function run(name,args){
 const logfile=path.join(output,name+'.log'),fd=fs.openSync(logfile,'w');
 const result=spawnSync(process.execPath,args,{env:{...process.env,IOPPS_TEST_EMULATORS:'true',IOPPS_TEST_MEMBER_RETIREMENT:'true',IOPPS_AUDIT_OUTPUT:output,IOPPS_CLEANUP_OUTPUT:output,IOPPS_QA3_OUTPUT:output,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files'},stdio:['ignore',fd,fd]});
 fs.closeSync(fd);results.push({name,status:result.status,error:result.error?.message,logfile});fs.writeFileSync(path.join(output,'commands.json'),JSON.stringify(results,null,2));console.log(name,result.status);return result.status===0;
}
let ok=run('build',['node_modules/next/dist/bin/next','build','--webpack']);
ok=run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'])&&ok;
ok=run('lint',['node_modules/eslint/bin/eslint.js','src','public','packages','tests','e2e','scripts/*.mjs','next.config.ts','postcss.config.mjs','eslint.config.mjs','playwright.config.ts'])&&ok;
const tests=fs.readdirSync('tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).map(n=>'tests/'+n);
ok=run('full-suite',['--import',loader,'--test','--test-concurrency=1',...tests])&&ok;
if(results.find(r=>r.name==='build')?.status===0){
 for(const [name,script] of [['audit-browser','qa-public-audit-browser'],['cleanup-browser','qa-safe-cleanup-browser'],['qa3-browser','qa-individual3-browser'],['regression-browser','qa-round2-browser']])ok=run(name,['--import',loader,`scripts/${script}.mjs`])&&ok;
}
process.exitCode=ok?0:1;
