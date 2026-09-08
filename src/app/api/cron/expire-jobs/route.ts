import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { expirationPatch, hasJobExpired } from '@/lib/server/job-expiration';
export const runtime = 'nodejs';
export const maxDuration = 300;
/** Daily expiry hides jobs from public listings while retaining application references. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const db = getAdminDb();
    const now = new Date();
    const counts = {closedPosts:0,closedJobs:0};
    for (const collection of ['posts','jobs'] as const) {
      const snapshots = await Promise.all([
        db.collection(collection).where('status','==','active').get(),
        db.collection(collection).where('active','==',true).get(),
      ]);
      const docs = new Map(snapshots.flatMap(s=>s.docs).map(d=>[d.id,d]));
      const expired = [...docs.values()].filter(d=>{
        const job=d.data();
        if(collection==='posts' && job.type!=='job') return false;
        return hasJobExpired(job.closingDate || job.deadline || job.expiresAt,now);
      });
      for(let start=0;start<expired.length;start+=400){
        const batch=db.batch();
        for(const doc of expired.slice(start,start+400))batch.update(doc.ref,expirationPatch('closing_date',now));
        await batch.commit();
      }
      counts[collection==='posts'?'closedPosts':'closedJobs']=expired.length;
    }
    return NextResponse.json({ok:true,...counts,checkedAt:now.toISOString()});
  }catch(err){
    console.error('[expire-jobs] Error:',err);
    return NextResponse.json({error:'Failed to expire jobs'},{status:500});
  }
}
