import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createImportedJobOnce, feedImportIdentity } from '../src/lib/server/feed-import-identity.ts';
import { updateImportedJobWithEditorialGuard } from '../src/lib/server/job-cleanup-guards.ts';
import { readJobAliases, readJobAliasRedirect } from '../src/lib/server/job-aliases.ts';
import { cleanupSourceDocId } from '../src/lib/server/job-cleanup-contract.ts';
test('demo cleanup: source lane suppression, concurrent imports, exact aliases and rollback visibility', {skip:process.env.IOPPS_TEST_EMULATORS!=='true'},async()=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
 const app=initializeApp({projectId:'demo-iopps-preview'},'cleanup-runtime-'+crypto.randomUUID());const db=getFirestore(app);
 const suffix=crypto.randomUUID(),old='old-'+suffix,canonical='new-'+suffix;
 const key='adp:11111111-1111-1111-1111-111111111111:'+suffix;
 const externalUrl='https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=11111111-1111-1111-1111-111111111111&jobId='+suffix;
 const base={feedId:'fixture-'+suffix,employerId:'blocked',title:'Fixture',location:'Fixture',externalId:suffix,externalUrl,active:true};
 const unblocked={...base,employerId:'other'};
 const refs=[db.doc('jobs/'+old),db.doc('jobs/'+canonical),db.doc('jobAliases/'+old),db.doc('jobCleanupGuards/'+old),db.doc('jobCleanupSources/'+cleanupSourceDocId(key)),... [base,unblocked].flatMap(d=>[db.doc('jobs/import-'+feedImportIdentity(d)),db.doc('feedImportIdentities/'+feedImportIdentity(d))])];
 try {
  await refs[0].set({...base,active:false,status:'deleted'});
  await refs[1].set({...base,employerId:'tsRvNLiRWARbOoiBOiEVFDwFfZn2',slug:'canonical-'+suffix});
  await refs[2].set({schemaVersion:1,active:true,kind:'duplicate',originalId:old,canonicalId:canonical,sourceKey:key,auditId:'fixture',slugs:['historic-'+suffix],redirectStatus:307});
  await refs[3].set({schemaVersion:1,active:true,kind:'duplicate',originalId:old,canonicalId:canonical,sourceKey:key,auditId:'fixture'});
  await refs[4].set({schemaVersion:1,active:true,sourceKey:key,canonicalId:canonical,blockedEmployerIds:['blocked'],auditId:'fixture'});
  assert.equal(await createImportedJobOnce(db,base),false);
  const results=await Promise.all([createImportedJobOnce(db,unblocked),createImportedJobOnce(db,unblocked)]);assert.equal(results.filter(Boolean).length,1);
  await updateImportedJobWithEditorialGuard(db,refs[0],{active:true,title:'Changed'},text=>text);
  assert.equal((await refs[0].get()).get('active'),false);
  assert.equal((await readJobAliases(db,[canonical])).length,1);
  assert.equal(await readJobAliasRedirect(db,'historic-'+suffix),'/jobs/canonical-'+suffix+'--'+canonical);
  await refs[2].update({active:false});
  assert.equal(await readJobAliasRedirect(db,'historic-'+suffix),null);
 } finally {for(const ref of refs)await ref.delete();for(const ref of refs)assert.equal((await ref.get()).exists,false);await deleteApp(app);}
});
