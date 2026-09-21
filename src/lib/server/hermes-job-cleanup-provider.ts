import {createHash} from 'node:crypto';
import {CleanupConflict,type CleanupEvidence} from './hermes-job-cleanup.ts';
/** No user URL is fetched. 404, empty payload, missing title and unknown schemas are NOT proof of closure. */
export function createAdpCleanupProvider(options:{fetch?:typeof fetch;now?:()=>number}={}){
 const fetcher=options.fetch??fetch,now=options.now??Date.now;
 return async(sourceKey:string):Promise<CleanupEvidence>=>{
  const match=/^adp:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}):([A-Za-z0-9_-]{1,100})$/.exec(sourceKey);
  if(!match)throw new CleanupConflict('Invalid ADP source');
  const url=new URL('https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions/'+encodeURIComponent(match[2]));url.searchParams.set('cid',match[1]);url.searchParams.set('lang','en_CA');url.searchParams.set('locale','en_CA');
  const response=await fetcher(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000),headers:{accept:'application/json'}});
  if(response.status!==200||!response.headers.get('content-type')?.includes('application/json')||!response.body)throw new CleanupConflict('ADP did not provide authoritative JSON evidence');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512_000)throw new CleanupConflict('ADP evidence too large');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=Buffer.concat(chunks);const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as Record<string,unknown>;
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new CleanupConflict('ADP posting schema not recognized');
  const statusCode=payload.requisitionStatusCode as {codeValue?:unknown}|undefined;
  if(payload.itemID!==match[2]||(payload.cid!==undefined&&(typeof payload.cid!=='string'||payload.cid.toLowerCase()!==match[1])))throw new CleanupConflict('ADP identity not explicitly confirmed');
  // Deliberately conservative: provider schema compatibility is a deployment gate.
  let status:'active'|'closed';
  if(statusCode?.codeValue==='CLOSED')status='closed';
  else if(statusCode?.codeValue==='OPEN'&&typeof payload.requisitionTitle==='string'&&payload.requisitionTitle.trim())status='active';
  // The public detail endpoint omits status on live postings. Require positive
  // posting content, not mere HTTP success/absence; never infer CLOSED this way.
  else if(!Object.hasOwn(payload,'requisitionStatusCode')&&typeof payload.requisitionTitle==='string'&&payload.requisitionTitle.trim()&&typeof payload.requisitionDescription==='string'&&payload.requisitionDescription.trim())status='active';
  else throw new CleanupConflict('ADP explicit status or complete posting not recognized');
  return {provider:'adp',sourceKey,checkedAt:now(),status,evidenceDigest:createHash('sha256').update(bytes).digest('hex')};
 };
}
