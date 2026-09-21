import {jobCleanupRoute} from '@/lib/server/hermes-job-cleanup-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{return jobCleanupRoute(request,'rollback-review');}
