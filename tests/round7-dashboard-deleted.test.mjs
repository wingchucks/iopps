import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';
test('dashboard excludes deleted canonical jobs and legacy posts before counting applications',async()=>{
 const doc=(id,data)=>({id,data:()=>data});const reads=[];
 const fixtures={jobs:[doc('keep',{title:'Keep',status:'closed'}),doc('deleted',{title:'Deleted draft',status:'deleted'}),doc('marked',{deletedAt:'stamp',status:'active'})],posts:[doc('legacy',{type:'job',status:'active'}),doc('legacy-deleted',{type:'job',status:'deleted'}),doc('legacy-marked',{type:'job',deletedAt:'stamp'}),doc('event',{type:'event',status:'active'})]};
 const db={runTransaction:fn=>fn({get:ref=>ref.get()}),collection(name){const q={where(field,op,value){if(name==='applications')reads.push(value);return q;},orderBy(){return q;},limit(){return q;},doc(id){return {id,get:async()=>({id,exists:true,data:()=>({})})}},get:async()=>({docs:fixtures[name]||[],size:0})};return q;}};
 const {GET}=sourceModule('src/app/api/employer/dashboard/route.ts',{mocks:{'next/server':{NextResponse:{json:Response.json}},'@/lib/firebase-admin':{getAdminDb:()=>db},'@/lib/server/featured-job-entitlements':{buildFeaturedJobSummary:x=>x},'@/lib/server/employer-auth':{EmployerApiError:Error,requireEmployerContext:async()=>({uid:'owner',userData:{},employerId:'org',orgId:'org',employerData:{},organizationData:{name:'Fictional'},orgRole:'owner'})},'@/lib/organization-profile':{normalizeOrganizationRecord:x=>x},'@/lib/school-visibility':{isSchoolOrganization:()=>false}}});
 const r=await GET(new Request('http://localhost/api/employer/dashboard'));assert.equal(r.status,200);const body=await r.json();assert.deepEqual(body.jobs.map(x=>x.id),['keep']);assert.deepEqual(body.posts.map(x=>x.id),['legacy','event']);assert.deepEqual(reads,['keep']);
});
