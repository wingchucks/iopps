import { createHash } from 'node:crypto';
import { buildJobRouteSlug } from './job-slugs.ts';

/** Shared public/backend route alphabet and bound (including historical aliases). */
export function cleanupSafeSlug(value:unknown):value is string { return typeof value==='string' && /^[A-Za-z0-9_-]{1,200}$/.test(value); }
/** Every supplied URL must identify the same requisition; never prefer one conflicting field. */
export function cleanupJobSourceKey(data:Record<string,unknown>):string|null {
 const supplied=['externalUrl','applyUrl','applicationUrl','externalApplyUrl','sourceUrl'].map(field=>data[field]).filter(value=>value!==undefined&&value!==null&&value!=='');
 if(!supplied.length)return null;
 const key=parseCleanupSourceKey(supplied[0]);
 if(!key||supplied.some(value=>parseCleanupSourceKey(value)!==key))return null;
 if(data.externalId!==undefined&&String(data.externalId)!==key.split(':')[2])return null;
 return key;
}
/** Return the public destination, normalizing an already persisted --id suffix. */
export function cleanupCanonicalRoute(id:string,data:Record<string,unknown>):string|null {
 if(!cleanupSafeSlug(id)||!cleanupSafeSlug(data.slug))return null;
 const slug=buildJobRouteSlug({id,slug:data.slug});
 const routeSlug=`${slug}--${id}`;
 return cleanupSafeSlug(slug)&&cleanupSafeSlug(routeSlug)?`/jobs/${routeSlug}`:null;
}

/** Frozen v1 storage contract shared with import guards and public aliases. */
export interface JobCleanupGuard { schemaVersion:1; active:boolean; kind:'duplicate'|'stale'; originalId:string; canonicalId:string|null; sourceKey:string; auditId:string }
export interface JobCleanupSource { schemaVersion:1; active:boolean; sourceKey:string; canonicalId:string|null; blockedEmployerIds:string[]; auditId:string }
export interface JobCleanupAlias { schemaVersion:1; active:boolean; kind:'duplicate'; originalId:string; canonicalId:string; sourceKey:string; auditId:string; slugs:string[]; redirectStatus:307 }
export function parseCleanupSourceKey(value:unknown):string|null {
 if(typeof value!=='string') return null;
 try { const u=new URL(value);
  if(u.protocol!=='https:'||u.hostname!=='workforcenow.adp.com'||u.port||u.username||u.password||u.hash||u.pathname!=='/mascsr/default/mdf/recruitment/recruitment.html') return null;
  const cid=u.searchParams.getAll('cid'), job=u.searchParams.getAll('jobId');
  if(cid.length!==1||job.length!==1||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cid[0])||! /^[A-Za-z0-9_-]{1,100}$/.test(job[0])) return null;
  return `adp:${cid[0].toLowerCase()}:${job[0]}`;
 } catch { return null; }
}
export function cleanupSourceDocId(sourceKey:string):string { return createHash('sha256').update(sourceKey).digest('hex'); }
