import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendAdminPaymentNotification, sendSubscriptionConfirmation, sendSubscriptionRenewalConfirmation } from "@/lib/email";
import { addOneCalendarYear, formatBillingDate } from "@/lib/pricing";
import { PublicationError, publicationDate } from "@/lib/server/paid-job-publication";
import { renewalChain, resolvePaidPublicationTerm } from "@/lib/server/paid-job-term";
import { buildEndedSubscriptionAccessPatch } from "@/lib/server/subscription-expiration";

export const runtime = "nodejs";

/* ── Plan ID → tier label mapping ── */
const PLAN_TO_TIER: Record<string, string> = {
  tier1: "standard",
  tier2: "premium",
  tier3: "school",
};
const TIER_TITLES: Record<string, string> = { standard: "Standard", premium: "Premium", school: "School" };

const ONE_TIME_POSTS = new Set(["standard-post", "featured-post", "program-post"]);
const RECEIPT_QUERY_LIMIT = 2001;

function normalizeStripeSecret(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\\r\\n/g, "");
  return normalized || null;
}

function getStripe(): Stripe | null {
  const key = normalizeStripeSecret(process.env.STRIPE_SECRET_KEY);
  if (!key) return null;
  return new Stripe(key);
}

function creditFieldFor(planId: string): "featuredPostCredits" | "programPostCredits" | "standardPostCredits" {
  return planId === "featured-post" ? "featuredPostCredits" : planId === "program-post" ? "programPostCredits" : "standardPostCredits";
}

function safeDocumentId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && !value.includes("/") && value !== "." && value !== "..";
}

function paymentIntentId(value: string | { id?: string } | null | undefined): string | null {
  const id = typeof value === "string" ? value : value?.id;
  return typeof id === "string" && /^pi_[A-Za-z0-9_]+$/.test(id) ? id : null;
}

/** Annual receipts of one billing account, read inside the caller's transaction. */
async function readAnnualReceipts(db: Firestore, tx: FirebaseFirestore.Transaction, employerId: string) {
  const receipts = new Map<string, { id: string; data: Record<string, unknown>; ref: DocumentReference }>();
  for (const field of ["employerId", "orgId"]) {
    const snapshot = await tx.get(db.collection("subscriptions").where(field, "==", employerId).limit(RECEIPT_QUERY_LIMIT));
    if (snapshot.size >= RECEIPT_QUERY_LIMIT) throw new Error("Payment history requires reconciliation");
    for (const doc of snapshot.docs) receipts.set(doc.id, { id: doc.id, data: doc.data(), ref: doc.ref });
  }
  return [...receipts.values()];
}

type RevocationKind = "refunded" | "disputed";

/**
 * Full refunds and chargebacks withdraw what the payment bought: the receipt is marked,
 * an annual term it currently funds ends now, and a credit it granted is removed while
 * still unused. Published jobs are never touched. Each Stripe event is claimed once, in
 * the same transaction, like fulfillment events.
 */
