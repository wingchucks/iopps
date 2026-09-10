import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeApp as initializeAdmin, deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getFirestore as getAdminDb} from 'firebase-admin/firestore';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,terminate} from 'firebase/firestore';
import {submitApplication} from '../src/lib/server/application-submission.ts';

test('emulator: server requirements, racing retries, direct create/delete and employer tampering', {skip:process.env.IOPPS_TEST_EMULATORS !== 'true'}, async()=>{
 // Separate demo namespace; no project environment/default credentials or production writes.
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
 const projectId='demo-iopps-applications';
 const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
 const ruleResponse=await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:rules}]}})});
 assert.equal(ruleResponse.status,200,await ruleResponse.text());
 const admin=initializeAdmin({projectId},'application-boundary');
 const server=getAdminDb(admin);
 const client=initializeApp({projectId,apiKey:'demo-key'},'application-boundary');
 const auth=getAuth(client);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const db=getFirestore(client);connectFirestoreEmulator(db,'127.0.0.1',8080);
 const uid=(await signInAnonymously(auth)).user.uid;
 try {
  await assert.rejects(setDoc(doc(db,'members',uid),{role:'admin',orgId:'test-org',orgRole:'owner'}),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(db,'users',uid),{role:'admin',orgId:'test-org',employerId:'test-org'}),e=>e.code==='permission-denied');
  await setDoc(doc(db,'members',uid),{role:'community',displayName:'Fictional applicant'});
  await assert.rejects(updateDoc(doc(db,'members',uid),{orgId:'test-org',orgRole:'owner'}),e=>e.code==='permission-denied');
  await server.doc(`members/${uid}`).set({orgId:'',orgRole:'owner'});
  await server.doc(`applications/orphan-${uid}`).set({userId:'another-applicant',orgId:'',employerId:'',status:'submitted'});
  await assert.rejects(getDoc(doc(db,'applications',`orphan-${uid}`)),e=>e.code==='permission-denied');
  await assert.rejects(updateDoc(doc(db,'applications',`orphan-${uid}`),{status:'reviewing'}),e=>e.code==='permission-denied');
  await server.doc(`members/${uid}`).set({role:'community'});
  await server.doc(`members/${uid}`).set({role:'community',orgId:'',orgRole:'owner'});
  await server.doc('applications/qa-unlinked').set({userId:'someone-else',orgId:'',employerId:'',status:'submitted'});
  await assert.rejects(getDoc(doc(db,'applications','qa-unlinked')),e=>e.code==='permission-denied');
  await assert.rejects(updateDoc(doc(db,'applications','qa-unlinked'),{status:'reviewing'}),e=>e.code==='permission-denied');
  for (const collection of ['jobs','posts','scholarships']) {
   await assert.rejects(setDoc(doc(db,collection,`empty-${uid}`),{orgId:'',title:'Denied',type:'job',status:'active'}),e=>e.code==='permission-denied');
  }
  await server.doc('posts/enforced-role').set({type:'job',title:'Fictional role',orgId:'test-org',status:'active',requiresCoverLetter:true,requiresReferences:true});
  await assert.rejects(submitApplication(server,uid,{postId:'enforced-role'}),/cover letter/);
  await assert.rejects(submitApplication(server,uid,{postId:'enforced-role',coverLetter:'Letter'}),/References/);
  const input={postId:'enforced-role',coverLetter:'Original letter',references:'Fictional reference'};
  const results=await Promise.all([submitApplication(server,uid,input),submitApplication(server,uid,input)]);
  assert.equal(results.filter(result=>result.created).length,1);
  const ref=doc(db,'applications',`${uid}_enforced-role`);
  await assert.rejects(setDoc(doc(db,'applications',`${uid}_bypass`),{userId:uid,postId:'bypass',jobId:'bypass',orgId:'test-org',employerId:'test-org',postTitle:'Forged',status:'submitted',appliedAt:new Date()}),e=>e.code==='permission-denied');
  await assert.rejects(deleteDoc(ref),e=>e.code==='permission-denied');
  await server.doc(`members/${uid}`).set({orgId:'test-org',orgRole:'owner'});
  await assert.rejects(updateDoc(ref,{coverLetter:'Employer modified candidate letter'}),e=>e.code==='permission-denied');
  await updateDoc(ref,{status:'reviewing'});
  const repeat=await submitApplication(server,uid,{...input,coverLetter:'Overwrite'});
  assert.equal(repeat.application.status,'reviewing');
  assert.equal(repeat.application.coverLetter,'Original letter');
  await server.doc('posts/enforced-role').update({status:'closed'});
  await assert.rejects(submitApplication(server,'different-candidate',input),/no longer accepting/);
 } finally {
  await server.doc(`applications/${uid}_enforced-role`).delete();
  await server.doc(`applications/orphan-${uid}`).delete();
  await server.doc(`members/${uid}`).delete();
  await server.doc('posts/enforced-role').delete();
  await server.doc('applications/qa-unlinked').delete();
  await terminate(db);await deleteApp(client);await deleteAdmin(admin);
 }
});
