import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { stripe, JOB_POSTING_PRODUCTS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { productType, orgId } = await request.json();
  const product = JOB_POSTING_PRODUCTS[productType as keyof typeof JOB_POSTING_PRODUCTS];
  if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

  // Get or create Stripe customer
  const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) return NextResponse.json({ error: "Org not found" }, { status: 404 });
  const org = orgDoc.data()!;

  let customerId = org.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: authResult.decodedToken.email,
      metadata: { orgId },
    });
    customerId = customer.id;
    await adminDb.collection("organizations").doc(orgId).update({
      "subscription.stripeCustomerId": customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "cad",
        product_data: { name: product.name, description: product.description },
        unit_amount: product.price,
      },
      quantity: 1,
    }],
    metadata: { orgId, productType },
    success_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing?success=true`,
    cancel_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
