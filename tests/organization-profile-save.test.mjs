import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';

function fixture(stored) {
  let writes=0;const revalidated=[];
  class EmployerApiError extends Error {constructor(status,message){super(message);this.status=status;}}
  const route=sourceModule('src/app/api/employer/profile/route.ts',{mocks:{
    'next/server':{NextResponse:{json:Response.json}},
    'next/cache':{revalidateTag:tag=>{revalidated.push(tag);}},
    'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'fictional-time'}},
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({collection:()=>({doc:()=>({})})})}),runTransaction:async fn=>fn({get:async()=>({exists:true,data:()=>stored}),update:(_ref,patch)=>{Object.assign(stored,patch);writes++;},set:()=>{}})})},
    '@/lib/server/employer-auth':{EmployerApiError,requireEmployerContext:async()=>({orgRole:'owner',orgId:'fictional',uid:'fictional',employerId:'fictional'})},
    '@/lib/school-visibility':{isSchoolOrganization:()=>false},
    '@/lib/business-listing-review':{reviewAfterProfileEdit:()=>null},
    '@/lib/server/business-listing-review':{recordReviewChange:()=>{},reviewError:error=>Response.json({error:error.message},{status:error.status||500})},
  }});
  return {put:body=>route.PUT(new Request('http://localhost/api/employer/profile',{method:'PUT',body:JSON.stringify(body)})),stored,revalidated,get writes(){return writes;}};
}

test('unchanged legacy logo alias and trimmed links permit unrelated profile saves',async()=>{
 const h=fixture({name:'Fictional Org',logo:' legacy-logo ',website:' legacy.example ',socialLinks:{instagram:' old-handle '},gallery:[' legacy-image ']});
 const response=await h.put({name:'Updated Fictional Org',logoUrl:'legacy-logo',website:'legacy.example',socialLinks:{instagram:'old-handle'},gallery:['legacy-image']});
 assert.equal(response.status,200);assert.equal(h.stored.name,'Updated Fictional Org');assert.equal(h.writes,1);
});

test('new unsafe links still reject the entire profile save; valid links and clearing work',async()=>{
 for(const body of [{website:'new.example'},{logoUrl:'javascript:alert(1)'},{socialLinks:{instagram:'new-handle'}},{gallery:['bad-new-image']}]) {
  const h=fixture({name:'Fictional Org',website:'old.example'});
  assert.equal((await h.put({name:'Must not save',...body})).status,400);assert.equal(h.stored.name,'Fictional Org');assert.equal(h.writes,0);
 }
 const h=fixture({name:'Fictional Org',website:'old.example'});
 assert.equal((await h.put({website:'https://example.invalid',logoUrl:''})).status,200);
 assert.equal(h.stored.website,'https://example.invalid');
});

test('blank organization names are refused while a missing legacy name can be repaired',async()=>{
 for(const name of ['', '   ',null]) {
  const h=fixture({name:'Fictional Org'});assert.equal((await h.put({name})).status,400);assert.equal(h.stored.name,'Fictional Org');assert.equal(h.writes,0);
 }
 const h=fixture({name:''});assert.equal((await h.put({name:'Repaired Fictional Org'})).status,200);assert.equal(h.stored.name,'Repaired Fictional Org');
});

test('a saved partner profile edit refreshes the cached partner cards; other organizations and refused saves do not',async()=>{
 const partner={name:'Fictional Partner',plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionEnd:'2099-01-01T00:00:00.000Z'};
 let h=fixture({...partner});
 assert.equal((await h.put({name:'Renamed Fictional Partner'})).status,200);assert.deepEqual(h.revalidated,['public-partners']);
 h=fixture({...partner});
 assert.equal((await h.put({name:'Must not save',website:'not-a-link'})).status,400);assert.deepEqual(h.revalidated,[]);
 h=fixture({name:'Fictional Org'});
 assert.equal((await h.put({name:'Renamed Fictional Org'})).status,200);assert.deepEqual(h.revalidated,[],'a non-partner never appears on the partner cards');
});
