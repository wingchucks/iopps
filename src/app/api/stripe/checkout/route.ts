import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { authIntentHref } from "@/lib/auth-redirect";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
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

export async function POST(req: NextRequest) {
  let context;
  try {
    context = await requireEmployerContext(req);
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 401;
    return NextResponse.json({ error: "Checkout authorization failed" }, { status });
  }
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }
  // Canonical organization signup uses the owner's UID as the org document ID.
  // Profile orgId/orgRole fields are not proof of billing ownership.
  if (context.uid !== context.orgId || (body.orgId !== undefined && body.orgId !== context.orgId) || context.orgRole !== "owner") {
    return NextResponse.json({ error: "Organization owner access required" }, { status: 403 });
  }
  const orgId = context.orgId;
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment not configured. Stripe keys are missing." },
      { status: 503 }
    );
  }

  try {
    const { planId } = body as { planId?: string };

    if (typeof planId !== "string" || !Object.hasOwn(PLAN_PRICES, planId)) {
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

    const gstAmount = Math.round(plan.amount * GST_RATE);

    // Never trust Origin/Host headers for payment return URLs.
    const origin = "https://www.iopps.ca";
    const intent = new URLSearchParams({ plan: planId });
    if (typeof body.redirect === "string") intent.set("redirect", body.redirect);

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
      success_url: `${origin}${authIntentHref("/org/checkout/success", intent)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${authIntentHref("/org/checkout/cancel", intent)}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[stripe/checkout] Session creation failed", err instanceof Error ? err.name : "Error");
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}
