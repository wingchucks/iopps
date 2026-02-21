import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ── Plan → Stripe price mapping ── */
const PLAN_PRICES: Record<string, { amount: number; name: string; mode: Stripe.Checkout.SessionCreateParams.Mode }> = {
  tier1:           { amount: 125000, name: "Standard Plan (Annual)",       mode: "payment" },
  tier2:           { amount: 250000, name: "Premium Plan (Annual)",        mode: "payment" },
  tier3:           { amount: 550000, name: "School Plan (Annual)",         mode: "payment" },
  "standard-post": { amount: 12500,  name: "Standard Job Post",           mode: "payment" },
  "featured-post": { amount: 20000,  name: "Featured Job Post",           mode: "payment" },
  "program-post":  { amount: 5000,   name: "Program Post",                mode: "payment" },
};

const GST_RATE = 0.05;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
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
    const body = await req.json();
    const { planId, orgId } = body as { planId?: string; orgId?: string };

    if (!planId || !orgId) {
      return NextResponse.json(
        { error: "Missing planId or orgId" },
        { status: 400 }
      );
    }

    const plan = PLAN_PRICES[planId];
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
      success_url: `${origin}/org/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/org/checkout/cancel?plan=${planId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[stripe/checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
