import {jobCleanupRoute} from '@/lib/server/hermes-job-cleanup-route';
import {refreshPublicJobs} from '@/lib/employer-job-cache';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// A committed cleanup closes or retires public jobs.
export async function POST(request:Request):Promise<Response>{const response=await jobCleanupRoute(request,'apply');if(response.ok)refreshPublicJobs();return response;}
