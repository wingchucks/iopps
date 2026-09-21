import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {isJobRecordExpired} from '../listing-freshness.ts';
import {cleanupJobSourceKey,cleanupCanonicalRoute,cleanupSafeSlug,cleanupSourceDocId} from './job-cleanup-contract.ts';

export const CLEANUP=Object.freeze({id:'individual3-7-duplicates-4-stale-v1',oldEmployer:'jNQB1XrW8DfwmN6hABeyym7br4y1',newEmployer:'tsRvNLiRWARbOoiBOiEVFDwFfZn2',pairs:Object.freeze([
 ['RsrdlIr8KA2Rn0DgUUSW','8hlV1frEldGecf3IRnfN'],['2j392LWYj5Rn2xP36BKT','UHXmZQOqHfBLsKIXVLzI'],['70zbVfpvg7mxpXdCFKPn','KhQHz3SzVwMUZLxEGpWg'],['0i8MEndHFvaXOcsY8m82','2D23E7eUULUWVPwLeIQs'],['b8B0MjhhK58CoClyEWiO','4K0FQHtnAPJZMuERH4M0'],['1nekmP9eqMWXIJ6JrXgk','IJilZ6vMLNj8e4Z7RsIJ'],['msJO0CSIaCD1brLcVW55','0ucJ0rmx6cowH7SqyaEt'],
].map(p=>Object.freeze(p))),stale:Object.freeze(['Kx8XAVkiS7T6YGTdf4Kd','TEIAjYDMwnorXK4KVgDN','K2BP8gTOzkzFldnoMe8r','HcGf144zPqNSCAMVgeHm'])});
export interface CleanupDoc {path:string;version:string;data:Record<string,unknown>}
export interface CleanupReader {read(path:string):Promise<CleanupDoc|null>;query(collection:string,field:string,value:string,limit:number):Promise<CleanupDoc[]>}
export interface CleanupTransaction extends CleanupReader {create(path:string,data:Record<string,unknown>):void;replace(path:string,data:Record<string,unknown>):void}
export interface CleanupPort extends CleanupReader {transaction<T>(fn:(tx:CleanupTransaction)=>Promise<T>):Promise<T>}
export interface CleanupEvidence {provider:'adp';sourceKey:string;checkedAt:number;status:'active'|'closed';evidenceDigest:string}
export interface CleanupExecution {keyId:string;idempotencyKey:string;requestHash:string}
export class CleanupConflict extends Error {readonly status=409;}
function fail(message='Cleanup state is invalid or changed'):never{throw new CleanupConflict(message);}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Deterministic, type-tagged digest; never JSON-normalize native backup values. */
export function cleanupCanonical(v:unknown):string {
 if(v===null)return 'null';
 if(typeof v==='string'||typeof v==='boolean')return JSON.stringify([typeof v,v]);
 if(typeof v==='number')return JSON.stringify(['number',Object.is(v,-0)?'-0':String(v)]);
 if(v instanceof Date)return JSON.stringify(['date',v.toISOString()]);
 if(Buffer.isBuffer(v)||v instanceof Uint8Array)return JSON.stringify(['bytes',Buffer.from(v).toString('base64')]);
 if(Array.isArray(v))return '['+v.map(cleanupCanonical).join(',')+']';
 if(!v||typeof v!=='object')fail('Unsupported stored value');
 const o=v as Record<string,unknown>;const name=v.constructor?.name;
 if(name==='Timestamp'&&typeof o.seconds==='number'&&typeof o.nanoseconds==='number')return JSON.stringify(['timestamp',o.seconds,o.nanoseconds]);
 if(name==='GeoPoint'&&typeof o.latitude==='number'&&typeof o.longitude==='number')return JSON.stringify(['geopoint',o.latitude,o.longitude]);
 if(name==='DocumentReference'&&typeof o.path==='string') {const f=o.firestore as {projectId?:string;databaseId?:string};return JSON.stringify(['reference',f.projectId,f.databaseId??'(default)',o.path]);}
 if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail('Unsupported Firestore value class');
 return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+cleanupCanonical(o[k])).join(',')+'}';
}
export const cleanupDigest=(v:unknown)=>hash(cleanupCanonical(v));
function exact(v:unknown,keys:string[]):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===keys.sort().join('|');}
function id(v:unknown):v is string{return typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);}
const allIds=[...CLEANUP.pairs.flat(),...CLEANUP.stale];
const refs=[['applications','jobId'],['saved_items','postId'],['savedJobs','jobId']] as const;
interface Bound {documents:Record<string,CleanupDoc|null>;references:Record<string,{count:number;digest:string}>}
interface ExpectedDocument {digest:string|null;version:string|null}
function documentBinding(d:CleanupDoc|null):ExpectedDocument{return {digest:d?cleanupDigest(d.data):null,version:d?.version??null};}
interface Write {path:string;data:Record<string,unknown>;create:boolean}
interface Review {schemaVersion:1;manifestId:string;keyId:string;mode:'apply'|'rollback';expiresAt:number;bound:Bound;writes:Write[];evidence:CleanupEvidence[];auditId:string;originalAuditId:string|null}
function stored<T>(doc:CleanupDoc|null):T {if(!doc)fail();return doc.data as T;}
function size(value:unknown){if(Buffer.byteLength(cleanupCanonical(value))>700_000)fail('Private manifest exceeds conservative size bound');}
function validateDoc(path:string,d:CleanupDoc|null){if(d&&(d.path!==path||!d.version||typeof d.version!=='string'||Buffer.byteLength(JSON.stringify(d.version))>128))fail('Missing or oversized native document version');}
/** Shared artifact construction keeps preflight identical to commit's nested backup shape. */
function commitArtifacts(r:Review,execution:CleanupExecution,reviewId:string,receiptPath:string,occurredAt:number){
 const auditPath='jobCleanupAudits/'+r.auditId,backupPath='jobCleanupBackups/'+r.auditId;
 const audit={schemaVersion:1,manifestId:CLEANUP.id,mode:r.mode,keyId:execution.keyId,reviewId,receiptPath,originalAuditId:r.originalAuditId,occurredAt,changedPaths:r.writes.map(w=>w.path)};
 const backup={schemaVersion:1,documents:r.bound.documents};
 const expected:Record<string,ExpectedDocument>={};
 for(const [path,d]of Object.entries(r.bound.documents))expected[path]=documentBinding(d);
 for(const w of r.writes)expected[w.path]={digest:cleanupDigest(w.data),version:null};
 expected[auditPath]={digest:cleanupDigest(audit),version:null};expected[backupPath]={digest:cleanupDigest(backup),version:null};
 const receipt={schemaVersion:1,auditId:r.auditId,reviewId,mode:r.mode,keyId:execution.keyId,requestHash:execution.requestHash,expected};
 return {auditPath,backupPath,audit,backup,expected,receipt};
}
/** Upper-bound both rollback review and its recursively bound commit backup BEFORE apply is offered.
 * Synthetic IDs/digests have their fixed wire lengths; the version envelope exceeds the
 * validated native-version bound. Native data is only measured, never serialized for storage.
 */
