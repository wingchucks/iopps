import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Find user's org
  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", authResult.decodedToken.uid).limit(1).get();
  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const org = orgSnap.docs[0].data();
  if (!org.subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.subscription.stripeCustomerId,
    return_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
