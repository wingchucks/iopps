import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSubscriptionConfirmation } from "@/lib/email";

/* ── Plan ID → tier label mapping ── */
const PLAN_TO_TIER: Record<string, string> = {
  tier1: "standard",
  tier2: "premium",
  tier3: "school",
};

const ONE_TIME_POSTS = new Set(["standard-post", "featured-post", "program-post"]);

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orgId, planId, amount, gstAmount } = session.metadata ?? {};

    if (!orgId || !planId) {
      console.error("[stripe/webhook] Missing metadata — orgId:", orgId, "planId:", planId);
      return NextResponse.json({ received: true });
    }

    try {
      const db = getAdminDb();
      const now = new Date();
      const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      const tier = PLAN_TO_TIER[planId];
      const isSubscription = !!tier;
      const isOneTimePost = ONE_TIME_POSTS.has(planId);

      // 1. Record subscription/purchase
      await db.collection("subscriptions").add({
        orgId,
        plan: planId,
        status: "active",
        amount: amount ? Number(amount) / 100 : 0,
        gstAmount: gstAmount ? Number(gstAmount) / 100 : 0,
        totalAmount: session.amount_total ? session.amount_total / 100 : 0,
        billingCycle: isSubscription ? "annual" : "one-time",
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        createdAt: now,
        expiresAt: isSubscription ? expiresAt : null,
      });

      if (isSubscription) {
        // 2a. Update employers collection
        const employerRef = db.collection("employers").doc(orgId);
        await employerRef.set({
          plan: tier,
          subscriptionTier: tier,
          subscriptionStatus: "active",
          subscriptionStart: now,
          subscriptionEnd: expiresAt,
          updatedAt: now,
        }, { merge: true });

        // 2b. Update organizations collection (keyed by orgId = UID for new signups)
        // Also try to find by slug in case it differs
        const orgRef = db.collection("organizations").doc(orgId);
        const orgSnap = await orgRef.get();
        if (orgSnap.exists) {
          await orgRef.set({ plan: tier, subscriptionTier: tier, updatedAt: now }, { merge: true });
        } else {
          // Try to find org by employerId field
          const orgQuery = await db.collection("organizations")
            .where("employerId", "==", orgId)
            .limit(1)
            .get();
          if (!orgQuery.empty) {
            await orgQuery.docs[0].ref.set({ plan: tier, subscriptionTier: tier, updatedAt: now }, { merge: true });
          }
        }

        console.log(`[stripe/webhook] ✅ Activated ${tier} plan for org ${orgId}`);

        // Send confirmation email (non-blocking)
        const empSnap = await db.collection("employers").doc(orgId).get();
        const empEmail = empSnap.data()?.contactEmail || empSnap.data()?.email;
        const empContact = empSnap.data()?.contactName || "";
        const empName = empSnap.data()?.name || "";
        const planNames: Record<string, string> = { standard: "Standard", premium: "Premium", school: "School" };
        if (empEmail) {
          sendSubscriptionConfirmation({
            email: empEmail,
            contactName: empContact,
            orgName: empName,
            planName: planNames[tier] || tier,
            amount: amount ? Number(amount) / 100 : 0,
            gst: gstAmount ? Number(gstAmount) / 100 : 0,
          }).catch(() => {});
        }
      } else if (isOneTimePost) {
        // 2c. Add post credits to employer
        const creditField =
          planId === "featured-post" ? "featuredPostCredits" :
          planId === "program-post" ? "programPostCredits" :
          "standardPostCredits";

        const employerRef = db.collection("employers").doc(orgId);
        const snap = await employerRef.get();
        const current = snap.exists ? (snap.data()?.[creditField] ?? 0) : 0;
        await employerRef.set({ [creditField]: current + 1, updatedAt: now }, { merge: true });

        console.log(`[stripe/webhook] ✅ Added 1 ${planId} credit for org ${orgId}`);
      }
    } catch (err) {
      console.error("[stripe/webhook] Failed to process payment:", err);
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
