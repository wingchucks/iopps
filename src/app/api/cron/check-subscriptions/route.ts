import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { expireSubscriptionAtomically } from '@/lib/server/subscription-expiration';
export const runtime = 'nodejs';
export const maxDuration = 300;

/** Candidate reads are advisory; expiry and account changes commit in one transaction. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({error:'Unauthorized'},{status:401});
  }
  try {
    const db = getAdminDb();
    const now = new Date();
    const candidates = await db.collection('subscriptions').where('status','==','active').get();
    let expired = 0;
    for (const candidate of candidates.docs) {
      if (await expireSubscriptionAtomically(db,candidate.id,now)) expired++;
    }
    return NextResponse.json({checked:candidates.size,expired,timestamp:now.toISOString()});
  } catch {
    return NextResponse.json({error:'Failed to check subscriptions'},{status:500});
  }
}
