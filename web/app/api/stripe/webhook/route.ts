import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const productType = session.metadata?.productType;

      if (!orgId) break;

      if (session.mode === "subscription") {
        // Subscription checkout
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as { id: string; current_period_end: number };
        const tier = productType === "TIER2" ? "tier2" : productType === "SCHOOL" ? "school" : "tier1";

        await adminDb.collection("organizations").doc(orgId).update({
          "subscription.tier": tier,
          "subscription.stripeCustomerId": session.customer as string,
          "subscription.stripeSubscriptionId": subscription.id,
          "subscription.currentPeriodEnd": new Date(subscription.current_period_end * 1000),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // One-off payment
        await adminDb.collection("payments").add({
          orgId,
          stripeSessionId: session.id,
          amount: session.amount_total || 0,
          currency: session.currency || "cad",
          productType: productType || "unknown",
          status: "completed",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as { id: string; current_period_end: number };
      const orgSnap = await adminDb.collection("organizations")
        .where("subscription.stripeSubscriptionId", "==", subscription.id).limit(1).get();

      if (!orgSnap.empty) {
        await orgSnap.docs[0].ref.update({
          "subscription.currentPeriodEnd": new Date(subscription.current_period_end * 1000),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as { id: string };
      const orgSnap = await adminDb.collection("organizations")
        .where("subscription.stripeSubscriptionId", "==", subscription.id).limit(1).get();

      if (!orgSnap.empty) {
        await orgSnap.docs[0].ref.update({
          "subscription.tier": "none",
          "subscription.stripeSubscriptionId": null,
          "subscription.currentPeriodEnd": null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const orgSnap = await adminDb.collection("organizations")
        .where("subscription.stripeCustomerId", "==", customerId).limit(1).get();

      if (!orgSnap.empty) {
        // Create notification for admin
        await adminDb.collection("notifications").add({
          uid: "admin",
          type: "payment_failed",
          title: "Payment Failed",
          body: `Payment failed for ${orgSnap.docs[0].data().name}`,
          link: "/admin/payments",
          read: false,
          emailSent: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
