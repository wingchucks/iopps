import type { Firestore } from 'firebase-admin/firestore';
import { cleanupCanonicalRoute, cleanupJobSourceKey, cleanupSafeSlug } from './job-cleanup-contract.ts';
import { isPublicJobRecordVisible } from '../public-job-merge.ts';
export type PublicJobAlias = {originalId:string; canonicalId:string; destination:string};
type Data = Record<string, unknown>;
export const safeAliasId = cleanupSafeSlug;
export function resolveAliasRecord(id:string, alias:Data|null, job:Data|null, canonicalAlias:Data|null):PublicJobAlias|null {
 if (!alias || alias.schemaVersion!==1 || alias.active!==true || alias.kind!=='duplicate' || alias.originalId!==id ||
  !safeAliasId(alias.canonicalId) || alias.canonicalId===id || alias.redirectStatus!==307 || typeof alias.auditId!=='string' ||
  !Array.isArray(alias.slugs) || !alias.slugs.every(s=>typeof s==='string' && safeAliasId(s)) || canonicalAlias ||
  !job || job.active!==true || !isPublicJobRecordVisible(job) || job.employerId!=='tsRvNLiRWARbOoiBOiEVFDwFfZn2' ||
  (job.orgId!==undefined && job.orgId!==job.employerId)) return null;
 const sourceKey=cleanupJobSourceKey(job);
 if(!sourceKey || sourceKey!==alias.sourceKey) return null;
 const destination=cleanupCanonicalRoute(alias.canonicalId,job);
 if(!destination) return null;
 return {originalId:id,canonicalId:alias.canonicalId,destination};
}
/** All alias/canonical reads share a snapshot. Any chain, including inactive/unknown records, fails closed. */
export async function readJobAliases(db:Firestore, ids:string[]):Promise<PublicJobAlias[]> {
 if(ids.length>50 || ids.some(id=>!safeAliasId(id))) throw new Error('Invalid alias IDs');
 return db.runTransaction(async tx=>{
  const candidates=new Map<string,Data>();
  for(const id of new Set(ids)) {
   const direct=await tx.get(db.collection('jobAliases').doc(id));
   if(direct.exists) candidates.set(id,direct.data()!);
   const reverse=await tx.get(db.collection('jobAliases').where('canonicalId','==',id).limit(51));
   if(reverse.size>=51) throw new Error('Alias lookup saturated');
   for(const doc of reverse.docs) candidates.set(doc.id,doc.data());
   if(candidates.size>100) throw new Error('Alias lookup saturated');
  }
  const result:PublicJobAlias[]=[];
  for(const [id,alias] of candidates) {
   if(!safeAliasId(alias.canonicalId)) continue;
   const job=await tx.get(db.collection('jobs').doc(alias.canonicalId));
   const next=await tx.get(db.collection('jobAliases').doc(alias.canonicalId));
   const resolved=resolveAliasRecord(id,alias,job.exists?job.data()!:null,next.exists?next.data()!:null);
   if(resolved) result.push(resolved);
  }
  return result;
 });
}
/** Exact stored historic slug only: never infer an alias from a title or suffix. */
export async function readJobAliasRedirect(db:Firestore, slug:string):Promise<string|null> {
 if(!safeAliasId(slug)) return null;
 return db.runTransaction(async tx=>{
  const matches=await tx.get(db.collection('jobAliases').where('slugs','array-contains',slug).limit(2));
  if(matches.size!==1) return null;
  const aliasDoc=matches.docs[0], alias=aliasDoc.data();
  if(!safeAliasId(alias.canonicalId)) return null;
  // A real job/post using the same slug is ambiguous even if an alias claims it.
  for(const collection of ['jobs','posts']) {
   const direct = await tx.get(db.collection(collection).doc(slug));
   if (direct.exists && direct.id !== aliasDoc.id) return null;
   const collisions=await tx.get(db.collection(collection).where('slug','==',slug).limit(3));
   if(collisions.size>=3 || collisions.docs.some(d=>d.id!==aliasDoc.id)) return null;
  }
  const job=await tx.get(db.collection('jobs').doc(alias.canonicalId));
  const next=await tx.get(db.collection('jobAliases').doc(alias.canonicalId));
  return resolveAliasRecord(aliasDoc.id,alias,job.exists?job.data()!:null,next.exists?next.data()!:null)?.destination || null;
 });
}
export async function handleJobAliases(request:Request, db:Firestore):Promise<Response> {
 const headers={'Cache-Control':'no-store'};
 try {
  const text=await request.text();
  if(text.length>16000) return Response.json({error:'Invalid request'},{status:400,headers});
  const body=JSON.parse(text);
  if(!body || Object.keys(body).length!==1 || !Array.isArray(body.ids) || body.ids.length>50 || body.ids.some((id:unknown)=>!safeAliasId(id))) return Response.json({error:'Invalid IDs'},{status:400,headers});
  const aliases=await readJobAliases(db,[...new Set<string>(body.ids)]);
  return Response.json({aliases},{headers});
 } catch { return Response.json({error:'Alias lookup unavailable'},{status:503,headers}); }
}