function preflightRollbackCapacity(r:Review){
 const version='v'.repeat(128),reviewId='a'.repeat(48),receiptPath='jobCleanupReceipts/'+'b'.repeat(64);
 const execution={keyId:'k'.repeat(100),idempotencyKey:'preflight',requestHash:'c'.repeat(64)};
 const maxTime=Number.MAX_SAFE_INTEGER;
 const applied=commitArtifacts(r,execution,reviewId,receiptPath,maxTime);
 const documents={...r.bound.documents};
 const put=(path:string,data:Record<string,unknown>)=>{documents[path]={path,version,data};};
 for(const w of r.writes)put(w.path,w.data);
 put(applied.auditPath,applied.audit);put(applied.backupPath,applied.backup);put(receiptPath,applied.receipt);
 const sealed=Object.fromEntries(Object.entries(applied.expected).map(([path,e])=>[path,{...e,version:e.digest===null?null:e.version??version}]));
 put('jobCleanupReceipts/'+r.auditId+'-verified',{schemaVersion:1,documents:sealed});
 const auditId='d'.repeat(48);
 const writes=r.writes.map(w=>({path:w.path,create:false,data:/^(jobs|posts)\//.test(w.path)?r.bound.documents[w.path]!.data:{...w.data,active:false,auditId}}));
 const references=Object.fromEntries(Object.entries(r.bound.references).map(([key,value])=>[key,{...value,count:100}]));
 const rollback:Review={schemaVersion:1,manifestId:CLEANUP.id,keyId:execution.keyId,mode:'rollback',expiresAt:maxTime,bound:{documents,references},writes,evidence:[],auditId,originalAuditId:r.auditId};
 const undone=commitArtifacts(rollback,execution,reviewId,'jobCleanupReceipts/'+'e'.repeat(64),maxTime);
 try { for(const value of [applied.backup,applied.receipt,rollback,undone.backup,undone.receipt])size(value); }
 catch(error){if(error instanceof CleanupConflict)fail('Rollback capacity exceeds conservative size bound; review rejected before writes');throw error;}
}
async function referenceState(r:CleanupReader){const result:Bound['references']={};for(const target of allIds)for(const [collection,field] of refs){const rows=await r.query(collection,field,target,101);if(rows.length>=101)fail('Scoped reference query saturated');for(const row of rows){validateDoc(row.path,row);if(row.data[field]!==target)fail();}result[`${collection}:${field}:${target}`]={count:rows.length,digest:cleanupDigest(rows.sort((a,b)=>a.path.localeCompare(b.path)))};}return result;}
async function readBound(r:CleanupReader,paths:string[]):Promise<Bound>{const documents:Bound['documents']={};for(const path of [...new Set(paths)].sort()){const d=await r.read(path);validateDoc(path,d);documents[path]=d;}return {documents,references:await referenceState(r)};}
function same(a:unknown,b:unknown){if(cleanupDigest(a)!==cleanupDigest(b))fail('Reviewed version, absence, or whole document drifted');}
function owner(d:Record<string,unknown>,expected:string,post=false){if((post?d.orgId:d.employerId)!==expected||(d.employerId!==undefined&&d.employerId!==expected)||(d.orgId!==undefined&&d.orgId!==expected)||(post&&d.type!=='job'))fail('Unverified employer/schema');}
function source(d:Record<string,unknown>){const key=cleanupJobSourceKey(d);if(!key)fail('Unverified or conflicting ADP identity');return key;}
function active(d:Record<string,unknown>,at?:number){if(d.active!==true||d.status!=='active'||d.duplicateOf!==undefined||d.archivedAt||d.deletedAt||(d.type!==undefined&&d.type!=='job')||(at!==undefined&&isJobRecordExpired(d,new Date(at))))fail('Job is not strictly active');}
function slug(d:Record<string,unknown>){if(!cleanupSafeSlug(d.slug))fail('Historic slug unavailable');return d.slug;}

export function createJobCleanup(port:CleanupPort,options:{secret:string;now?:()=>number;provider:(sourceKey:string)=>Promise<CleanupEvidence>}) {
 if(Buffer.byteLength(options.secret)<32)throw new Error('Missing cleanup review secret');const now=options.now??Date.now;
 const token=(reviewId:string,r:Review)=>createHmac('sha256',options.secret).update(cleanupCanonical({reviewId,review:r,domain:'job-cleanup-v1'})).digest('hex');
 function confirmation(r:Review){return r.mode==='apply'?'APPLY EXACT 7 DUPLICATES AND 4 STALE CLOSURES':'ROLL BACK EXACT CLEANUP '+r.originalAuditId;}
 function evidenceValid(e:CleanupEvidence,key:string,status:'active'|'closed'){if(e.provider!=='adp'||e.sourceKey!==key||e.status!==status||!Number.isSafeInteger(e.checkedAt)||e.checkedAt>now()||now()-e.checkedAt>60_000||! /^[a-f0-9]{64}$/.test(e.evidenceDigest))fail('Fresh authoritative ADP evidence required');}
 async function saveReview(r:Review){size(r);if(r.mode==='apply')preflightRollbackCapacity(r);const reviewId=randomBytes(24).toString('hex');await port.transaction(async tx=>{if(await tx.read('jobCleanupReviews/'+reviewId))fail();tx.create('jobCleanupReviews/'+reviewId,r as unknown as Record<string,unknown>);});const reread=await port.read('jobCleanupReviews/'+reviewId);same(r,reread?.data);return {manifestId:CLEANUP.id,reviewId,reviewToken:token(reviewId,r),expiresAt:r.expiresAt,confirmation:confirmation(r),duplicates:CLEANUP.pairs.length,stale:CLEANUP.stale.length,
   targets:[...CLEANUP.pairs.map(([originalId,canonicalId])=>({originalId,canonicalId})),...CLEANUP.stale.map(originalId=>({originalId,canonicalId:null}))].map(t=>{const job=r.bound.documents['jobs/'+t.originalId];const alias=r.writes.find(w=>w.path==='jobAliases/'+t.originalId);return {...t,employerId:job?.data.employerId??null,sourceKey:job?source(job.data):null,slugs:alias?.data.slugs??[],action:r.mode==='rollback'?'restore':t.canonicalId?'retire-duplicate':'close-stale'};}),
   documents:Object.entries(r.bound.documents).map(([path,d])=>({path,exists:!!d,version:d?.version??null,digest:d?cleanupDigest(d.data):null})),
   evidence:r.evidence,referenceCounts:Object.fromEntries(Object.entries(r.bound.references).map(([k,v])=>[k,v.count]))};}
 async function verifyExpected(expected:Record<string,ExpectedDocument>,commitVersion:string){const actual:Record<string,ExpectedDocument>={};for(const [path,e]of Object.entries(expected)){const d=await port.read(path);validateDoc(path,d);const binding=documentBinding(d);same(e.digest,binding.digest);if(d&&d.version!==(e.version??commitVersion))fail('Committed version drift');actual[path]=binding;}return actual;}
 async function verifyReceipt(receipt:Record<string,unknown>,receiptVersion:string){const auditId=receipt.auditId as string;const audit=await port.read('jobCleanupAudits/'+auditId);if(!audit||audit.version!==receiptVersion)fail('Missing or drifted atomic commit audit/receipt');const expected=receipt.expected as Record<string,ExpectedDocument>;const actual=await verifyExpected(expected,audit.version);const sealPath='jobCleanupReceipts/'+auditId+'-verified';const seal=await port.read(sealPath);
  if(seal){same(seal.data.documents,actual);}else{await port.transaction(async tx=>{const existing=await tx.read(sealPath);const current=await readBound(tx,Object.keys(expected));same(Object.fromEntries(Object.entries(current.documents).map(([p,d])=>[p,documentBinding(d)])),actual);if(existing)same(existing.data.documents,actual);else tx.create(sealPath,{schemaVersion:1,documents:actual});});const sealed=await port.read(sealPath);same(sealed?.data.documents,actual);}
  return {auditId,verified:true};
 }
 async function commit(value:unknown,execution:CleanupExecution,mode:'apply'|'rollback') {
  if(!exact(value,['reviewId','reviewToken','confirmation'])||!id(value.reviewId)||typeof value.reviewToken!=='string'||! /^[a-f0-9]{64}$/.test(value.reviewToken)||!id(execution.keyId)||! /^[A-Za-z0-9._:-]{1,128}$/.test(execution.idempotencyKey)||! /^[a-f0-9]{64}$/.test(execution.requestHash))fail('Invalid typed cleanup request');
  const reviewId=value.reviewId;const receiptId=hash(`cleanup:${execution.keyId}:${execution.idempotencyKey}`);const receiptPath='jobCleanupReceipts/'+receiptId;
  const result=await port.transaction(async tx=>{
   const existing=await tx.read(receiptPath);if(existing){if(existing.data.requestHash!==execution.requestHash||existing.data.keyId!==execution.keyId||existing.data.mode!==mode||existing.data.reviewId!==reviewId)fail('Idempotency conflict');return existing.data;}
   const r=stored<Review>(await tx.read('jobCleanupReviews/'+reviewId));
   if(r.schemaVersion!==1||r.manifestId!==CLEANUP.id||r.mode!==mode||r.keyId!==execution.keyId||r.expiresAt<=now()||r.expiresAt>now()+120_000||value.confirmation!==confirmation(r)||!timingSafeEqual(Buffer.from(value.reviewToken as string),Buffer.from(token(reviewId,r))))fail('Invalid or expired review');
   if(mode==='apply')for(const e of r.evidence)evidenceValid(e,e.sourceKey,e.status);
   const current=await readBound(tx,Object.keys(r.bound.documents));same(current,r.bound);
   if(mode==='apply')for(const pair of CLEANUP.pairs)for(const collection of ['jobs','posts']){const canonical=current.documents[collection+'/'+pair[1]];if(canonical)active(canonical.data,now());}
   const auditPath='jobCleanupAudits/'+r.auditId,backupPath='jobCleanupBackups/'+r.auditId;
   if(await tx.read(auditPath)||await tx.read(backupPath))fail('Immutable record collision');
   const {audit,backup,receipt}=commitArtifacts(r,execution,reviewId,receiptPath,now());
   for(const w of r.writes)if(w.create&&current.documents[w.path])fail('Cleanup record collision');
   size(receipt);size(backup);
   // ALL transaction reads above; native values pass through unchanged. Never touch references.
   tx.create(backupPath,backup);for(const w of r.writes){if(w.create)tx.create(w.path,w.data);else tx.replace(w.path,w.data);}tx.create(auditPath,audit);tx.create(receiptPath,receipt);return receipt;
  });
  const persisted=await port.read(receiptPath);if(!persisted)fail('Missing committed receipt');same(persisted.data,result);return verifyReceipt(result,persisted.version);
 }
 return {
  async review(value:unknown,keyId:string){
   if(!exact(value,['manifestId'])||value.manifestId!==CLEANUP.id||!id(keyId))fail('Only exact manifest supported');
   const paths=allIds.flatMap(j=>['jobs/'+j,'posts/'+j,'jobAliases/'+j,'jobCleanupGuards/'+j]);paths.push('employers/'+CLEANUP.oldEmployer,'employers/'+CLEANUP.newEmployer);
   let bound=await readBound(port,paths);const auditId=randomBytes(24).toString('hex');const writes:Write[]=[];const evidence:CleanupEvidence[]=[];const seen=new Set<string>();
   for(const employer of [CLEANUP.oldEmployer,CLEANUP.newEmployer])if(!bound.documents['employers/'+employer])fail('Missing employer identity');
   const targets=[...CLEANUP.pairs.map(([old,canonical])=>({old,canonical,employer:CLEANUP.oldEmployer})),...CLEANUP.stale.map(old=>({old,canonical:null,employer:CLEANUP.newEmployer}))];
   for(const t of targets){const original=bound.documents['jobs/'+t.old];if(!original)fail('Missing original job');owner(original.data,t.employer);active(original.data);const key=source(original.data);if(seen.has(key))fail('Source reservation collision');seen.add(key);const kind=t.canonical?'duplicate':'stale';
    const slugs=[slug(original.data)];if(t.canonical){const canonical=bound.documents['jobs/'+t.canonical];if(!canonical)fail();owner(canonical.data,CLEANUP.newEmployer);active(canonical.data,now());same(source(canonical.data),key);if(!cleanupCanonicalRoute(t.canonical,canonical.data))fail('Canonical public route unavailable');const cp=bound.documents['posts/'+t.canonical];if(cp){owner(cp.data,CLEANUP.newEmployer,true);active(cp.data,now());same(source(cp.data),key);}}
    for(const target of [t.old,...(t.canonical?[t.canonical]:[])])for(const collection of ['jobs','posts']){const d=bound.documents[collection+'/'+target];if(!d)continue;if(d.data.feedId!==undefined){if(!id(d.data.feedId))fail();const fp='rssFeeds/'+d.data.feedId;paths.push(fp);const feed=await port.read(fp);validateDoc(fp,feed);if(!feed||feed.data.employerId!==(target===t.old?t.employer:CLEANUP.newEmployer))fail('Feed identity mismatch');if(bound.documents[fp])same(bound.documents[fp],feed);else bound.documents[fp]=feed;}}
    const post=bound.documents['posts/'+t.old];if(post){owner(post.data,t.employer,true);active(post.data);same(source(post.data),key);slugs.push(slug(post.data));}
    for(const collection of ['jobs','posts']){const d=bound.documents[collection+'/'+t.old];if(d)writes.push({path:d.path,create:false,data:{...d.data,active:false,status:t.canonical?'deleted':'closed',...(t.canonical?{duplicateOf:t.canonical}:{})}});}
    const guardPath='jobCleanupGuards/'+t.old,aliasPath='jobAliases/'+t.old,sourcePath='jobCleanupSources/'+cleanupSourceDocId(key);paths.push(guardPath,aliasPath,sourcePath);
    writes.push({path:guardPath,create:true,data:{schemaVersion:1,active:true,kind,originalId:t.old,canonicalId:t.canonical,sourceKey:key,auditId}});
    writes.push({path:sourcePath,create:true,data:{schemaVersion:1,active:true,sourceKey:key,canonicalId:t.canonical,blockedEmployerIds:[t.employer],auditId}});
    if(t.canonical)writes.push({path:aliasPath,create:true,data:{schemaVersion:1,active:true,kind:'duplicate',originalId:t.old,canonicalId:t.canonical,sourceKey:key,auditId,slugs:[...new Set(slugs)],redirectStatus:307}});
    const e=await options.provider(key);evidenceValid(e,key,t.canonical?'active':'closed');evidence.push(e);
   }
   // Re-read complete manifest after provider I/O and ensure initial identities did not move.
   const full=await readBound(port,paths);for(const [path,d]of Object.entries(bound.documents))same(d,full.documents[path]);same(bound.references,full.references);bound=full;
   for(const path of paths.filter(p=>/^(jobAliases|jobCleanupGuards|jobCleanupSources)\//.test(p)))if(bound.documents[path])fail('Existing alias/guard/source needs separate investigation');
   for(const e of evidence)evidenceValid(e,e.sourceKey,e.status);
   return saveReview({schemaVersion:1,manifestId:CLEANUP.id,keyId,mode:'apply',expiresAt:now()+60_000,bound,writes,evidence,auditId,originalAuditId:null});
  },
  apply:(value:unknown,execution:CleanupExecution)=>commit(value,execution,'apply'),
  async rollbackReview(value:unknown,keyId:string){
   if(!exact(value,['auditId'])||!id(value.auditId)||!id(keyId))fail();const originalAuditId=value.auditId;
   const audit=await port.read('jobCleanupAudits/'+originalAuditId);const backup=await port.read('jobCleanupBackups/'+originalAuditId);const seal=await port.read('jobCleanupReceipts/'+originalAuditId+'-verified');
   if(!audit||audit.data.mode!=='apply'||audit.data.manifestId!==CLEANUP.id||!backup||!seal)fail('Verified applied backup required');
   const receiptPath=audit.data.receiptPath;if(typeof receiptPath!=='string'||! /^jobCleanupReceipts\/[a-f0-9]{64}$/.test(receiptPath))fail('Invalid receipt binding');
   const receipt=await port.read(receiptPath);if(!receipt||receipt.version!==audit.version)fail('Receipt drift');
   const sealed=seal.data.documents as Record<string,ExpectedDocument>;const current=await readBound(port,[...Object.keys(sealed),receiptPath,'jobCleanupReceipts/'+originalAuditId+'-verified']);for(const [path,d]of Object.entries(sealed))same(documentBinding(current.documents[path]),d);same(current.documents[receiptPath],receipt);same(current.documents['jobCleanupReceipts/'+originalAuditId+'-verified'],seal);
   const pre=backup.data.documents as Record<string,CleanupDoc|null>;const writes:Write[]=[];const auditId=randomBytes(24).toString('hex');
   for(const path of audit.data.changedPaths as string[]){const before=pre[path];const after=current.documents[path];if(!after)fail();if(path.startsWith('jobs/')||path.startsWith('posts/')){if(!before)fail();writes.push({path,create:false,data:before.data});}else if(/^(jobAliases|jobCleanupGuards|jobCleanupSources)\//.test(path)){writes.push({path,create:false,data:{...after.data,active:false,auditId}});}else fail('Unexpected backup target');}
   return saveReview({schemaVersion:1,manifestId:CLEANUP.id,keyId,mode:'rollback',expiresAt:now()+60_000,bound:current,writes,evidence:[],auditId,originalAuditId});
  },
  rollback:(value:unknown,execution:CleanupExecution)=>commit(value,execution,'rollback'),
 };
}
