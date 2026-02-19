import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminAuth) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const email = decodedToken.email;
        const db = getFirestore();

        // Get or create Stripe customer ID
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        let customerId = userData?.stripeCustomerId;

        if (!customerId) {
            // Check employers collection as well
            const employerRef = db.collection("employers").doc(userId);
            const employerDoc = await employerRef.get();
            const employerData = employerDoc.data();
            customerId = employerData?.stripeCustomerId;

            if (!customerId) {
                // Search for existing customer by email
                const existingCustomers = await stripe.customers.list({
                    email: email || undefined,
                    limit: 1,
                });

                if (existingCustomers.data.length > 0) {
                    customerId = existingCustomers.data[0].id;
                } else {
                    // Create new customer
                    const customer = await stripe.customers.create({
                        email: email || undefined,
                        metadata: {
                            userId,
                        },
                    });
                    customerId = customer.id;
                }

                // Store customer ID for future use
                if (userDoc.exists) {
                    await userRef.update({ stripeCustomerId: customerId });
                }
                if (employerDoc.exists) {
                    await employerRef.update({ stripeCustomerId: customerId });
                }
            }
        }

        // Get the return URL from request body
        const body = await request.json().catch(() => ({}));
        const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/organization/billing`;

        // Create Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Error creating portal session:", error);
        return NextResponse.json(
            { error: "Failed to create billing portal session" },
            { status: 500 }
        );
    }
}
