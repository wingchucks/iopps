// Serial build/test/browser acceptance inside the owning demo emulator lifetime.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
const output=path.join('C:/Users/natha/Documents/Codex/2026-09-20/employer-qa','integration-'+Date.now());
fs.mkdirSync(output,{recursive:true});
const results=[];
// Playwright resolves installed Windows Chrome before its launch env is applied.
if(process.platform==='win32')process.env.PROGRAMFILES ||= 'C:/Program Files';
function run(name,args,extra={}) {
 const logfile=path.join(output,name+'.log'),fd=fs.openSync(logfile,'w');
 const result=spawnSync(process.execPath,args,{env:{...process.env,...extra,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'},stdio:['ignore',fd,fd]});
 fs.closeSync(fd);results.push({name,status:result.status,error:result.error?.message,logfile});fs.writeFileSync(path.join(output,'commands.json'),JSON.stringify(results,null,2));console.log(name,result.status,logfile);return result.status===0;
}
const built=run('build',['node_modules/next/dist/bin/next','build']);
run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);
run('lint',['node_modules/eslint/bin/eslint.js','src','public','packages','tests','e2e','scripts/*.mjs','next.config.ts','postcss.config.mjs','eslint.config.mjs','playwright.config.ts']);
run('full-suite',['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'--test',...fs.readdirSync('tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).map(n=>'tests/'+n)],{IOPPS_TEST_MEMBER_RETIREMENT:'true'});
if(built)run('employer-browser',['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'scripts/qa-employer-browser.mjs']);
process.exitCode=results.some(r=>r.status!==0)?1:0;