async function revokePayment(db: Firestore, event: Stripe.Event, kind: RevocationKind, paymentIntent: string) {
  const now = new Date();
  const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
  const revocationRef = db.collection("stripeRevocations").doc(paymentIntent);
  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (eventSnap.exists) {
      if (eventSnap.data()?.status === "completed") return { outcome: "duplicate" as const };
      throw new Error("Legacy payment claim requires reconciliation");
    }
    const claim = {
      type: event.type, stripePaymentIntent: paymentIntent,
      stripeCreatedAt: new Date(event.created * 1000), status: "completed", processedAt: now,
    };
    const matches = await tx.get(db.collection("subscriptions").where("stripePaymentIntent", "==", paymentIntent).limit(2));
    if (matches.size > 1) throw new Error("Ambiguous payment receipt requires reconciliation");
    if (matches.empty) {
      // Fulfillment may still be retrying (or the charge is not an IOPPS checkout). Remember the
      // revocation so a later fulfillment of this payment records it without granting anything.
      const marker = await tx.get(revocationRef);
      if (!marker.exists) tx.create(revocationRef, { kind, stripeEventId: event.id, stripeEventType: event.type, createdAt: now });
      tx.create(eventRef, { ...claim, outcome: "unmatched" });
      return { outcome: "unmatched" as const };
    }
    const receiptDoc = matches.docs[0];
    const receipt = receiptDoc.data();
    if (receipt.status === "refunded" || receipt.status === "disputed") {
      tx.create(eventRef, { ...claim, outcome: "already_revoked", receiptId: receiptDoc.id });
      return { outcome: "already_revoked" as const };
    }
    const employerId = typeof receipt.employerId === "string" && receipt.employerId ? receipt.employerId : receipt.orgId;
    if (!safeDocumentId(employerId)) throw new Error("Receipt identity requires reconciliation");
    const employerRef = db.collection("employers").doc(employerId);
    const employerSnap = await tx.get(employerRef);
    const employer = employerSnap.data() ?? {};
    const writes: Array<() => void> = [];
    let creditsRemoved = 0;
    let termEnded = false;
    const flaggedRenewals: string[] = [];

    if (receipt.billingCycle === "annual") {
      const receipts = await readAnnualReceipts(db, tx, employerId);
      const termInput = { employerId, employer, receipts, now };
      let current: ReturnType<typeof resolvePaidPublicationTerm> = null;
      try { current = resolvePaidPublicationTerm(termInput); } catch (error) { if (!(error instanceof PublicationError)) throw error; }
      const nested = (employer.subscription && typeof employer.subscription === "object" ? employer.subscription : {}) as Record<string, unknown>;
      // The projection may still name this term while its evidence is ambiguous; a lapsed term is history.
      const projectedCurrent = nested.termId === receiptDoc.id && nested.status === "active" && (publicationDate(nested.subscriptionEnd)?.getTime() ?? 0) > now.getTime();
      if (current?.id === receiptDoc.id || projectedCurrent) {
        termEnded = true;
        const organizationId = typeof receipt.organizationId === "string" && receipt.organizationId ? receipt.organizationId : employerId;
        if (!safeDocumentId(organizationId)) throw new Error("Receipt organization requires reconciliation");
        const organizationRef = db.collection("organizations").doc(organizationId);
        const organizationSnap = await tx.get(organizationRef);
        const patch = buildEndedSubscriptionAccessPatch(now, kind);
        writes.push(() => tx.set(employerRef, patch, { merge: true }));
        if (organizationSnap.exists) writes.push(() => tx.set(organizationRef, { ...patch, plan: null }, { merge: true }));
      }
      // A renewal queued behind a withdrawn term needs a person to decide when it starts.
      let chain: ReturnType<typeof renewalChain> = [];
      const end = publicationDate(receipt.expiresAt);
      if (end) {
        try { chain = renewalChain(termInput, { id: receiptDoc.id, endsAt: end }); } catch (error) { if (!(error instanceof PublicationError)) throw error; }
      }
      for (const renewal of chain) {
        const ref = receipts.find(entry => entry.id === renewal.id)?.ref;
        if (ref) { flaggedRenewals.push(renewal.id); writes.push(() => tx.update(ref, { reviewRequired: "predecessor_revoked", updatedAt: now })); }
      }
    } else if (typeof receipt.plan === "string" && ONE_TIME_POSTS.has(receipt.plan)) {
      const field = creditFieldFor(receipt.plan);
      const balance = employer[field] ?? 0;
      if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Invalid credit balance requires reconciliation");
      // Credits are fungible: remove this purchase's credit only while one is unused; a
      // credit already spent on a published job stays spent and the job is untouched.
      creditsRemoved = balance > 0 ? 1 : 0;
      if (creditsRemoved) writes.push(() => tx.set(employerRef, { [field]: balance - 1, updatedAt: now }, { merge: true }));
    }

    for (const write of writes) write();
    tx.update(receiptDoc.ref, {
      status: kind, revokedAt: now, [`${kind}At`]: now, updatedAt: now,
      revocation: { kind, stripeEventId: event.id, stripeEventType: event.type, creditsRemoved, termEnded },
    });
    tx.create(eventRef, { ...claim, outcome: "revoked", receiptId: receiptDoc.id, creditsRemoved, termEnded, ...(flaggedRenewals.length ? { flaggedRenewals } : {}) });
    return { outcome: "revoked" as const, receiptId: receiptDoc.id, creditsRemoved, termEnded };
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  const webhookSecret = normalizeStripeSecret(process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe/webhook] Verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const object = event.data.object as Stripe.Charge | Stripe.Dispute;
    if (event.type === "charge.refunded") {
      const charge = object as Stripe.Charge;
      // Partial refunds are an adjustment the owner decides on; only a full refund withdraws the purchase.
      if (charge.refunded !== true) return NextResponse.json({ received: true, ignored: "partial_refund" });
    }
    const paymentIntent = paymentIntentId(object.payment_intent);
    if (!/^evt_[A-Za-z0-9_-]+$/.test(event.id)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    if (!paymentIntent) return NextResponse.json({ received: true, ignored: "no_payment_intent" });
    const kind: RevocationKind = event.type === "charge.refunded" ? "refunded" : "disputed";
    try {
      const result = await revokePayment(getAdminDb(), event, kind, paymentIntent);
      if (result.outcome === "revoked") {
        // Stripe notifies the account owner of refunds and disputes; this is the audit trail.
        console.error(`[stripe/webhook] Payment ${kind}: receipt ${result.receiptId}, credits removed ${result.creditsRemoved}, term ended ${result.termEnded}`);
      }
      return NextResponse.json({ received: true, outcome: result.outcome });
    } catch (err) {
      console.error(`[stripe/webhook] Failed to record ${kind} payment:`, err instanceof Error ? err.name : "Error");
      return NextResponse.json({ error: "Failed to process payment change" }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Delayed payment methods complete checkout before money is confirmed.
    // Do not claim the event/session until a paid fulfillment event arrives.
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, deferred: true });
    }
    const { orgId, planId, amount, gstAmount } = session.metadata ?? {};

    // Metadata is server-created and covered by Stripe's signature. Validate its
    // shape and reconcile totals without repricing older sessions at today's rate.
    const cents = (value: unknown) => typeof value === "string" && /^\d+$/.test(value)
      && Number.isSafeInteger(Number(value));
    if (!orgId || orgId.length > 128 || orgId.includes("/") || orgId === "." || orgId === ".."
      || !planId || (!Object.hasOwn(PLAN_TO_TIER, planId) && !ONE_TIME_POSTS.has(planId))
      || !/^cs_[A-Za-z0-9_-]+$/.test(session.id) || !/^evt_[A-Za-z0-9_-]+$/.test(event.id)
      || session.mode !== "payment" || session.status !== "complete" || session.currency !== "cad"
      || !cents(amount) || !cents(gstAmount) || Number(amount) <= 0
      || !Number.isSafeInteger(session.amount_total)
      || session.amount_total !== Number(amount) + Number(gstAmount)) {
      return NextResponse.json({ error: "Invalid paid checkout data" }, { status: 400 });
    }

    try {
      const db = getAdminDb();
      const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
      // Session identity is stable across completed/async-success event IDs.
      const purchaseRef = db.collection("subscriptions").doc(session.id);
      const employerRef = db.collection("employers").doc(orgId);
      const orgRef = db.collection("organizations").doc(orgId);
      const tier = Object.hasOwn(PLAN_TO_TIER, planId) ? PLAN_TO_TIER[planId] : undefined;
      const isSubscription = !!tier;
      const paymentIntent = paymentIntentId(session.payment_intent);
      const now = new Date();
      const result = await db.runTransaction(async (tx) => {
        // Read every dependency before any write; Firestore retries conflicts.
        const eventSnap = await tx.get(eventRef);
        const purchaseSnap = await tx.get(purchaseRef);
        if (eventSnap.exists) {
          if (eventSnap.data()?.status === "completed") return null;
          throw new Error("Legacy payment claim requires reconciliation");
        }
        if (purchaseSnap.exists) return null;
        // Older versions used random receipt IDs and non-atomic grants. Never
        // automatically replay an ambiguous legacy receipt into another credit.
        const legacyReceipts = await tx.get(db.collection("subscriptions")
          .where("stripeSessionId", "==", session.id).limit(1));
        if (!legacyReceipts.empty) throw new Error("Legacy payment receipt requires reconciliation");
        const revocationSnap = paymentIntent ? await tx.get(db.collection("stripeRevocations").doc(paymentIntent)) : null;
        const revocation = revocationSnap?.exists ? revocationSnap.data() : null;
        const employerSnap = await tx.get(employerRef);
        const employer = employerSnap.data() ?? {};
        const orgSnap = isSubscription ? await tx.get(orgRef) : null;
        const legacyOrg = isSubscription && !orgSnap?.exists
          ? await tx.get(db.collection("organizations").where("employerId", "==", orgId).limit(2))
          : null;
        if (legacyOrg && legacyOrg.size > 1) throw new Error('Ambiguous organization mapping requires reconciliation');
        const target = orgSnap?.exists ? orgRef : legacyOrg?.docs[0]?.ref;

        // A paid annual term is never replaced or shortened by another annual payment: the
        // new year starts where the current paid term (and any renewal already paid) ends.
        // Ambiguous paid history throws and is retried after reconciliation.
        let startsAt = now;
        let renewalOf: { id: string; tier: string } | null = null;
        if (isSubscription) {
          const receipts = await readAnnualReceipts(db, tx, orgId);
          const termInput = { employerId: orgId, employer, receipts, now };
          const current = resolvePaidPublicationTerm(termInput);
          if (current) {
            const last = renewalChain(termInput, current).at(-1) ?? current;
            startsAt = last.endsAt;
            renewalOf = { id: last.id, tier: last.tier };
          }
        }
        const expiresAt = isSubscription ? addOneCalendarYear(startsAt) : null;
        const revokedKind = revocation?.kind === "refunded" || revocation?.kind === "disputed" ? revocation.kind as RevocationKind : null;

        tx.create(purchaseRef, {
          orgId, plan: planId, status: revokedKind ?? "active",
          ...(isSubscription ? { employerId: orgId, organizationId: target?.id ?? orgId, startsAt } : {}),
          ...(renewalOf ? { renewalOf: renewalOf.id, ...(renewalOf.tier !== tier ? { planChange: true, reviewRequired: "plan_change_during_term" } : {}) } : {}),
          amount: amount ? Number(amount) / 100 : 0,
          gstAmount: gstAmount ? Number(gstAmount) / 100 : 0,
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          billingCycle: isSubscription ? "annual" : "one-time",
          stripeSessionId: session.id,
          stripePaymentIntent: paymentIntent,
          kind: isSubscription ? "subscription" : "purchase",
          createdAt: now, expiresAt,
          ...(revokedKind ? { revokedAt: now, [`${revokedKind}At`]: now, revocation: { kind: revokedKind, stripeEventId: revocation?.stripeEventId ?? null, creditsRemoved: 0, termEnded: false, beforeFulfillment: true } } : {}),
        });
        if (revokedKind) {
          // Refunded or disputed before fulfillment: record the payment, grant nothing.
        } else if (tier && !renewalOf) {
          const access = {
            plan: tier, subscriptionTier: tier, subscriptionStatus: "active",
            subscriptionStart: startsAt, billingStartAt: startsAt, subscriptionEnd: expiresAt, updatedAt: now,
            bonusAccessGrantedAt: FieldValue.delete(), bonusAccessEndsAt: FieldValue.delete(), bonusAccessReason: FieldValue.delete(),
            subscription: { tier, status: 'active', billingStartAt: startsAt, subscriptionEnd: expiresAt, termId: session.id },
            ...(tier === 'standard' ? { jobPostingUsage: { termId: session.id, used: 0 } } : {}),
          };
          // Replace current-term maps, rather than recursively retaining old manual/grant evidence.
          tx.set(employerRef, access, { mergeFields: Object.keys(access) });
          if (target) tx.set(target, access, { mergeFields: Object.keys(access) });
        } else if (tier) {
          // Renewal: the current projection keeps describing the current term. The receipt takes
          // over when that term ends (publication resolves it; the daily check rewrites the projection).
        } else if (ONE_TIME_POSTS.has(planId)) {
          const creditField = creditFieldFor(planId);
          const current = employer[creditField] ?? 0;
          if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(current + 1)) {
            throw new Error("Invalid credit balance requires reconciliation");
          }
          tx.set(employerRef, { [creditField]: current + 1, updatedAt: now }, { merge: true });
        }
        tx.create(eventRef, {
          type: event.type, stripeSessionId: session.id,
          stripeCreatedAt: new Date(event.created * 1000),
          status: "completed", processedAt: now,
          ...(revokedKind ? { outcome: revokedKind } : renewalOf ? { outcome: "renewal_scheduled" } : {}),
        });
        return { employer, revokedKind, renewal: renewalOf ? { ...renewalOf, startsAt, expiresAt: expiresAt! } : null };
      });
      if (!result) return NextResponse.json({ received: true, duplicate: true });

      // External email is deliberately outside the retried transaction.
      // Email failure must never undo/repeat a committed entitlement grant.
      const { employer, revokedKind, renewal } = result;
      const planName = tier ? (TIER_TITLES[tier] || tier) : planId;
      const notification = {
        email: String(employer.contactEmail || employer.email || session.customer_email || ""),
        contactName: String(employer.contactName || ""), orgName: String(employer.name || orgId),
        planName,
        amount: amount ? Number(amount) / 100 : 0, gst: gstAmount ? Number(gstAmount) / 100 : 0,
      };
      const adminPlanName = revokedKind ? `${planName} — ${revokedKind} before fulfillment; nothing granted`
        : renewal ? `${planName} — renewal starting ${formatBillingDate(renewal.startsAt)}${renewal.tier !== tier ? ` after the current ${TIER_TITLES[renewal.tier] || renewal.tier} term (plan change needs review)` : ""}`
          : planName;
      // The confirmation says the plan "is now active"; a scheduled renewal is not active yet, so
      // it gets its own confirmation with the new term's dates. A different-tier payment queued
      // during a term waits for the owner's review (flagged in the admin notification).
      const customerConfirmation = !tier || revokedKind || !notification.email ? null
        : !renewal ? () => sendSubscriptionConfirmation(notification)
          : renewal.tier === tier ? () => sendSubscriptionRenewalConfirmation({ ...notification, startsAt: renewal.startsAt, endsAt: renewal.expiresAt })
            : null;
      await Promise.allSettled([
        Promise.resolve().then(() => sendAdminPaymentNotification({ ...notification, planName: adminPlanName, orgId })),
        ...(customerConfirmation ? [Promise.resolve().then(customerConfirmation)] : []),
      ]);
    } catch (err) {
      console.error("[stripe/webhook] Failed to process payment:", err instanceof Error ? err.name : "Error");
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
