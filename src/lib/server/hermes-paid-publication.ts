import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {preparePaidPublication,type PublicationReader} from './paid-job-publication-reader';
import {PublicationError,publicationDate} from './paid-job-publication';
type Data=Record<string,unknown>;
export interface HermesPaidPublicationState {
 employerId:string;organizationId:string;evaluatedAt:string;inputsDigest:string;planDigest:string;
 funding:'standard_credit'|'featured_credit'|'standard_subscription'|'premium_subscription'|'school_subscription'|'existing_legacy';
 durationDays:number|null;expiresAt:string|null;
}
export function normalizePaidValue(value:unknown):unknown {
 if(value instanceof Date){const ms=value.getTime(),seconds=Math.floor(ms/1000);return {seconds,nanoseconds:(ms-seconds*1000)*1000000};}
 if(value && typeof value==='object' && 'toDate' in value && typeof value.toDate==='function' && 'seconds' in value && 'nanoseconds' in value)return {seconds:value.seconds,nanoseconds:value.nanoseconds};
 if(Array.isArray(value))return value.map(normalizePaidValue);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalizePaidValue(v)]));
 return value;
}
function digest(value:unknown){return createHash('sha256').update(JSON.stringify(normalizePaidValue(value))).digest('hex');}
export async function resolveHermesPaidPublication(reader:PublicationReader,document:{id:string;data:Data},featured:boolean,now:Date,reviewed?:HermesPaidPublicationState) {
 const data=document.data;
 const employerId=data.employerId ?? data.orgId;
 const organizationId=data.orgId ?? data.organizationId ?? employerId;
 if(typeof employerId!=='string' || typeof organizationId!=='string' || organizationId!==employerId ||
   ['employerId','orgId','organizationId'].some(k=>data[k]!==undefined && data[k]!==employerId)) {
  throw new PublicationError('invalid_identity','Job approval requires an exact paid account identity.');
 }
 const evaluatedAt=reviewed ? new Date(reviewed.evaluatedAt) : now;
 if(!Number.isFinite(evaluatedAt.getTime()) || evaluatedAt>now)throw new PublicationError('reconciliation_required','Invalid paid review time.');
 if(reviewed?.expiresAt && (!publicationDate(reviewed.expiresAt) || publicationDate(reviewed.expiresAt)!<=now))throw new PublicationError('expired','Reviewed publication lifetime has expired.');
 // Both evaluations use the same read snapshot. A transaction-backed caller owns atomicity.
 const documents=new Map<string,ReturnType<PublicationReader['getDocument']>>();
 const queries=new Map<string,ReturnType<PublicationReader['queryExact']>>();
 const snapshot:PublicationReader={
  getDocument(c,id){const key=JSON.stringify([c,id]);if(!documents.has(key))documents.set(key,reader.getDocument(c,id));return documents.get(key)!;},
  queryExact(c,f,v,l){const key=JSON.stringify([c,f,v,l]);if(!queries.has(key))queries.set(key,reader.queryExact(c,f,v,l));return queries.get(key)!;},
 };
 const history=data.publication && typeof data.publication==='object' ? data.publication as Data : null;
 const input={employerId,organizationId,jobId:document.id,current:data,status:'active' as const,featured,
  durationDays:history?.durationDays ?? (featured ? data.listingDurationDays : 30)};
 const current=await preparePaidPublication(snapshot,{...input,now});
 const paid=reviewed ? await preparePaidPublication(snapshot,{...input,now:evaluatedAt}) : current;
 const persisted={...data,...paid.jobPatch};
 const publication=persisted.publication as Data|undefined;
 const funding=(publication?.funding ?? 'existing_legacy') as HermesPaidPublicationState['funding'];
 const state:HermesPaidPublicationState={employerId,organizationId,evaluatedAt:evaluatedAt.toISOString(),
  inputsDigest:digest({employerId,organizationId,binding:paid.binding}),
  planDigest:digest({job:paid.jobPatch,employer:paid.employerPatch}),funding,
  durationDays:typeof publication?.durationDays==='number'?publication.durationDays:null,
  expiresAt:publicationDate(persisted.expiresAt)?.toISOString() ?? null};
 if(reviewed && (!isDeepStrictEqual(state,reviewed) || !isDeepStrictEqual(current.binding,paid.binding) || !isDeepStrictEqual(current.employerPatch,paid.employerPatch))) {
  throw new PublicationError('reconciliation_required','Paid publication changed since review.');
 }
 return {...paid,state};
}
