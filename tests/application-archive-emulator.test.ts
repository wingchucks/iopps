import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp as initializeAdmin,deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getStorage as getAdminStorage} from 'firebase-admin/storage';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getStorage,connectStorageEmulator,ref,uploadBytes,deleteObject,getDownloadURL} from 'firebase/storage';
import {archiveApplicationResume} from '../src/lib/server/application-document-archive.ts';

test('emulator: archived bytes survive owner source overwrite/delete; archive client writes are denied', {skip:process.env.IOPPS_TEST_EMULATORS!=='true'},async()=>{
 process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
 const projectId='demo-iopps-preview';const bucketName=projectId+'.appspot.com';
 const admin=initializeAdmin({projectId},'archive-test');const bucket=getAdminStorage(admin).bucket(bucketName);
 const app=initializeApp({projectId,apiKey:'demo-test-key',storageBucket:bucketName},'archive-test');
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9199);
 const uid=(await signInAnonymously(auth)).user.uid;const original=ref(storage,`resumes/${uid}/archive-test.pdf`);
 let archivedPath='';
 try {
  await uploadBytes(original,new TextEncoder().encode('original-fictional-resume'),{contentType:'application/pdf'});
  const archive=await archiveApplicationResume(bucket,await getDownloadURL(original),uid,'127.0.0.1:9199');
  archivedPath=decodeURIComponent(new URL(archive).pathname.split('/o/')[1]);
  assert.match(archivedPath,/^application-documents\//);
  assert.equal(await (await fetch(archive)).text(),'original-fictional-resume');
  await uploadBytes(original,new TextEncoder().encode('replacement'),{contentType:'application/pdf'});
  await deleteObject(original);
  assert.equal(await (await fetch(archive)).text(),'original-fictional-resume');
  await assert.rejects(uploadBytes(ref(storage,archivedPath),new Uint8Array([1]),{contentType:'application/pdf'}),e=>e.code==='storage/unauthorized');
  await assert.rejects(deleteObject(ref(storage,archivedPath)),e=>e.code==='storage/unauthorized');
  await assert.rejects(uploadBytes(ref(storage,`application-documents/${uid}/forged`),new Uint8Array([1]),{contentType:'application/pdf'}),e=>e.code==='storage/unauthorized');
 } finally {if(archivedPath)await bucket.file(archivedPath).delete({ignoreNotFound:true});await deleteApp(app);await deleteAdmin(admin)}
});
