import test from 'node:test';import assert from 'node:assert/strict';import {sourceModule} from './helpers/security-fixtures.mjs';
test('employer-only document-ID links resolve without resurrecting a missing canonical organization',async()=>{
 const rows=new Map([['employers/legacy-id',{name:'Fictional Legacy Cafe',status:'approved'}]]);
 const doc=(collection,id)=>({id,exists:rows.has(collection+'/'+id),data:()=>rows.get(collection+'/'+id)});
 const db={collection(name){return {doc:id=>({get:async()=>doc(name,id)}),where(field,op,value){return {limit(){return this},get:async()=>{const docs=[...rows].filter(([key,data])=>key.startsWith(name+'/')&&data[field]===value).map(([key])=>doc(name,key.slice(name.length+1)));return {empty:!docs.length,docs};}}}}}};
 const {resolvePublicOrganization}=sourceModule('src/lib/server/public-organization-resolver.ts',{mocks:{'@/lib/server/subscription-state':{applyNormalizedSubscriptionState:x=>x}}});
 assert.equal((await resolvePublicOrganization(db,'legacy-id'))?.id,'legacy-id');
 rows.set('employers/legacy-id',{name:'Old Private Copy',orgId:'missing-canonical'});assert.equal(await resolvePublicOrganization(db,'legacy-id'),null);
 rows.set('organizations/missing-canonical',{name:'Canonical Cafe',slug:'canonical',status:'approved'});assert.equal((await resolvePublicOrganization(db,'legacy-id')).id,'missing-canonical');
});
