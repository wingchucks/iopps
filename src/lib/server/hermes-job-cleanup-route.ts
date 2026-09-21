import {getAdminDb} from '@/lib/firebase-admin';
import {IOPPS_HERMES_ADMIN_PUBLIC_KEYS} from './hermes-admin-public-key';
import {deriveHermesAdminReviewSecret} from './hermes-admin-request';
import {createFirebaseHermesFirestorePort,createHermesFirestoreAdapter} from './hermes-firestore-adapter';
import {createNativeJobCleanupPort} from './hermes-job-cleanup-firestore';
import {createJobCleanup} from './hermes-job-cleanup';
import {createAdpCleanupProvider} from './hermes-job-cleanup-provider';
import {handleJobCleanupRequest,type CleanupAction} from './hermes-job-cleanup-api';
/** Registering a normal Hermes key never implicitly grants cleanup privileges. */
export async function jobCleanupRoute(request:Request,action:CleanupAction):Promise<Response>{
 try{
  const cleanupKeys=(process.env.HERMES_JOB_CLEANUP_KEY_IDS??'').split(',').map(k=>k.trim()).filter(Boolean);
  if(!cleanupKeys.length)return Response.json({error:'Job cleanup is not enabled'},{status:503,headers:{'Cache-Control':'no-store'}});
  const db=getAdminDb();
  return await handleJobCleanupRequest(request,action,{
   publicKeys:IOPPS_HERMES_ADMIN_PUBLIC_KEYS,cleanupKeys,
   consumeNonce:createHermesFirestoreAdapter(createFirebaseHermesFirestorePort(db)).consumeNonce,
   service:createJobCleanup(createNativeJobCleanupPort(db),{secret:deriveHermesAdminReviewSecret(),provider:createAdpCleanupProvider()}),
  });
 }catch{return Response.json({error:'Job cleanup unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
