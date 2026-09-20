import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

test('round2 actual jobs API deduplicates distinct IDs before count and returns full descriptions',async()=>{
 const examples=[['Branch Manager','Winnipeg'],['Trainee Insurance Advisor','Winnipeg'],['ELC Cook','Saskatoon'],['Accountant','Saskatoon'],['Insurance Advisor','Vernon'],['Insurance Advisor','Surrey'],['Insurance Advisor','Delta'],['STC Posting','Saskatoon']];
 const docs=examples.flatMap(([title,location],index)=>['a','z'].map(suffix=>({id:`fixture-${index}-${suffix}`,data:()=>({title,location,employerId:'fixture-org',employerName:'Fictional Employer',closingDate:'2099-12-31',description:'Full posting paragraph. '.repeat(120)+'End of posting.',descriptionFormat:'plain-text',active:true,status:'active'})})));
 let reverse=false;
 const db={getAll:async()=>[],collection:name=>{const query={where:()=>query,get:async()=>({docs:name==='jobs'?(reverse?[...docs].reverse():docs):[]})};return query;}};
 const net=offlineNetwork();
 const route=sourceModule('src/app/api/jobs/route.ts',{...net,mocks:{...net.mocks,'@/lib/firebase-admin':{getAdminDb:()=>db},'next/server':{NextResponse:{json:Response.json}}}});
 const first=await route.GET(new Request('https://fixture.test/api/jobs?employerId=fixture-org'));
 assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'no-store');
 const body=await first.json();assert.equal(body.count,examples.length);assert.equal(body.jobs.length,examples.length);
 assert.ok(body.jobs.every(job=>job.description.endsWith('End of posting.')));
 reverse=true;
 const second=await (await route.GET(new Request('https://fixture.test/api/jobs?employerId=fixture-org'))).json();
 assert.deepEqual(second,body);
 assert.equal(body.jobs.filter(job=>job.title==='Insurance Advisor').length,3);
 assert.equal(net.connections.length,0);
});
