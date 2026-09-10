/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as delivery from '../src/lib/application-notification-delivery.ts';
test('notification retries require a persisted owned application and skip sent or leased work',async()=>{
 assert.equal(typeof delivery.claimApplicationNotification,'function');
 const claim=delivery.claimApplicationNotification;
 let data:any=null;let writes=0;
 const db:any={runTransaction:async(fn:(transaction:any)=>Promise<any>)=>fn({get:async()=>({exists:!!data,data:()=>data}),update:(_:any,patch:any)=>{writes++;data.delivery={...data.delivery,employerNotificationLeaseUntil:patch['delivery.employerNotificationLeaseUntil']};}})};
 await assert.rejects(claim(db,{},'u',1000),/Application not found/);
 data={userId:'other'};await assert.rejects(claim(db,{},'u',1000),/ownership/);
 data={userId:'u',orgId:'real',postTitle:'Role',delivery:{employerNotificationStatus:'sent'}};
 assert.equal((await claim(db,{},'u',1000)).state,'sent');assert.equal(writes,0);
 data.delivery={};assert.equal((await claim(db,{},'u',1000)).state,'claimed');
 assert.equal((await claim(db,{},'u',1001)).state,'busy');assert.equal(writes,1);
 assert.equal((await claim(db,{},'u',200000)).state,'claimed');
});
