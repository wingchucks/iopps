import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { annualReceiptTerm } from './paid-job-term.ts';

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

/** A refund or chargeback ends the annual term it funded now (merged like an expiry). */
export function buildEndedSubscriptionAccessPatch(now: Date, reason: "refunded" | "disputed") {
  const expired = buildExpiredSubscriptionAccessPatch(now);
  return {
    ...expired,
    subscriptionEnd: now,
    subscription: { ...expired.subscription, subscriptionEnd: now, endedAt: now, endedReason: reason },
  };
}

/** Projection for a paid renewal that has taken over from the term it renewed. */
export function buildRenewalAccessPatch(renewal: { id: string; tier: string; startsAt: Date; endsAt: Date }, now: Date) {
  return {
    plan: renewal.tier, subscriptionTier: renewal.tier, subscriptionStatus: "active",
    subscriptionStart: renewal.startsAt, billingStartAt: renewal.startsAt, subscriptionEnd: renewal.endsAt, updatedAt: now,
    bonusAccessGrantedAt: FieldValue.delete(), bonusAccessEndsAt: FieldValue.delete(), bonusAccessReason: FieldValue.delete(),
    subscription: { tier: renewal.tier, status: "active", billingStartAt: renewal.startsAt, subscriptionEnd: renewal.endsAt, termId: renewal.id },
  };
}

/** Recheck candidates and serialize expiry with the employer touched by paid fulfillment. */
/**
 * Whether a receipt's expiresAt has passed. One-time posting purchases have no expiry and
 * are never due; the expiry transaction applies the same test to the document it re-reads.
 */
export function isSubscriptionExpiryDue(expiresAt: unknown, now: Date): boolean {
  const expiry = subscriptionExpiryTime(expiresAt);
  return Number.isFinite(expiry) && expiry <= now.getTime();
}

/** expiresAt as epoch milliseconds (Timestamp, Date, string or number), or NaN when missing. */
function subscriptionExpiryTime(expiresAt: unknown): number {
  const value = expiresAt as { toDate?: () => Date } | string | number | Date | null | undefined;
  const rawExpiry = (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') ? value.toDate() : value;
  return rawExpiry ? new Date(rawExpiry as string | number | Date).getTime() : NaN;
}

export async function expireSubscriptionAtomically(db: Firestore, id: string, now: Date): Promise<boolean> {
  return db.runTransaction(async tx => {
    const ref = db.collection('subscriptions').doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return false;
    const data = snapshot.data()!;
    if (data.status !== 'active' || !isSubscriptionExpiryDue(data.expiresAt, now)) return false;
    const expiry = subscriptionExpiryTime(data.expiresAt);
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
    // A paid renewal bought before this term ended starts exactly at its end: it now
    // becomes the projected current term (replacing the map, like paid fulfillment).
    const renewals = postPlans.has(data.plan) ? [] : active.docs
      .filter(doc => doc.id !== id && doc.data().renewalOf === id && subscriptionMatchesExpirationTargets(doc.data(),targets))
      .map(doc => annualReceiptTerm({id:doc.id,data:doc.data()},targets.employerId))
      .filter(term => term !== null && term.startsAt.getTime() === expiry && term.startsAt <= now && term.endsAt > now);
    if (renewals.length > 1) throw new Error('Overlapping annual renewals require reconciliation');
    tx.update(ref,{status:'expired',expiredAt:now});
    if (renewals[0]) {
      const patch = buildRenewalAccessPatch(renewals[0], now);
      tx.set(employerRef,patch,{mergeFields:Object.keys(patch)});
      if (organization.exists) tx.set(organizationRef,patch,{mergeFields:Object.keys(patch)});
    } else if (!hasOther && !postPlans.has(data.plan)) {
      const patch = buildExpiredSubscriptionAccessPatch(now);
      tx.set(employerRef,patch,{merge:true});
      if (organization.exists) tx.set(organizationRef,{...patch,plan:null},{merge:true});
    }
    return true;
  });
}
