// New local QA owner. Refuses non-demo settings; no credentials or provider calls.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const output = 'C:/Users/natha/Documents/Codex/2026-09-21/individual-qa3';
assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
fs.mkdirSync(output, { recursive: true });
const results=[];
function run(name,args,extra={}) {
 const logfile=path.join(output,`${name}.log`),fd=fs.openSync(logfile,'w');
 const result=spawnSync(process.execPath,args,{env:{...process.env,...extra,IOPPS_QA3_OUTPUT:output,TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files'},stdio:['ignore',fd,fd]});fs.closeSync(fd);
 results.push({name,status:result.status,error:result.error?.message,logfile});fs.writeFileSync(path.join(output,'commands.json'),JSON.stringify(results,null,2));console.log(name,result.status);return result.status===0;
}
const loader = new URL('./test-typescript-loader.mjs',import.meta.url).href;
if(!process.argv.includes('--browser-only')) {
 run('build',['node_modules/next/dist/bin/next','build','--webpack']);
 run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);
 run('lint',['node_modules/eslint/bin/eslint.js','src','public','packages','tests','e2e','scripts/*.mjs','next.config.ts','postcss.config.mjs','eslint.config.mjs','playwright.config.ts']);
 run('full-suite',['--import',loader,'--test',...fs.readdirSync('tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).map(n=>'tests/'+n)],{IOPPS_TEST_MEMBER_RETIREMENT:'true'});
}
run('qa3-browser',['--import',loader,'scripts/qa-individual3-browser.mjs']);
run('regression-browser',['--import',loader,'scripts/qa-round2-browser.mjs']);
process.exitCode=results.some(r=>r.status!==0)?1:0;
