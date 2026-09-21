import test from 'node:test';import assert from 'node:assert/strict';
import {Timestamp,GeoPoint,type Firestore} from 'firebase-admin/firestore';
import {createNativeJobCleanupPort} from '../src/lib/server/hermes-job-cleanup-firestore.ts';
import {cleanupDigest,CLEANUP} from '../src/lib/server/hermes-job-cleanup.ts';
type MockRef = {path:string};
type MockSnapshot = {exists:boolean;ref:MockRef;updateTime:Timestamp;data:()=>Record<string,unknown>};
interface MockTransaction {
 get(ref:MockRef):Promise<MockSnapshot>;
 set(ref:MockRef,value:Record<string,unknown>):number;
 create(ref:MockRef,value:Record<string,unknown>):number;
}
test('native adapter preserves SDK values, updateTime nanos and exact set replacement; rejects arbitrary write and read-after-write',async()=>{
 const data={stamp:new Timestamp(100,123),point:new GeoPoint(1,2),bytes:Buffer.from([1,2]),nested:{missing:null}};const writes:[MockRef,Record<string,unknown>][]=[];
 const db={doc:(path:string)=>({path}),collection:()=>{throw Error('not used');},getAll:async(ref:MockRef)=>[{exists:true,ref,updateTime:new Timestamp(200,456),data:()=>data}],runTransaction:async(fn:(tx:MockTransaction)=>Promise<unknown>)=>fn({get:async(ref:MockRef)=>({exists:true,ref,updateTime:new Timestamp(200,456),data:()=>data}),set:(ref:MockRef,value:Record<string,unknown>)=>writes.push([ref,value]),create:(ref:MockRef,value:Record<string,unknown>)=>writes.push([ref,value])})};
 const port=createNativeJobCleanupPort(db as unknown as Firestore);const doc=await port.read('jobs/'+CLEANUP.pairs[0][0]);assert.equal(doc!.version,'200:456');assert.equal(doc!.data.stamp,data.stamp);assert.notEqual(cleanupDigest(data),cleanupDigest({...data,stamp:{seconds:100,nanoseconds:123}}));
 await port.transaction(async tx=>{await tx.read('jobs/'+CLEANUP.pairs[0][0]);tx.replace('jobs/'+CLEANUP.pairs[0][0],data);await assert.rejects(tx.read('jobs/'+CLEANUP.pairs[0][0]),/reads before writes/);assert.throws(()=>tx.replace('applications/private',{}));});
 assert.equal(writes.length,1);assert.equal(writes[0][1],data);
});
