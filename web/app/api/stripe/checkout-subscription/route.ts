import { NextRequest, NextResponse } from "next/server";
import { stripe, SUBSCRIPTION_PRODUCTS, SubscriptionProductType } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!adminAuth || !adminDb) {
            console.error("Firebase Admin not initialized - check environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Verify user is an employer
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        if (userData?.role !== "employer") {
            return NextResponse.json(
                { error: "Subscriptions are only available to employers. Please create an employer account to post jobs." },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { productType } = body as {
            productType: SubscriptionProductType;
        };

        // Validate product type
        if (!productType || !(productType in SUBSCRIPTION_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid subscription type" },
                { status: 400 }
            );
        }

        // Check if user already has an active subscription
        const employerDoc = await adminDb.collection("employers").doc(userId).get();
        if (employerDoc.exists) {
            const employerData = employerDoc.data();
            if (employerData?.subscription?.active && employerData?.subscription?.expiresAt?.toDate() > new Date()) {
                return NextResponse.json(
                    { error: "You already have an active subscription. Manage it from your dashboard." },
                    { status: 400 }
                );
            }
        }

        const product = SUBSCRIPTION_PRODUCTS[productType];

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "cad",
                        product_data: {
                            name: product.name,
                            description: product.description,
                        },
                        unit_amount: product.price,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${request.nextUrl.origin}/organization/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/pricing?canceled=true`,
            metadata: {
                type: "subscription",
                productType,
                userId,
                duration: product.duration.toString(),
                jobCredits: product.jobCredits.toString(),
                featuredJobCredits: product.featuredJobCredits.toString(),
                unlimitedPosts: product.unlimitedPosts.toString(),
                talentPoolAccessDays: product.talentPoolAccessDays.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create checkout session";
        console.error("Stripe subscription checkout error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
