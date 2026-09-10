// Credential-minimized production-build HTTP/Chrome smoke; never production URLs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {startIsolatedQaServer} from './local-qa-server.mjs';
const server=await startIsolatedQaServer();
const reports='C:/Users/natha/AppData/Local/hermes/reports';
const checks=[];
try{
 const endpoint=server.base+'/api/hermes/v1/reports/billing-publishing';
 const body='{"report":"billing-publishing-v1"}';
 const missing=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body});
 assert.equal(missing.status,401);assert.equal(missing.headers.get('cache-control'),'no-store');checks.push('built report route rejects unsigned request with no-store');
 const large=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:'x'.repeat(129)});
 assert.equal(large.status,413);checks.push('built route enforces 128-byte body bound');
 const query=await fetch(endpoint+'?collection=users',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body});
 assert.equal(query.status,404);checks.push('built route rejects caller query scope');
 const get=await fetch(endpoint,{redirect:'error'});assert.equal(get.status,405);checks.push('built route is POST-only');
 for(const [script,name]of [['qa-homepage-cleanup.mjs','homepage'],['qa-job-flow.mjs','jobs']]){
  const child=spawn(process.execPath,['scripts/'+script],{env:{...process.env,QA_BASE_URL:server.base,QA_OUTPUT:`${reports}/iopps-reconciliation-${name}-smoke`,QA_CHROME_EXECUTABLE:'C:/Program Files/Google/Chrome/Application/chrome.exe'},stdio:['ignore','pipe','pipe']});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;});
  const status=await new Promise(resolve=>child.once('exit',resolve));await fs.writeFile(`${reports}/iopps-reconciliation-${name}-smoke.log`,output);assert.equal(status,0,output);checks.push(`Chrome ${name} fixture smoke`);
 }
 const result={base:server.base,checks,count:checks.length,scope:'local production build only; positive signed route and CLI verified separately with ephemeral fixture keys in emulator tests'};
 await fs.writeFile(`${reports}/iopps-reconciliation-http.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await server.stop();}
