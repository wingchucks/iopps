import test from 'node:test';
import assert from 'node:assert/strict';

test('application mail handles provider rejection, missing acceptance, and accepted messages', async () => {
 const originalFetch=globalThis.fetch;
 const originalKey=process.env.RESEND_API_KEY;
 process.env.RESEND_API_KEY='re_local_test_only';
 const sent=[], headers=[];
 let responseBody={name:'validation_error',message:'Recipient rejected'};
 let responseStatus=422;
 globalThis.fetch=async (_url, options)=>{sent.push(JSON.parse(options.body));headers.push(new Headers(options.headers));return new Response(JSON.stringify(responseBody),{status:responseStatus,headers:{'Content-Type':'application/json'}});};
 try {
  const {sendApplicationNotification,sendMessageNotification}=await import('../src/lib/email.ts');
  const fixture={employerEmail:'test@example.test',employerName:'Preview Employer',applicantName:'<b>Preview Candidate</b>',jobTitle:'Local test',jobId:'local',orgId:'local'};
  const rejected=await sendApplicationNotification(fixture);
  assert.equal(rejected.success,false);assert.match(rejected.error,/Recipient rejected/);
  responseStatus=200;responseBody={};
  assert.equal((await sendApplicationNotification(fixture)).success,false);
  responseBody={id:'local-accepted-message'};
  assert.equal((await sendApplicationNotification(fixture)).success,true);
  assert.match(sent[2].html,/&lt;b&gt;Preview Candidate&lt;\/b&gt;/);
  assert.equal(sent.length,3);
  const payload={to:'verified@example.test',subject:'New message',html:'No private message body'};
  assert.equal((await sendMessageNotification(payload,'message-local-idempotent')).id,'local-accepted-message');
  assert.equal(headers[3].get('Idempotency-Key'),'message-local-idempotent');
  assert.equal(sent[3].from,'IOPPS <notifications@iopps.ca>');
  responseStatus=422;responseBody={name:'validation_error',message:'Message recipient rejected'};
  await assert.rejects(sendMessageNotification(payload,'message-local-idempotent'),/Message recipient rejected/);
  responseStatus=200;responseBody={};
  await assert.rejects(sendMessageNotification(payload,'message-local-idempotent'),/did not confirm acceptance/);
 } finally {
  globalThis.fetch=originalFetch;
  if(originalKey===undefined) delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=originalKey;
 }
});
