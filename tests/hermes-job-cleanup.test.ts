import test from 'node:test';
import assert from 'node:assert/strict';
import {createJobCleanup, CLEANUP, type CleanupPort, type CleanupDoc} from '../src/lib/server/hermes-job-cleanup.ts';
const url=(n:number)=>`https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=12345678-1234-1234-1234-123456789abc&jobId=${n}`;
export function fixture(){
 let seq=0; const docs=new Map<string,CleanupDoc>(); const put=(path:string,data:Record<string,unknown>)=>docs.set(path,{path,version:String(++seq),data});
 CLEANUP.pairs.forEach(([a,b],i)=>{for(const [id,employerId] of [[a,CLEANUP.oldEmployer],[b,CLEANUP.newEmployer]]) put('jobs/'+id,{employerId,externalUrl:url(i),active:true,status:'active',slug:'job-'+id.toLowerCase(),description:'preserve',createdAt:new Date(0)});});
 CLEANUP.stale.forEach((id,i)=>put('jobs/'+id,{employerId:CLEANUP.newEmployer,externalUrl:url(i+20),active:true,status:'active',slug:'stale-'+id.toLowerCase()}));
 put('employers/'+CLEANUP.oldEmployer,{name:'old'});put('employers/'+CLEANUP.newEmployer,{name:'new'});
 put('applications/private',{jobId:CLEANUP.pairs[0][0],employerId:CLEANUP.oldEmployer,archive:{resume:'private'}});
 const state={drop:'',saturate:false};
 const read=async(path:string)=>docs.get(path)??null;
 const query=async(c:string,f:string,v:string,limit:number)=>state.saturate?Array.from({length:limit},(_,i)=>({path:c+'/'+i,version:'1',data:{[f]:v}})):[...docs.values()].filter(d=>d.path.startsWith(c+'/')&&d.data[f]===v).slice(0,limit);
 const port:CleanupPort={read,query,async transaction(fn){const writes:Array<{path:string;data:Record<string,unknown>}>=[];const result=await fn({read,query,create(path,data){assert.ok(!docs.has(path));writes.push({path,data});},replace(path,data){writes.push({path,data});}});const version=String(++seq);for(const w of writes)if(w.path!==state.drop)docs.set(w.path,{...w,version});return result;}};
 let clock=1_000_000;
 const provider=async(sourceKey:string)=>({provider:'adp' as const,sourceKey,checkedAt:clock,status:sourceKey.endsWith(':20')||sourceKey.endsWith(':21')||sourceKey.endsWith(':22')||sourceKey.endsWith(':23')?'closed' as const:'active' as const,evidenceDigest:'a'.repeat(64)});
 const service=createJobCleanup(port,{secret:'s'.repeat(32),now:()=>clock,provider});
 const execution={keyId:'cleanup',idempotencyKey:'one',requestHash:'a'.repeat(64)};
 return {docs,put,port,state,service,execution,advance(){clock+=120001;}};
}
test('exact 7+4 manifest; apply and rollback preserve whole preimages and applications',async()=>{
 const f=fixture(); const original=new Map(f.docs);const review=await f.service.review({manifestId:CLEANUP.id},'cleanup');
 assert.equal(review.duplicates,7);assert.equal(review.stale,4);
 assert.equal(review.manifestId,CLEANUP.id);assert.equal(review.targets.length,11);assert.equal(review.targets[0].originalId,CLEANUP.pairs[0][0]);assert.equal(review.targets[0].canonicalId,CLEANUP.pairs[0][1]);assert.equal(JSON.stringify(review).includes('private'),false);
 assert.ok(review.documents.some(d=>d.path==='posts/'+CLEANUP.pairs[0][0]&&d.exists===false));
 const result=await f.service.apply({reviewId:review.reviewId,reviewToken:review.reviewToken,confirmation:review.confirmation},f.execution);
 assert.equal(result.verified,true);
 for(const [old,canonical] of CLEANUP.pairs){assert.equal(f.docs.get('jobs/'+old)!.data.duplicateOf,canonical);assert.equal(f.docs.get('jobAliases/'+old)!.data.redirectStatus,307);assert.equal(f.docs.get('jobCleanupGuards/'+old)!.data.active,true);}
 assert.deepEqual(f.docs.get('applications/private'),original.get('applications/private'));
 const rr=await f.service.rollbackReview({auditId:result.auditId},'cleanup');
 await f.service.rollback({reviewId:rr.reviewId,reviewToken:rr.reviewToken,confirmation:rr.confirmation},{...f.execution,idempotencyKey:'undo',requestHash:'b'.repeat(64)});
 for(const [path,doc] of original) assert.deepEqual(f.docs.get(path)!.data,doc.data);
 assert.equal('duplicateOf' in f.docs.get('jobs/'+CLEANUP.pairs[0][0])!.data,false);
});
