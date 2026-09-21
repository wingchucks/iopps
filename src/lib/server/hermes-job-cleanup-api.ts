import {authenticateHermesJsonRequest} from './hermes-admin-request.ts';
import {hashHermesBody,type HermesMachineAuthDeps} from './hermes-machine-auth.ts';
import type {CleanupExecution} from './hermes-job-cleanup.ts';
export type CleanupAction='review'|'apply'|'rollback-review'|'rollback';
interface CleanupApiDeps extends HermesMachineAuthDeps {cleanupKeys:readonly string[];service:{review(v:unknown,keyId:string):Promise<unknown>;apply(v:unknown,execution:CleanupExecution):Promise<unknown>;rollbackReview(v:unknown,keyId:string):Promise<unknown>;rollback(v:unknown,execution:CleanupExecution):Promise<unknown>}}
/** Cleanup envelopes contain strings only. Decode keys before checking duplicates. */
export function uniqueCleanupEnvelope(body:string):boolean{
 const text=body.trim();if(!text.startsWith('{')||!text.endsWith('}'))return false;
 const inner=text.slice(1,-1),names=new Set<string>();
 const field=/\s*("(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*")\s*:\s*("(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*")\s*(,|$)/gy;
 let cursor=0;while(cursor<inner.length){field.lastIndex=cursor;const match=field.exec(inner);if(!match)return false;const name=JSON.parse(match[1]) as string;if(names.has(name))return false;names.add(name);cursor=field.lastIndex;if(match[3]===','&&!inner.slice(cursor).trim())return false;}return names.size>0;
}
const response=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleJobCleanupRequest(request:Request,action:CleanupAction,deps:CleanupApiDeps):Promise<Response>{
 const url=new URL(request.url);if(request.method!=='POST'||url.pathname!==`/api/hermes/v1/jobs/cleanup/${action}`||url.search)return response({error:'Invalid cleanup endpoint'},400);
 try{const auth=await authenticateHermesJsonRequest(request,{...deps,maxBodyBytes:4096});if(!auth.ok)return response({error:auth.error},auth.status);
  if(!deps.cleanupKeys.includes(auth.keyId))return response({error:'Key is not authorized for job cleanup'},403);
  if(!uniqueCleanupEnvelope(auth.body))return response({error:'Unique flat string envelope required'},400);
  const execution={keyId:auth.keyId,idempotencyKey:auth.idempotencyKey,requestHash:hashHermesBody(auth.body)};
  const result=action==='review'?await deps.service.review(auth.json,auth.keyId):action==='rollback-review'?await deps.service.rollbackReview(auth.json,auth.keyId):await deps.service[action](auth.json,execution);return response(result);
 }catch(error){const conflict=!!error&&typeof error==='object'&&'status' in error&&error.status===409;return response({error:'Cleanup failed or state drifted; inspect private audit before retrying'},conflict?409:500);}
}
