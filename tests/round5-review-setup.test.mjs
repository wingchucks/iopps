import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
const profile = {community:'Community',location:'Town',bio:'Biography',nation:'Nation',territory:'Territory',languages:'English',headline:'Headline',skillsText:'Writing',interests:['jobs']};
function fixture({authTime=100, retryState, fail=false}={}) {
 const docs={users:{status:'active'},members:{...profile,photoURL:'fictional-photo',privateField:'keep'}};
 const writes=[],reads=[];
 const db={collection:name=>({doc:uid=>{assert.equal(uid,'owner');return name;}}),async runTransaction(fn){
  let result,pending;
  for(let attempt=0;attempt<(retryState?2:1);attempt++) {
   pending=[];
   result=await fn({async get(ref){assert.equal(pending.length,0,'all reads precede writes');reads.push(ref);return {exists:!!docs[ref],data:()=>docs[ref]};},set(ref,data){pending.push([ref,data]);}});
   if(attempt===0 && retryState)docs.users={...retryState};
  }
  if(fail)throw Error('fictional transaction failure');
  for(const [ref,data] of pending){writes.push(ref);docs[ref]={...docs[ref],...data};}
  return result;
 }};
 const {POST}=sourceModule('src/app/api/profile/setup/route.ts',{mocks:{'next/server':{NextResponse:{json:Response.json}},'@/lib/api-auth':{verifyAuthToken:async()=>({success:true,decodedToken:{uid:'owner',auth_time:authTime},userData:{...docs.users}})},'@/lib/firebase-admin':{getAdminDb:()=>db},'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'fictional-time'}}}});
 return {docs,writes,reads,POST};
}
for(const [name,state,status] of [
 ['closed',{status:'deleted',deletedAt:'fictional-time'},403],['deleted marker',{status:'active',deletedAt:'fictional-time'},403],
 ['suspended',{status:'suspended'},403],['disabled',{status:'disabled'},403],
 ['claims invalidated',{claimsValidAfter:100},401],['organization intent',{signupIntent:'organization'},409],
])test(`S1 pending setup rejects current ${name} without writes`,async()=>{
 const h=fixture();let release,entered;
 const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const pending=h.POST({json:async()=>{entered();await gate;return profile;}});await ready;
 h.docs.users=state;if(name==='closed')delete h.docs.members;
 const before=JSON.stringify(h.docs);release();
 assert.equal((await pending).status,status);assert.equal(JSON.stringify(h.docs),before);assert.deepEqual(h.writes,[]);assert.ok(h.reads.includes('users'));
});
for(const state of [{status:'deleted'},{signupIntent:'organization'},{claimsValidAfter:101}])test(`S1 transaction retry rechecks ${JSON.stringify(state)}`,async()=>{
 const h=fixture({retryState:state});const before=JSON.stringify(h.docs.members);
 assert.notEqual((await h.POST({json:async()=>profile})).status,200);assert.equal(JSON.stringify(h.docs.members),before);assert.deepEqual(h.writes,[]);assert.equal(h.docs.users.setupComplete,undefined);
});
test('S1 fresh claims and legacy missing user remain supported; failed commit is atomic',async()=>{
 for(const missing of [false,true]){const h=fixture();if(missing)delete h.docs.users;else h.docs.users.claimsValidAfter=99;
 assert.equal((await h.POST({json:async()=>({...profile,uid:'victim',role:'admin'})})).status,200);assert.equal(h.docs.members.photoURL,'fictional-photo');assert.equal(h.docs.members.privateField,'keep');assert.equal(h.docs.members.role,undefined);assert.equal(h.docs.users.setupComplete,true);}
 const h=fixture({fail:true}),before=JSON.stringify(h.docs);assert.equal((await h.POST({json:async()=>profile})).status,503);assert.equal(JSON.stringify(h.docs),before);
});

for(const [field,value] of Object.entries({community:'c'.repeat(301),location:'l'.repeat(301),nation:'n'.repeat(301),territory:'t'.repeat(301),languages:'l'.repeat(1001),headline:'h'.repeat(301),skillsText:'Skill, '.repeat(400),bio:'b'.repeat(6000),interests:Array.from({length:51},(_,i)=>`legacy-${i}-`+'i'.repeat(101))})) {
 test(`L1 preserves established ${field} unchanged and edited without new caps`,async()=>{
  for(const existing of [true,false]) {const h=fixture();if(existing)h.docs.members[field]=value;
   const response=await h.POST({json:async()=>({...profile,[field]:value})});
   assert.equal(response.status,200);assert.deepEqual(JSON.parse(JSON.stringify(h.docs.members[field])),value);assert.equal(h.docs.users.setupComplete,true);
  }
 });
 test(`L1 rejects invalid ${field} types atomically`,async()=>{
  const h=fixture(),before=JSON.stringify(h.docs);
  const response=await h.POST({json:async()=>({...profile,[field]:field==='interests'?[{}]:42})});
  assert.equal(response.status,400);const body=await response.json();assert.match(body.error,new RegExp(field));assert.equal(body.field,field);assert.equal(JSON.stringify(h.docs),before);assert.deepEqual(h.writes,[]);
 });
}
