import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('audit CLI writes verified JSON offline by default',()=>{
 const dir=mkdtempSync(join(tmpdir(),'freshness-'));
 try {
   const input=join(dir,'input.json'),output=join(dir,'report.json');
   writeFileSync(input,JSON.stringify({jobs:[{id:'one'}],scholarships:[]}));
   const run=spawnSync(process.execPath,['--import','./scripts/test-typescript-loader.mjs','scripts/audit-listing-freshness.mjs','--input',input,'--output',output],{encoding:'utf8'});
   assert.equal(run.status,0,run.stderr);
   const report=JSON.parse(readFileSync(output,'utf8'));
   assert.deepEqual(report.linkChecks,[],'no network without explicit approved origins');
   assert.equal(report.queueCount,report.queue.length);
 } finally {rmSync(dir,{recursive:true,force:true})}
});
const audit = await import('../scripts/audit-listing-freshness.mjs').catch(()=>null);
test('live inventory allowlists only public list GETs and rejects declared-count mismatches',async()=>{
 assert.equal(typeof audit?.fetchLiveInventory,'function');
 const calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/jobs')?{count:1,jobs:[{id:'one'}]}:{scholarships:[]}}};
 const inventory=await audit.fetchLiveInventory(fetcher);
 assert.equal(inventory.jobs.length,1);
 assert.deepEqual(calls.map(c=>c.url).sort(),['https://iopps.ca/api/jobs','https://iopps.ca/api/scholarships']);
 assert.ok(calls.every(c=>c.options.method==='GET'&&c.options.redirect==='error'&&c.options.signal));
 await assert.rejects(()=>audit.fetchLiveInventory(async()=>({ok:true,json:async()=>({count:2,jobs:[{id:'one'}],scholarships:[]})})),/count/i);
 const run=spawnSync(process.execPath,['--import','./scripts/test-typescript-loader.mjs','scripts/audit-listing-freshness.mjs','--live','--input','nonexistent.json','--output','unused.json'],{encoding:'utf8'});
 assert.equal(run.status,1);
 assert.match(run.stderr,/exactly one/i);
});

test('link checker sends HEAD only to explicitly approved HTTPS origins, never follows redirects',async()=>{
 assert.equal(typeof audit?.auditPublicLink,'function');
 const calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});return {status:403}};
 const finding=await audit.auditPublicLink('https://employer.example/job/1',['https://employer.example'],fetcher);
 assert.equal(finding.status,403);
 assert.equal(finding.autoDelete,false);
 assert.equal(calls[0].options.method,'HEAD');
 assert.equal(calls[0].options.redirect,'manual');
 for(const url of ['http://employer.example/job/1','https://other.example/job/1','https://user:pass@employer.example/job/1','https://employer.example/api/cron/expire-jobs']) await audit.auditPublicLink(url,['https://employer.example'],fetcher);
 assert.equal(calls.length,1);
});

test('read-only audit produces an actionable review queue, never deletion instructions',()=>{
 assert.equal(typeof audit?.buildFreshnessReview,'function','read-only freshness auditor must exist');
 const report=audit.buildFreshnessReview({jobs:[
  {id:'past',description:'Deadline is August 28, 2026'},
  {id:'unknown',description:'Term ends August 31, 2026',sourceVerifiedAt:'2026-01-01'},
 ],scholarships:[{id:'annual',deadline:'August 31, 2026'}]},new Date('2026-09-08T12:00:00Z'));
 assert.equal(report.counts.jobs,2);
 assert.equal(report.counts.scholarships,1);
 assert.ok(report.queue.find(r=>r.id==='past'&&r.reason==='past_deadline'));
 assert.ok(report.queue.find(r=>r.id==='annual'&&r.action.includes('next intake')));
 assert.ok(report.queue.find(r=>r.id==='unknown'&&r.reason==='needs_verification'));
 for (const status of [403,404,410,429,500,null]) {
   const finding=audit.linkReview(status);
   assert.equal(finding.autoDelete,false);
   assert.ok(finding.action.length>10);
 }
});
