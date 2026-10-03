import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { expireSubscriptionAtomically, isSubscriptionExpiryDue } from '@/lib/server/subscription-expiration';
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
  // Only receipts whose expiry has passed start a transaction (which re-checks it). Active
  // one-time posting purchases have no expiry and stay active for good, so without this
  // filter every past purchase would cost a transaction on every run.
  const due = candidates.docs.filter(candidate => isSubscriptionExpiryDue(candidate.data().expiresAt, now));
  for (const candidate of due) {
    try {
      if (await expireSubscriptionAtomically(db,candidate.id,now)) expired++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[cron/check-subscriptions] receipt ${candidate.id} was not processed: ${message}`);
      failures.push({ id: candidate.id, error: message });
    }
  }
  return NextResponse.json(
    { checked: candidates.size, due: due.length, expired, failed: failures.length, failures, timestamp: now.toISOString() },
    { status: failures.length ? 500 : 200 },
  );
}
