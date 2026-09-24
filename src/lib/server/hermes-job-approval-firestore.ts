import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {HermesExecutionContext,HermesFirestorePort} from './hermes-firestore-adapter.ts';
import {HermesFirestoreConflictError} from './hermes-firestore-adapter.ts';
import type {HermesFeaturedJobIdentity,HermesJobApprovalDocument,HermesJobApprovalProjection,HermesJobApprovalServiceDeps} from './hermes-job-approval.ts';
import {resolveHermesPaidPublication,normalizePaidValue,type HermesPaidPublicationState} from './hermes-paid-publication';
import {PublicationError} from './paid-job-publication';
type Data=Record<string,unknown>;
const IDEMPOTENCY='hermesAdminIdempotency',AUDIT='hermesAdminAudit';
const hash=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
export function hermesJobApprovalIdempotencyDocumentId(execution:Pick<HermesExecutionContext,'keyId'|'idempotencyKey'>){return hash(`iopps-hermes-admin-idempotency-v1\0approve-job\0${execution.keyId}\0${execution.idempotencyKey}`);}
export function createHermesFeaturedIdentitySetBinding(identities:HermesFeaturedJobIdentity[]){
 if(identities.length>1000)throw new Error('Featured identity set exceeds the bounded query result');
 const sorted=identities.map(x=>[x.collection,x.documentId,x.version]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return {activeFeaturedJobsDigest:hash(`iopps-hermes-featured-identity-set-v1\0${JSON.stringify(sorted)}`),activeFeaturedJobsCount:sorted.length};
}
const JOB_FIELDS=['deletedAt','status','active','featured','postedAt','expiresAt','publication','listingDurationDays','featuredEntitlement','featuredCreditConsumed','featuredCreditConsumedAt','standardCreditConsumed','standardCreditConsumedAt','employerId','orgId','organizationId'];
const ACCOUNT_FIELDS=['standardPostCredits','featuredPostCredits','jobPostingUsage'];
type Expected=Record<string,{present:boolean;value:unknown}>;
function select(data:Data,fields:string[]):Expected{return Object.fromEntries(fields.map(k=>[k,{present:Object.hasOwn(data,k),value:Object.hasOwn(data,k)?normalizePaidValue(data[k]):null}]));}
function project(data:Data,state:HermesPaidPublicationState):HermesJobApprovalProjection {
 const pick=(...keys:string[])=>keys.map(k=>data[k]).find(v=>typeof v==='string'&&v.trim()) as string|undefined;
 return {title:pick('title')??'',organization:pick('orgName','organizationName','companyName','orgShort')??'',status:pick('status')??'',featuredIntent:data.featured?'featured':'standard',entitlementDecision:state.funding,funding:state.funding,durationDays:state.durationDays,expiresAt:state.expiresAt};
}
function assertExecution(e:HermesExecutionContext){if(!/^[A-Za-z0-9_-]{1,64}$/.test(e.keyId)||!/^[A-Za-z0-9._:-]{1,128}$/.test(e.idempotencyKey)||!/^[a-f0-9]{64}$/.test(e.requestHash))throw new Error('Invalid Hermes execution context');}
interface Verification {state:HermesPaidPublicationState;job:Expected;employer:Expected}
interface Receipt extends Data {operation:string;keyId:string;requestHash:string;target:{documentId:string;collection:'jobs'|'posts';schema:'employer-job-v1'|'legacy-job-post-v1'};resultStatus:'applied'|'verified_noop';committedAt:string;paidVerification:Verification}
export function createHermesJobApprovalFirestoreAdapter(port:HermesFirestorePort,options:{now?:()=>Date;timestampToken?:()=>unknown}={}){
 const now=options.now??(()=>new Date()),timestamp=options.timestampToken??now;
 async function verify(raw:Data,execution:HermesExecutionContext){
  if(raw.operation!=='approve_job'||raw.keyId!==execution.keyId||raw.requestHash!==execution.requestHash)throw new HermesFirestoreConflictError('Idempotency key was already used for another request');
  const record=raw as Receipt,v=record.paidVerification,t=record.target;
  if(!t||typeof t.documentId!=='string'||!['jobs','posts'].includes(t.collection)||t.schema!==(t.collection==='jobs'?'employer-job-v1':'legacy-job-post-v1')||!['applied','verified_noop'].includes(record.resultStatus)||typeof record.committedAt!=='string'||!v?.state?.employerId||!v.job||!v.employer)throw new HermesFirestoreConflictError('Idempotent paid verification record is invalid');
  const [job,opposite,employer]=await Promise.all([port.getDocument(t.collection,t.documentId),port.getDocument(t.collection==='jobs'?'posts':'jobs',t.documentId),port.getDocument('employers',v.state.employerId)]);
  if(opposite&&(t.collection==='posts'||opposite.data.type==='job'))throw new HermesFirestoreConflictError('Idempotent job target is ambiguous');
  if(!job||!employer||job.data.deletedAt||(t.collection==='posts'&&job.data.type!=='job')||job.data.status!=='active'||job.data.active!==true||!isDeepStrictEqual(select(job.data,JOB_FIELDS),v.job)||!isDeepStrictEqual(select(employer.data,Object.keys(v.employer)),v.employer))throw new Error('Paid publication verification detected drift');
  return {status:record.resultStatus,committedAt:record.committedAt,verified:project(job.data,v.state)};
 }
 return {
  async getIdempotentApply(execution:HermesExecutionContext){assertExecution(execution);const record=await port.getDocument(IDEMPOTENCY,hermesJobApprovalIdempotencyDocumentId(execution));return record?verify(record.data,execution):null;},
  createServiceDeps(input:{reviewSecret:string;execution:HermesExecutionContext}):HermesJobApprovalServiceDeps {
   assertExecution(input.execution);
   return {
    reviewSecret:input.reviewSecret,
    async findJobCandidates(id){const [job,post]=await Promise.all([port.getDocument('jobs',id),port.getDocument('posts',id)]);return [...(job?[{...job,collection:'jobs' as const,schema:'employer-job-v1' as const}]:[]),...(post?.data.type==='job'?[{...post,collection:'posts' as const,schema:'legacy-job-post-v1' as const}]:[])];},
    async resolvePaidPublication(document,featured,reviewed){try{return {ok:true,state:(await resolveHermesPaidPublication(port,document,featured,now(),reviewed)).state};}catch(error){if(error instanceof PublicationError)return {ok:false,status:error.code==='payment_required'?402:409,error:error.message};throw error;}},
    async commit({boundState,current}){
     if(!boundState.paidPublication)throw new HermesFirestoreConflictError('Paid review state is required');
     const reviewed=boundState.paidPublication,id=hermesJobApprovalIdempotencyDocumentId(input.execution);
     const receipt=await port.runTransaction(async tx=>{
      const existing=await tx.getDocument(IDEMPOTENCY,id);
      if(existing)return existing.data;
      const [target,other]=await Promise.all([tx.getDocument(boundState.collection,boundState.documentId),tx.getDocument(boundState.collection==='jobs'?'posts':'jobs',boundState.documentId)]);
      if(other&&(boundState.collection==='posts'||other.data.type==='job'))throw new HermesFirestoreConflictError('Job target became ambiguous after review');
      if(!target||target.version!==boundState.version||target.id!==current.id||current.collection!==boundState.collection||current.schema!==boundState.schema||(boundState.collection==='posts'&&target.data.type!=='job'))throw new HermesFirestoreConflictError('Job changed since review');
      if(!tx.queryExact)throw new Error('Transactional paid queries are required');
      const document:HermesJobApprovalDocument={...target,collection:boundState.collection,schema:boundState.schema};
      let paid;
      try{paid=await resolveHermesPaidPublication({getDocument:(c,i)=>tx.getDocument(c,i),queryExact:(c,f,v,l)=>tx.queryExact!(c,f,v,l)},document,boundState.desiredState.featured,now(),reviewed);}catch{throw new HermesFirestoreConflictError('Paid entitlement changed since review');}
      if(!isDeepStrictEqual(paid.state,reviewed))throw new HermesFirestoreConflictError('Paid entitlement changed since review');
      const alreadyActive=target.data.status==='active'&&target.data.active===true;
      if(!alreadyActive&&(target.data.status!=='draft'||target.data.active===true))throw new HermesFirestoreConflictError('Job is no longer eligible for approval');
      const candidate:Data={status:'active',active:true,...(Boolean(target.data.featured)!==boundState.desiredState.featured?{featured:boundState.desiredState.featured}:{}),...(boundState.desiredState.setPostedAt&&target.data.postedAt==null?{postedAt:new Date(reviewed.evaluatedAt)}:{}),...paid.jobPatch};
      const patch=Object.fromEntries(Object.entries(candidate).filter(([k,v])=>!isDeepStrictEqual(normalizePaidValue(v),normalizePaidValue(target.data[k]))));
      const employerPatch:Data={...paid.employerPatch};
      const changed=Object.keys(patch).length>0||Object.keys(employerPatch).length>0;
      const changedFields={job:Object.keys(patch).sort(),employer:Object.keys(employerPatch).sort()};
      const expected:Verification={state:paid.state,job:select({...target.data,...candidate},JOB_FIELDS),employer:select({...paid.employer,...employerPatch},ACCOUNT_FIELDS.filter(k=>Object.hasOwn(employerPatch,k)))};
      if(changed){const stamp=timestamp();tx.updateDocument(boundState.collection,boundState.documentId,{...patch,updatedAt:stamp});tx.updateDocument('employers',reviewed.employerId,{...employerPatch,updatedAt:stamp});}
      const status=changed?'applied' as const:'verified_noop' as const,committedAt=now().toISOString();
      const targetIdentity={documentId:boundState.documentId,collection:boundState.collection,schema:boundState.schema};
      tx.setDocument(AUDIT,id,{protocol:'iopps-hermes-admin-audit-v1',action:'approve_job',actorKeyId:input.execution.keyId,requestHash:input.execution.requestHash,target:targetIdentity,changedFields,outcome:status,occurredAt:committedAt});
      const record:Receipt={protocol:'iopps-hermes-admin-idempotency-v1',operation:'approve_job',keyId:input.execution.keyId,requestHash:input.execution.requestHash,target:targetIdentity,resultStatus:status,committedAt,paidVerification:expected};
      tx.setDocument(IDEMPOTENCY,id,record);return record;
     });
     return verify(receipt,input.execution);
    },
   };
  },
 };
}
