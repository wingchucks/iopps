import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';

function load({attested = true, existing = ['organizations/fictional-org'], failCollection} = {}) {
 const writes = [], reads = [];
 const rejectWrite = path => {
  if (path.endsWith(`/${failCollection}`)) throw new Error('Fictional write failure');
 };
 const db = {
  batch(){
   const staged = [];
   return {
    set(ref, data){staged.push({path:ref.path,data});},
    async commit(){
     for (const write of staged) rejectWrite(write.path);
     writes.push(...staged);
    },
   };
  },
  collection(name){return {doc(id){reads.push(`${name}/${id}`);return {
   get:async()=>({exists:existing.includes(`${name}/${id}`)}),
   collection:sub=>({
    doc:()=>({path:`${name}/${id}/${sub}`}),
    add:async data=>{const path=`${name}/${id}/${sub}`;rejectWrite(path);writes.push({path,data});},
   }),
  };}};},
 };
 const {POST} = sourceModule('src/app/api/employer/views/route.ts',{mocks:{
  'next/server':{NextResponse:{json:Response.json}},
  '@/lib/firebase-admin':{adminDb:db},
  'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=>'fictional-server-time'}},
  '@/lib/server/app-check':{verifyRequiredAppCheckFromRequest:async()=>attested},
 }});
 const send = body => POST(new Request('http://localhost/api/employer/views',{method:'POST',headers:{'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}));
 return {send, writes, reads};
}

for (const failCollection of ['views', 'activity']) {
 test(`a failed ${failCollection} write leaves neither profile-view record persisted`, async()=>{
  const {send, writes} = load({failCollection});
  const response = await send({orgId:'fictional-org',type:'profile'});
  assert.equal(response.status,500);
  assert.deepEqual(writes,[], 'count and activity must commit together or neither persists');
 });
}

test('profile views require an attested browser before any database access', async()=>{
 const {send, writes, reads} = load({attested:false});
 const response = await send({orgId:'fictional-org',type:'profile'});
 assert.equal(response.status,403);
 assert.deepEqual(writes,[]);assert.deepEqual(reads,[]);
});

test('profile views reject malformed identifiers, unsupported types and invalid bodies without writing', async()=>{
 const {send, writes} = load({existing:['organizations/fictional-org','organizations/a']});
 for (const body of [
  {orgId:'a/b/c',type:'profile'}, {orgId:'..',type:'profile'}, {orgId:'__reserved__',type:'profile'},
  {orgId:'x'.repeat(129),type:'profile'}, {orgId:{nested:true},type:'profile'}, {type:'profile'},
  {orgId:'fictional-org',type:'job',jobId:'fictional-job'}, {orgId:'fictional-org'}, [], 'not json',
 ]) assert.equal((await send(body)).status,400,JSON.stringify(body));
 assert.deepEqual(writes,[]);
});

test('profile views for unknown organizations are not recorded', async()=>{
 const {send, writes} = load({existing:[]});
 assert.equal((await send({orgId:'fictional-missing-org',type:'profile'})).status,404);
 assert.deepEqual(writes,[]);
});

test('profile views store only server-owned fields for existing organization or legacy employer records', async()=>{
 for (const existing of [['organizations/fictional-org'],['employers/fictional-org']]) {
  const {send, writes} = load({existing});
  const response = await send({orgId:'fictional-org',type:'profile',jobId:{huge:'x'.repeat(1000)},province:'fictional',timestamp:'forged'});
  assert.equal(response.status,200);
  // Route objects come from the isolated module context; compare their plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(writes)),[
   {path:'organizations/fictional-org/views',data:{type:'profile',timestamp:'fictional-server-time'}},
   {path:'organizations/fictional-org/activity',data:{type:'profile_view',message:'Someone viewed your organization profile',timestamp:'fictional-server-time'}},
  ]);
 }
});
