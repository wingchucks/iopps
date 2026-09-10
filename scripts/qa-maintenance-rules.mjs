import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,deleteDoc,terminate} from 'firebase/firestore';
import {getStorage,connectStorageEmulator,ref,uploadBytes} from 'firebase/storage';

test('maintenance artifacts deny old-client database reads/writes and resume uploads',async()=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-launch-freeze');
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8180');
 assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9299');
 for(const file of ['operations/maintenance/firestore.rules','operations/maintenance/storage.rules']) assert.match(fs.readFileSync(file,'utf8'),/allow read, write: if false/);
 const app=initializeApp({projectId:'demo-iopps-launch-freeze',apiKey:'fictional-launch-freeze',storageBucket:'demo-iopps-launch-freeze.appspot.com'},'maintenance-rules');
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9299',{disableWarnings:true});
 const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8180);
 const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9399);
 try {
  const {user}=await signInAnonymously(auth);
  for(const collection of ['users','employers','organizations','jobs','posts','subscriptions','applications']) {
   const target=doc(db,collection,user.uid);
   await assert.rejects(setDoc(target,{userId:user.uid,uid:user.uid,status:'submitted'}),e=>e.code==='permission-denied');
   await assert.rejects(getDoc(target),e=>e.code==='permission-denied');
   await assert.rejects(deleteDoc(target),e=>e.code==='permission-denied');
  }
  await assert.rejects(uploadBytes(ref(storage,`resumes/${user.uid}/freeze.pdf`),new TextEncoder().encode('%PDF fictional'),{contentType:'application/pdf'}),e=>e.code==='storage/unauthorized');
 }finally{await terminate(db);await deleteApp(app);}
});
