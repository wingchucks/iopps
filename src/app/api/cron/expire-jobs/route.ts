import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { expirationPatch, isJobRecordExpired } from '@/lib/server/job-expiration';
export const runtime = 'nodejs';
export const maxDuration = 300;
/** Candidate enumeration is advisory; re-evaluate every decision under the write transaction. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const db = getAdminDb();
    const now = new Date();
    const counts = {closedPosts:0,closedJobs:0,synchronizedMirrors:0};
    for (const collection of ['posts','jobs'] as const) {
      const snapshots = await Promise.all([
        db.collection(collection).where('status','==','active').get(),
        db.collection(collection).where('active','==',true).get(),
      ]);
      const docs = new Map(snapshots.flatMap(s=>s.docs).map(d=>[d.id,d]));
      for (const candidate of docs.values()) {
        const outcome = await db.runTransaction(async tx => {
          const doc = await tx.get(candidate.ref);
          if (!doc.exists) return null;
          const job = doc.data()!;
          if (collection === 'posts' && job.type !== 'job') return null;
          const status = String(job.status || '').trim().toLowerCase();
          if (['archived','cancelled','canceled','closed','completed','deleted','draft','expired','inactive','removed'].includes(status)) {
            if (job.active !== true) return null;
            tx.update(doc.ref,{active:false,updatedAt:now});
            return 'synchronizedMirrors' as const;
          }
          if (job.active === false) {
            if (status !== 'active') return null;
            tx.update(doc.ref,{status:'inactive',updatedAt:now});
            return 'synchronizedMirrors' as const;
          }
          if (!isJobRecordExpired(job,now)) return null;
          tx.update(doc.ref,expirationPatch('closing_date',now));
          return collection === 'posts' ? 'closedPosts' as const : 'closedJobs' as const;
        });
        if (outcome) counts[outcome]++;
      }
    }
    return NextResponse.json({ok:true,...counts,checkedAt:now.toISOString()});
  } catch {
    return NextResponse.json({error:'Failed to expire jobs'},{status:500});
  }
}
