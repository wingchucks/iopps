import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAliasRecord } from '../src/lib/server/job-aliases.ts';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { findPublicJobDocument } from '../src/lib/server/public-job-routing.ts';

const aliasFixture = {schemaVersion:1,active:true,kind:'duplicate',originalId:'old',canonicalId:'new',sourceKey:'adp:11111111-1111-1111-1111-111111111111:R',auditId:'audit',slugs:['old-role'],redirectStatus:307};
const canonicalFixture = {active:true,slug:'role--new',employerId:'tsRvNLiRWARbOoiBOiEVFDwFfZn2',externalUrl:'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=11111111-1111-1111-1111-111111111111&jobId=R'};

test('alias destination with a persisted canonical suffix resolves through the actual public resolver', async () => {
 const db = {collection:(name:string)=>{
  const query = {where:()=>query,get:async()=>({docs:name==='jobs'?[{id:'new',data:()=>canonicalFixture}]:[]})};
  return query;
 }};
 const resolved = resolveAliasRecord('old', aliasFixture, canonicalFixture, null);
 assert.ok(resolved);
 const target = await findPublicJobDocument(db as unknown as Firestore, resolved.destination.slice('/jobs/'.length));
 assert.equal(target?.id, 'new', `Unresolvable alias destination: ${resolved.destination}`);
 assert.equal(resolved.destination, '/jobs/role--new');
});
test('alias fails closed when canonical orgId drifts despite the approved employerId', () => {
 assert.ok(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,orgId:canonicalFixture.employerId}, null));
 assert.equal(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,orgId:'foreign'}, null), null);
});

test('alias shares strict source-field identity and bounded canonical routes', () => {
 const fields = ['externalUrl','externalApplyUrl','applicationUrl','applyUrl','sourceUrl'];
 for (const field of fields) {
  assert.equal(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,[field]:canonicalFixture.externalUrl}, null)?.destination, '/jobs/role--new');
  for (const value of ['https://example.com', canonicalFixture.externalUrl.replace('jobId=R','jobId=OTHER'), 42]) {
   assert.equal(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,[field]:value}, null), null, field);
  }
 }
 for (const slug of ['x'.repeat(196), '../role', 'role?query', '']) {
  assert.equal(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,slug}, null), null);
 }
 assert.ok(resolveAliasRecord('old', aliasFixture, {...canonicalFixture,slug:'x'.repeat(195)}, null));
});

test('alias requires active same-source canonical and never chains', () => {
 const a={schemaVersion:1,active:true,kind:'duplicate',originalId:'old',canonicalId:'new',sourceKey:'adp:11111111-1111-1111-1111-111111111111:R',auditId:'audit',slugs:['old-role'],redirectStatus:307};
 const j={active:true,slug:'new-role',employerId:'tsRvNLiRWARbOoiBOiEVFDwFfZn2',externalUrl:'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=11111111-1111-1111-1111-111111111111&jobId=R'};
 assert.equal(resolveAliasRecord('old',a,j,null)?.destination,'/jobs/new-role--new');
 for(const bad of [null,{...j,active:false},{...j,externalUrl:'https://example.com'}]) assert.equal(resolveAliasRecord('old',a,bad,null),null);
 assert.equal(resolveAliasRecord('old',a,j,{active:false}),null);
 assert.equal(resolveAliasRecord('old',{...a,schemaVersion:2},j,null),null);
});
import { cleanupWriteAllowed } from '../src/lib/server/job-cleanup-guards.ts';
test('active and unknown exact guards fail closed', async () => {
 for (const guard of [{schemaVersion:1,active:true},{schemaVersion:2,active:false},{}]) {
  const db={collection:(name:string)=>({doc:(id:string)=>({path:`${name}/${id}`})})};
  const tx={get:async(ref:{path:string})=>({exists:ref.path==='jobCleanupGuards/old',data:()=>guard})};
  assert.equal(await cleanupWriteAllowed(db as unknown as Firestore,tx as unknown as Transaction,'old',{},{}),false);
 }
});
