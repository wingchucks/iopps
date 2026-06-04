import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/api-auth";
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS, type BillingPlanId } from "@/lib/pricing";

export const runtime = "nodejs";

/* ── Plan → Stripe price mapping ── */
const PLAN_PRICES: Record<BillingPlanId, { amount: number; name: string; mode: Stripe.Checkout.SessionCreateParams.Mode }> = {
  tier1: { amount: SUBSCRIPTION_PLANS.tier1.amount * 100, name: `${SUBSCRIPTION_PLANS.tier1.title} Plan (Annual)`, mode: "payment" },
  tier2: { amount: SUBSCRIPTION_PLANS.tier2.amount * 100, name: `${SUBSCRIPTION_PLANS.tier2.title} Plan (Annual)`, mode: "payment" },
  tier3: { amount: SUBSCRIPTION_PLANS.tier3.amount * 100, name: `${SUBSCRIPTION_PLANS.tier3.title} Plan (Annual)`, mode: "payment" },
  "standard-post": { amount: ONE_TIME_PLANS["standard-post"].amount * 100, name: ONE_TIME_PLANS["standard-post"].title, mode: "payment" },
  "featured-post": { amount: ONE_TIME_PLANS["featured-post"].amount * 100, name: ONE_TIME_PLANS["featured-post"].title, mode: "payment" },
  "program-post": { amount: ONE_TIME_PLANS["program-post"].amount * 100, name: ONE_TIME_PLANS["program-post"].title, mode: "payment" },
};

const GST_RATE = 0.05;

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

async function callerOwnsOrg(uid: string, orgId: string): Promise<boolean> {
  if (uid === orgId) return true;
  if (!adminDb) return false;
  const memberSnap = await adminDb.collection("members").doc(uid).get();
  if (!memberSnap.exists) return false;
  const data = memberSnap.data() ?? {};
  return data.orgId === orgId && (data.orgRole === "owner" || data.orgRole === "admin");
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment not configured. Stripe keys are missing." },
      { status: 503 }
    );
  }

  const authResult = await verifyAuthToken(req);
  if (!authResult.success) return authResult.response;
  const uid = authResult.decodedToken.uid;

  try {
    const body = await req.json();
    const { planId, orgId } = body as { planId?: string; orgId?: string };

    if (!planId || !orgId) {
      return NextResponse.json(
        { error: "Missing planId or orgId" },
        { status: 400 }
      );
    }

    const plan = PLAN_PRICES[planId as BillingPlanId];
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown plan: ${planId}` },
        { status: 400 }
      );
    }

    if (!(await callerOwnsOrg(uid, orgId))) {
      return NextResponse.json(
        { error: "Not authorized to purchase for this organization" },
        { status: 403 }
      );
    }

    const gstAmount = Math.round(plan.amount * GST_RATE);

    const origin = req.headers.get("origin") || "https://iopps.ca";

    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: plan.name },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "cad",
            product_data: { name: "GST (5%)" },
            unit_amount: gstAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orgId,
        planId,
        purchaserUid: uid,
      },
      success_url: `${origin}/org/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${origin}/org/checkout/cancel?plan=${planId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[stripe/checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
