import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment not configured" },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
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

    if (orgId && planId) {
      try {
        const db = getAdminDb();
        const now = new Date();
        const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        await db.collection("subscriptions").add({
          orgId,
          plan: planId,
          status: "active",
          amount: amount ? Number(amount) / 100 : 0,
          gstAmount: gstAmount ? Number(gstAmount) / 100 : 0,
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          billingCycle: planId.includes("post") ? "one-time" : "annual",
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent,
          createdAt: now,
          expiresAt,
        });

        console.log(`[stripe/webhook] Subscription created for org ${orgId}, plan ${planId}`);
      } catch (err) {
        console.error("[stripe/webhook] Failed to create subscription:", err);
        return NextResponse.json(
          { error: "Failed to process payment" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
