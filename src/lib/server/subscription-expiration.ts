import type { Firestore } from 'firebase-admin/firestore';

export function resolveSubscriptionExpirationTargets(subscription: {
  employerId?: unknown;
  orgId?: unknown;
  organizationId?: unknown;
}): { employerId: string; organizationId: string } {
  const legacyOrgId = typeof subscription.orgId === "string" ? subscription.orgId : "";
  const employerId = typeof subscription.employerId === "string" && subscription.employerId
    ? subscription.employerId
    : legacyOrgId;
  const organizationId = typeof subscription.organizationId === "string" && subscription.organizationId
    ? subscription.organizationId
    : legacyOrgId;
  return { employerId, organizationId };
}

export function subscriptionMatchesExpirationTargets(
  subscription: { employerId?: unknown; orgId?: unknown; organizationId?: unknown },
  targets: { employerId: string; organizationId: string },
): boolean {
  const targetIds = new Set([targets.employerId, targets.organizationId].filter(Boolean));
  return [subscription.employerId, subscription.orgId, subscription.organizationId]
    .some((value) => typeof value === "string" && targetIds.has(value));
}

export function buildExpiredSubscriptionAccessPatch(now: Date) {
  return {
    plan: "free",
    subscriptionTier: "free",
    subscriptionStatus: "expired",
    subscription: {
      tier: "free",
      status: "expired",
    },
    updatedAt: now,
  };
}

/** Recheck candidates and serialize expiry with the employer touched by paid fulfillment. */
export async function expireSubscriptionAtomically(db: Firestore, id: string, now: Date): Promise<boolean> {
  return db.runTransaction(async tx => {
    const ref = db.collection('subscriptions').doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return false;
    const data = snapshot.data()!;
    const rawExpiry = data.expiresAt?.toDate?.() ?? data.expiresAt;
    const expiry = rawExpiry ? new Date(rawExpiry).getTime() : NaN;
    if (data.status !== 'active' || !Number.isFinite(expiry) || expiry > now.getTime()) return false;
    const targets = resolveSubscriptionExpirationTargets(data);
    if ([targets.employerId, targets.organizationId].some(value => !value || value.includes('/'))) throw new Error('Subscription identity requires reconciliation');
    const employerRef = db.collection('employers').doc(targets.employerId);
    await tx.get(employerRef);
    let organizationRef = db.collection('organizations').doc(targets.organizationId);
    let organization = await tx.get(organizationRef);
    if (data.organizationId === undefined) {
      const linked = await tx.get(db.collection('organizations').where('employerId','==',targets.employerId).limit(2));
      const choices = new Map<string, FirebaseFirestore.DocumentSnapshot>(linked.docs.map(doc => [doc.id,doc]));
      if (organization.exists) choices.set(organization.id,organization);
      if (choices.size > 1) throw new Error('Ambiguous organization mapping requires reconciliation');
      const target = [...choices.values()][0];
      if (target) { organization = target; organizationRef = target.ref; targets.organizationId = target.id; }
    } else if (typeof data.organizationId !== 'string' || !data.organizationId) {
      throw new Error('Invalid organization grant target');
    }
    const active = await tx.get(db.collection('subscriptions').where('status','==','active'));
    const postPlans = new Set(['standard-post', 'featured-post', 'program-post']);
    const hasOther = active.docs.some(doc => {
      const other = doc.data();
      if (doc.id === id || !subscriptionMatchesExpirationTargets(other,targets) || postPlans.has(other.plan)) return false;
      const raw = other.expiresAt?.toDate?.() ?? other.expiresAt;
      if (!raw) return true;
      const end = new Date(raw).getTime();
      if (!Number.isFinite(end)) throw new Error('Subscription expiry requires reconciliation');
      return end > now.getTime();
    });
    tx.update(ref,{status:'expired',expiredAt:now});
    if (!hasOther && !postPlans.has(data.plan)) {
      const patch = buildExpiredSubscriptionAccessPatch(now);
      tx.set(employerRef,patch,{merge:true});
      if (organization.exists) tx.set(organizationRef,{...patch,plan:null},{merge:true});
    }
    return true;
  });
}
