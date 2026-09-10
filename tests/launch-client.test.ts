import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {assertLaunchAvailable} from '../src/lib/launch-client';
test('client permits writes only after an active uncached launch status',async()=>{
 await assertLaunchAvailable(async()=>Response.json({status:'active'}));
 for(const response of [Response.json({status:'maintenance'}),Response.json({status:'unknown'}),new Response('',{status:503})]) await assert.rejects(assertLaunchAvailable(async()=>response),/maintenance|temporarily/i);
 await assert.rejects(assertLaunchAvailable(async()=>{throw Error('offline');}),/temporarily/i);
});
test('application guard precedes direct upload and application submission work',()=>{
 const s=readFileSync('src/app/jobs/[slug]/apply/page.tsx','utf8');
 for(const name of ['const handleFileSelect','const handleSubmit']){const f=s.slice(s.indexOf(name));const guard=f.indexOf('await assertLaunchAvailable()');assert.ok(guard>=0);assert.ok(guard<f.indexOf('await uploadBytes'));}
});
