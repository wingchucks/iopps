import test from 'node:test';
import assert from 'node:assert/strict';
import { accountDestination } from '../src/lib/sign-in-destination.ts';
import { updateApplicationBatch } from '../src/lib/employer-application-updates.ts';

test('existing organizations resolve before missing community profiles', () => {
  assert.equal(accountDestination({hasMemberProfile:false,organization:{authorized:true,profileReady:true}}),'/org/dashboard');
  assert.equal(accountDestination({hasMemberProfile:true,organization:{authorized:true,profileReady:true}}),'/org/dashboard');
  assert.equal(accountDestination({hasMemberProfile:false}),'/setup');
  assert.equal(accountDestination({hasMemberProfile:true}),'/feed');
});
test('organization readiness routes to completion, while school and admin routing stays intact', () => {
  const next=accountDestination({hasMemberProfile:false,organization:{authorized:true,profileReady:false,missingProfileFields:['name',null,'contactEmail']}});
  const query=new URL(next,'https://iopps.ca').searchParams;
  assert.equal(query.get('required'),'name,contactEmail');
  assert.equal(accountDestination({hasMemberProfile:false,organization:{authorized:true,organizationType:'school',profileReady:false}}),'/org/dashboard');
  assert.equal(accountDestination({admin:true,hasMemberProfile:false}),'/admin');
});
test('partial applicant updates report saved and failed IDs without losing completed changes', async () => {
  const result=await updateApplicationBatch(['a','b','c'],async id=>{if(id==='b')throw new Error('offline');});
  assert.deepEqual(result,{saved:['a','c'],failed:['b']});
  assert.deepEqual(await updateApplicationBatch(result.failed,async()=>{}),{saved:['b'],failed:[]});
});
