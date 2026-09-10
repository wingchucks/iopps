/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveApplicationResume } from '../src/lib/server/application-document-archive.ts';
test('archives a pinned owned generation with a fresh private token, never an editable source URL',async()=>{
 const calls:any[]=[];
 const bucket:any={name:'demo.test',file:(path:string,options?:unknown)=>{
  calls.push({path,options});return {name:path,getMetadata:async()=>[{size:'4',contentType:'application/pdf',generation:'7'}],copy:async(dest:any,opts:any)=>{calls.push({copy:dest.name,opts})}};
 }};
 const original='https://firebasestorage.googleapis.com/v0/b/demo.test/o/resumes%2Fowner%2Fcv.pdf?alt=media&token=original';
 const result=await archiveApplicationResume(bucket,original,'owner');
 assert.match(result,/application-documents%2Fowner%2F/);assert.doesNotMatch(result,/token=original/);
 assert.ok(calls.some(c=>c.options?.generation==='7'));
 const copy=calls.find(c=>c.copy);assert.equal(copy.opts.preconditionOpts.ifGenerationMatch,0);
 assert.ok(copy.opts.metadata.firebaseStorageDownloadTokens);
 await assert.rejects(archiveApplicationResume(bucket,original,'other'),/ownership/);
});
