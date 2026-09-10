import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { buildFeaturedJobSummary, evaluateFeaturedActivation } from './featured-job-entitlements';

/** Admin privilege does not silently grant a paid placement. Grants use existing explicit billing administration. */
export async function activateAdminJob(db: Firestore, jobId: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try { return await activateAdminJobOnce(db, jobId); }
    catch (error) {
      const failure = error as { code?: number; message?: string };
      if (attempt >= 2 || failure?.code !== 3 || !failure.message?.includes('Transaction is invalid or closed.')) throw error;
    }
  }
}

async function activateAdminJobOnce(db: Firestore, jobId: string): Promise<string | null> {
  return db.runTransaction(async tx => {
    const jobRef = db.collection('jobs').doc(jobId);
    const job = await tx.get(jobRef);
    if (!job.exists) return 'Job not found';
    const data = job.data()!;
    for (const field of ['featured', 'featuredCreditConsumed']) {
      if (data[field] !== undefined && typeof data[field] !== 'boolean') return 'Invalid featured placement record';
    }
    if (data.status === 'deleted' || data.deletedAt) return 'Deleted jobs cannot be activated';
    const mirrorRef = db.collection('posts').doc(jobId);
    const mirror = await tx.get(mirrorRef);
    if (mirror.exists && mirror.data()?.type === 'job') {
      const other = mirror.data()!;
      for (const field of ['featured','featuredCreditConsumed']) {
        if ((other[field] !== undefined && typeof other[field] !== 'boolean') || (other[field] === true) !== (data[field] === true)) return 'Conflicting job placement mirrors require review';
      }
    }
    let consumed = data.featuredCreditConsumed === true;
    if (data.featured === true) {
      const owner = data.employerId || data.orgId || data.authorId;
      if (typeof owner !== 'string' || !owner || owner.includes('/')) return 'Featured job ownership requires review';
      const employerRef = db.collection('employers').doc(owner);
      const employer = await tx.get(employerRef);
      if (!employer.exists) return 'Featured employer not found';
      const account = employer.data()!;
      const credits = account.featuredPostCredits ?? 0;
      if (!Number.isSafeInteger(credits) || credits < 0) return 'Invalid credit balance requires reconciliation';
      const snapshots = await Promise.all(['jobs','posts'].flatMap(collection => ['employerId','orgId','authorId'].map(field => tx.get(db.collection(collection).where(field,'==',owner)))));
      const records = new Map<string, FirebaseFirestore.DocumentData>();
      // Legacy records first, then canonical records, including closed tombstones.
      for (const snapshot of [...snapshots.slice(3), ...snapshots.slice(0,3)]) {
        for (const record of snapshot.docs) if (record.ref.parent.id === 'jobs' || record.data().type === 'job') records.set(record.id,record.data());
      }
      const active = [...records].filter(([id,record]) => id !== jobId && record.featured === true && record.active !== false && ['active','published'].includes(String(record.status ?? 'active'))).length;
      const decision = evaluateFeaturedActivation({requestedActiveFeatured:true,existingActiveFeatured:false,existingFeaturedCreditConsumed:consumed,activeFeaturedCountExcludingCurrent:active,summary:buildFeaturedJobSummary({plan:account.plan,subscriptionTier:account.subscriptionTier,featuredJobsUsed:active,featuredPostCredits:credits})});
      if (!decision.allowed) return decision.reason ?? 'Featured entitlement required';
      if (decision.consumeCredit) {
        tx.update(employerRef,{featuredPostCredits:credits-1,updatedAt:FieldValue.serverTimestamp()});
        consumed = true;
      }
    }
    const patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {active:true,status:'active',updatedAt:FieldValue.serverTimestamp()};
    if (consumed) { patch.featuredCreditConsumed = true; if (!data.featuredCreditConsumedAt) patch.featuredCreditConsumedAt = FieldValue.serverTimestamp(); }
    tx.update(jobRef,patch);
    if (mirror.exists && mirror.data()?.type === 'job') tx.update(mirrorRef,patch);
    return null;
  });
}
