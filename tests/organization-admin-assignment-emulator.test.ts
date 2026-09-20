import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from '../src/lib/organization-profile.ts';
import { requireEmployerContext } from '../src/lib/server/employer-auth.ts';
import { createAssignmentStore } from '../src/lib/server/organization-admin-assignment-firestore.ts';
import { reviewAssignment, applyAssignment } from '../src/lib/server/organization-admin-assignment.ts';
const enabled = process.env.IOPPS_TEST_EMULATORS === 'true';
test('actual adapter: review, concurrent retries, preserved team/ownership, independent readback, duplicate identity and stale mirror', {skip:!enabled}, async t => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  const id = 'demo-batc-' + Date.now(); const app = initializeApp({projectId:id},id); const db = getFirestore(app);
  t.after(async () => {await db.terminate(); await deleteApp(app);});
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
  const auth = getAuth(app);
  await auth.createUser({uid:'pete',email:'Pete.Rojaiye@batc.ca',emailVerified:true,password:'LocalFixture123!'});
  await auth.setCustomUserClaims('pete',{role:'community'});
  const desired = {orgId:'batc',email:'Pete.Rojaiye@batc.ca',role:'admin' as const,enable:true};
  const options = {actor:'superadmin',secret:'s'.repeat(32)};
  await db.doc('users/pete').set({email:desired.email,role:'community'});
  await db.doc('members/existing').set({orgId:'batc',orgRole:'admin',role:'community'});
  await db.doc('employers/batc').set({ownerId:'original',disabled:true,status:'disabled',plan:'free',jobCredits:0});
  await db.doc('organizations/batc').set({uid:'original',disabled:true,status:'disabled',onboardingComplete:true,logo:'/fixture.png',description:'Fixture',contactEmail:'fixture@example.test'});
  const store = createAssignmentStore(db,auth,desired);
  await assert.rejects(reviewAssignment({...desired,enable:false},store,options),/Explicit enable/);
  assert.equal((await db.doc('members/pete').get()).exists,false);
  const r = await reviewAssignment(desired,store,options);
  assert.equal((await db.doc('members/pete').get()).exists,false);
  const request = {...desired,token:r.token,confirmation:r.confirmation};
  const results = await Promise.all([applyAssignment(request,store,options),applyAssignment(request,store,options)]);
  assert.equal(results.every(r=>r.verified),true);
  for(const collection of ['employers','organizations']) {
    const data=(await db.doc(collection+'/batc').get()).data()!;
    assert.equal(data.disabled,false);assert.equal(data.publicVisibility,'hidden');
    assert.equal(isOrganizationPubliclyVisible(normalizeOrganizationRecord(data)),false);
  }
  assert.equal(results.filter(r=>r.replayed).length,1);
  assert.equal((await db.doc('employers/batc').get()).data()?.ownerId,'original');
  assert.equal((await db.doc('employers/batc').get()).data()?.jobCredits,0);
  assert.equal((await db.doc('members/existing').get()).data()?.orgRole,'admin');
  assert.equal((await db.doc('members/pete').get()).data()?.role,undefined);
  const context = await requireEmployerContext(new Request('http://localhost',{headers:{Authorization:'Bearer local-fixture'}}),{
    adminDb:db,adminAuth:{getUser:uid=>auth.getUser(uid),verifyIdToken:async()=>({uid:'pete',email:desired.email,email_verified:true,role:'community'} as never)},
    accountAccessDeps:{auth,db},
  });
  assert.equal(context.orgId,'batc');assert.equal(context.employerId,'batc');assert.equal(context.orgRole,'admin');
  assert.deepEqual((await auth.getUser('pete')).customClaims,{role:'community'});
  assert.equal((await db.collection('organizationAdminAssignments').get()).size,1);
  const audit = (await db.collection('organizationAdminAssignments').get()).docs[0].data();
  assert.equal(JSON.stringify(audit).includes(desired.email),false);
  const r2 = await reviewAssignment(desired,store,options);
  await db.doc('organizations/batc').update({uid:'changed-owner'});
  await assert.rejects(applyAssignment({...desired,token:r2.token,confirmation:r2.confirmation},store,options),/stale/);
  await assert.rejects(applyAssignment(request,store,options),/drift/);
  await db.doc('users/duplicate').set({email:'PETE.ROJAIYE@BATC.CA'});
  await assert.rejects(reviewAssignment(desired,store,options),/Ambiguous/);
  await db.doc('users/duplicate').delete();
  await db.doc('organizations/other').set({employerId:'batc'});
  await assert.rejects(reviewAssignment(desired,store,options),/Ambiguous/);
  // Current rules contract: exact org access and private email templates are
  // allowed. Public profile edits use the reviewed API; no direct publication,
  // platform admin, billing, membership rewrites or assignment receipt writes.
  const rulesResponse=await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${id}:securityRules`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:readFileSync('firestore.rules','utf8')}]}})});
  assert.equal(rulesResponse.status,200);
  const clientAppSdk=await import('firebase/app');const clientAuthSdk=await import('firebase/auth');const clientDbSdk=await import('firebase/firestore');
  const client=clientAppSdk.initializeApp({projectId:id,apiKey:'local-demo-key'},id);const clientAuth=clientAuthSdk.getAuth(client);const clientDb=clientDbSdk.getFirestore(client);
  clientAuthSdk.connectAuthEmulator(clientAuth,'http://127.0.0.1:9099',{disableWarnings:true});clientDbSdk.connectFirestoreEmulator(clientDb,'127.0.0.1',8080);
  t.after(async()=>{await clientDbSdk.terminate(clientDb);await clientAppSdk.deleteApp(client);});
  // Emulator sign-in endpoints use its default demo project; an emulator-only
  // custom token supplies the exact fixture UID without relying on API-key routing.
  await clientAuthSdk.signInWithCustomToken(clientAuth,await auth.createCustomToken('pete'));
  assert.equal((await clientDbSdk.getDoc(clientDbSdk.doc(clientDb,'organizations/batc'))).exists(),true);
  await clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'organizations/batc'),{emailTemplates:{welcome:'Organization administrator template'}});
  assert.equal((await db.doc('organizations/batc').get()).data()?.emailTemplates.welcome,'Organization administrator template');
  const denied=(error:unknown)=>(error as {code?:string}).code==='permission-denied';
  await assert.rejects(clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'organizations/batc'),{description:'Bypass the reviewed profile API'}),denied);
  await assert.rejects(clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'organizations/other'),{description:'not allowed'}),denied);
  await assert.rejects(clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'organizations/batc'),{plan:'premium'}),denied);
  await assert.rejects(clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'users/pete'),{role:'admin'}),denied);
  await assert.rejects(clientDbSdk.updateDoc(clientDbSdk.doc(clientDb,'members/pete'),{orgRole:'owner'}),denied);
  await assert.rejects(clientDbSdk.setDoc(clientDbSdk.doc(clientDb,'jobs/unapproved'),{orgId:'batc',active:true}),denied);
  await assert.rejects(clientDbSdk.setDoc(clientDbSdk.doc(clientDb,'organizationAdminAssignments/forged'),{role:'admin'}),denied);
});
