import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS, type BillingPlanId } from "@/lib/pricing";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";

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

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment not configured. Stripe keys are missing." },
      { status: 503 }
    );
  }

  try {
    // Authenticate the caller and resolve which org they own. The previous
    // version trusted `orgId` from the request body, so any signed-in user
    // could trigger a checkout session that upgrades an arbitrary org when
    // paid. Now we ignore any orgId the client sends and use the one bound
    // to their authenticated employer context.
    const context = await requireEmployerContext(req);

    const body = await req.json();
    const { planId, orgId: requestedOrgId } = body as { planId?: string; orgId?: string };

    if (!planId) {
      return NextResponse.json(
        { error: "Missing planId" },
        { status: 400 }
      );
    }

    // If the client passed an orgId, it must match the caller's authenticated
    // org. If it doesn't, refuse rather than silently ignore — the client
    // sending the wrong orgId is a signal of a bug or an attack.
    if (requestedOrgId && requestedOrgId !== context.orgId) {
      return NextResponse.json(
        { error: "orgId does not match authenticated employer" },
        { status: 403 }
      );
    }

    const orgId = context.orgId;

    const plan = PLAN_PRICES[planId as BillingPlanId];
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown plan: ${planId}` },
        { status: 400 }
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
        amount: String(plan.amount),
        gstAmount: String(gstAmount),
      },
      success_url: `${origin}/org/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${origin}/org/checkout/cancel?plan=${planId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    if (err instanceof EmployerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[stripe/checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
