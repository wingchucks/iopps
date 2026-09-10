import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
test('receipt derives documents, employer and time only from persisted application',async()=>{
 const url=new URL('../src/lib/application-receipt.ts',import.meta.url);
 assert.ok(existsSync(url),'receipt helper missing');
 const receiptModule=await import(url.href);
 assert.equal(typeof receiptModule.applicationReceiptRecord,'function');
 const projected=receiptModule.applicationReceiptRecord({id:'id',postTitle:'Role',reviewerNote:'private',delivery:{employerNotificationStatus:'sent',employerEmailTarget:'private@example.test'}});
 assert.equal('reviewerNote' in projected,false);
 assert.deepEqual(projected.delivery,{employerNotificationStatus:'sent'});
 const {buildApplicationReceipt: receipt}=receiptModule;
 assert.deepEqual(receipt({id:'u_role',postId:'role',postTitle:'Role',orgName:'Employer',appliedAt:{seconds:100},resumeFileName:'resume.pdf',resumeUrl:'https://example.com',coverLetter:'Letter',references:'Contact'}),{id:'u_role',postId:'role',title:'Role',employer:'Employer',submittedAt:'1970-01-01T00:01:40.000Z',documents:['resume.pdf','Cover letter','References']});
 assert.deepEqual(receipt({}).documents,[]);
});
