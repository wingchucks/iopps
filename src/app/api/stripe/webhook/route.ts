import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendAdminPaymentNotification, sendSubscriptionConfirmation } from "@/lib/email";

export const runtime = "nodejs";

/* ── Plan ID → tier label mapping ── */
const PLAN_TO_TIER: Record<string, string> = {
  tier1: "standard",
  tier2: "premium",
  tier3: "school",
};

const ONE_TIME_POSTS = new Set(["standard-post", "featured-post", "program-post"]);

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
      const now = new Date();
      const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
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
        const employerSnap = await tx.get(employerRef);
        const employer = employerSnap.data() ?? {};
        const orgSnap = isSubscription ? await tx.get(orgRef) : null;
        const legacyOrg = isSubscription && !orgSnap?.exists
          ? await tx.get(db.collection("organizations").where("employerId", "==", orgId).limit(2))
          : null;
        if (legacyOrg && legacyOrg.size > 1) throw new Error('Ambiguous organization mapping requires reconciliation');
        const target = orgSnap?.exists ? orgRef : legacyOrg?.docs[0]?.ref;

        tx.create(purchaseRef, {
          orgId, plan: planId, status: "active",
          ...(isSubscription ? { employerId: orgId, organizationId: target?.id ?? orgId } : {}),
          amount: amount ? Number(amount) / 100 : 0,
          gstAmount: gstAmount ? Number(gstAmount) / 100 : 0,
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          billingCycle: isSubscription ? "annual" : "one-time",
          stripeSessionId: session.id,
          stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          kind: isSubscription ? "subscription" : "purchase",
          createdAt: now, expiresAt: isSubscription ? expiresAt : null,
        });
        if (tier) {
          const access = {
            plan: tier, subscriptionTier: tier, subscriptionStatus: "active",
            subscriptionStart: now, subscriptionEnd: expiresAt, updatedAt: now,
            subscription: { tier, status: 'active', billingStartAt: now, subscriptionEnd: expiresAt },
          };
          tx.set(employerRef, access, { merge: true });
          if (target) tx.set(target, access, { merge: true });
        } else if (ONE_TIME_POSTS.has(planId)) {
          const creditField = planId === "featured-post" ? "featuredPostCredits"
            : planId === "program-post" ? "programPostCredits" : "standardPostCredits";
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
        });
        return employer;
      });
      if (!result) return NextResponse.json({ received: true, duplicate: true });

      // External email is deliberately outside the retried transaction.
      // Email failure must never undo/repeat a committed entitlement grant.
      const notification = {
        email: String(result.contactEmail || result.email || session.customer_email || ""),
        contactName: String(result.contactName || ""), orgName: String(result.name || orgId),
        planName: tier ? ({ standard: "Standard", premium: "Premium", school: "School" }[tier] || tier) : planId,
        amount: amount ? Number(amount) / 100 : 0, gst: gstAmount ? Number(gstAmount) / 100 : 0,
      };
      await Promise.allSettled([
        Promise.resolve().then(() => sendAdminPaymentNotification({ ...notification, orgId })),
        ...(tier && notification.email ? [Promise.resolve().then(() => sendSubscriptionConfirmation(notification))] : []),
      ]);
    } catch (err) {
      console.error("[stripe/webhook] Failed to process payment:", err instanceof Error ? err.name : "Error");
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
