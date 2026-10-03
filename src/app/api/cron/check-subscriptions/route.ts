import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { expireSubscriptionAtomically } from '@/lib/server/subscription-expiration';
import { refreshPublicPartners } from '@/lib/public-partner-cache';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Candidate reads are advisory; expiry and account changes commit in one transaction per
 * receipt. A receipt that needs reconciliation is logged and reported without stopping the
 * rest: the run still answers 500 so the failure stays visible in cron monitoring.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({error:'Unauthorized'},{status:401});
  }
  let candidates;
  const now = new Date();
  const db = getAdminDb();
  try {
    candidates = await db.collection('subscriptions').where('status','==','active').get();
  } catch {
    return NextResponse.json({error:'Failed to check subscriptions'},{status:500});
  }
  let expired = 0;
  const failures: { id: string; error: string }[] = [];
  for (const candidate of candidates.docs) {
    try {
      if (await expireSubscriptionAtomically(db,candidate.id,now)) expired++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[cron/check-subscriptions] receipt ${candidate.id} was not processed: ${message}`);
      failures.push({ id: candidate.id, error: message });
    }
  }
  // An ended paid term takes the organization off the partner cards.
  if (expired) refreshPublicPartners();
  return NextResponse.json(
    { checked: candidates.size, expired, failed: failures.length, failures, timestamp: now.toISOString() },
    { status: failures.length ? 500 : 200 },
  );
}
