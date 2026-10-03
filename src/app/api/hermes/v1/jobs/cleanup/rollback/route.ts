import {jobCleanupRoute} from '@/lib/server/hermes-job-cleanup-route';
import {refreshPublicJobs} from '@/lib/employer-job-cache';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// A committed rollback restores public jobs.
export async function POST(request:Request):Promise<Response>{const response=await jobCleanupRoute(request,'rollback');if(response.ok)refreshPublicJobs();return response;}
