import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
test('submission rejects missing required documents and expired or external jobs', async()=>{
 const url=new URL('../src/lib/application-validation.ts',import.meta.url);
 assert.ok(existsSync(url),'submission validator is missing');
 const {validateApplicationSubmission: validate}=await import(url.href);
 const now=new Date('2026-09-08T12:00:00Z');
 const job={type:'job',status:'active',orgId:'org'};
 assert.equal(validate({...job,requiresResume:true},{resumeType:'profile',profileSnapshot:{}},now),'A resume file is required.');
 assert.equal(validate({...job,requiresCoverLetter:true},{coverLetter:'   '},now),'A cover letter is required.');
 assert.equal(validate({...job,requiresReferences:true},{references:' '},now),'References are required.');
 assert.equal(validate({...job,closingDate:'2026-09-07'},{},now),'This job is no longer accepting applications.');
 assert.equal(validate({...job,status:'closed'},{},now),'This job is no longer accepting applications.');
 assert.equal(validate({...job,applicationUrl:'https://example.com'},{},now),'Apply using the employer’s application destination.');
 assert.equal(validate({...job,requiresResume:true,requiresCoverLetter:true,requiresReferences:true},{resumeUrl:'https://example.com/resume',coverLetter:'Letter',references:'Reference contact'},now),null);
});
