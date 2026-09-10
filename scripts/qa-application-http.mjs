import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initializeApp as initializeAdmin,deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage as getAdminStorage} from 'firebase-admin/storage';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getStorage,connectStorageEmulator,ref,uploadBytes,getDownloadURL,deleteObject} from 'firebase/storage';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3100';assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199';
const projectId='demo-iopps-preview',bucketName=projectId+'.appspot.com';
const admin=initializeAdmin({projectId},'http-qa'),db=getFirestore(admin);
const app=initializeApp({projectId,apiKey:'demo-test-key',storageBucket:bucketName},'http-qa');
const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9199);
const user=(await signInAnonymously(auth)).user,token=await user.getIdToken();
const postId='qa-http-'+user.uid;let archivePath='';
const request=async(path,body,authorized=true)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
const checks=[];
try {
 await db.doc(`users/${user.uid}`).set({role:'community'});await db.doc(`members/${user.uid}`).set({role:'community',displayName:'Fictional QA'});
 await db.doc(`posts/${postId}`).set({type:'job',title:'Fictional HTTP QA role',orgId:'qa-employer',status:'active',requiresResume:true,requiresCoverLetter:true,requiresReferences:true});
 assert.equal((await request('/api/applications',{postId},false)).status,401);checks.push('unauthenticated application denied');
 assert.equal((await request('/api/applications',{postId})).status,422);checks.push('authoritative requirements enforced');
 const object=ref(storage,`resumes/${user.uid}/qa.pdf`);await uploadBytes(object,new TextEncoder().encode('fictional-original'),{contentType:'application/pdf'});
 const input={postId,resumeUrl:await getDownloadURL(object),resumeFileName:'qa.pdf',coverLetter:'Fictional letter',references:'Fictional reference'};
 const response=await request('/api/applications',input);const result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
 assert.equal(result.created,true);assert.match(result.application.resumeUrl,/application-documents/);archivePath=decodeURIComponent(new URL(result.application.resumeUrl).pathname.split('/o/')[1]);checks.push('HTTP receipt stores server archive');
 await deleteObject(object);assert.equal(await (await fetch(result.application.resumeUrl)).text(),'fictional-original');checks.push('archive bytes survive source deletion');
 const repeat=await request('/api/applications',{postId,resumeUrl:'https://attacker.example/forged',coverLetter:'Replacement'});assert.equal(repeat.status,200);const repeated=await repeat.json();assert.equal(repeated.created,false);assert.equal(repeated.application.resumeUrl,result.application.resumeUrl);checks.push('repeat preserves original archive');
 const receipt=await fetch(`${base}/api/applications?postId=${postId}`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(receipt.status,200);assert.equal((await receipt.json()).application.resumeUrl,result.application.resumeUrl);checks.push('authenticated receipt readback');
 assert.equal((await request('/api/stripe/checkout',{planId:'tier1'},false)).status,401);assert.equal((await request('/api/stripe/checkout',{planId:'tier1',orgId:'qa-victim'})).status,403);checks.push('checkout auth and organization denial without payments');
 const output={base,projectId,checks,count:checks.length};await fs.writeFile(process.env.QA_OUTPUT||'test-results/application-http.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
} finally {
 for(const p of [`applications/${user.uid}_${postId}`,`posts/${postId}`,`users/${user.uid}`,`members/${user.uid}`])await db.doc(p).delete();
 if(archivePath)await getAdminStorage(admin).bucket(bucketName).file(archivePath).delete({ignoreNotFound:true});
 await deleteApp(app);await deleteAdmin(admin);
}
