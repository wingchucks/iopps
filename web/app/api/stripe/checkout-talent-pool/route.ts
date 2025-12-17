import { NextRequest, NextResponse } from "next/server";
import { stripe, TALENT_POOL_PRODUCTS, TalentPoolProductType } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
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
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Verify user is an employer
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        if (userData?.role !== "employer") {
            return NextResponse.json(
                { error: "Talent Pool access is only available to employer accounts." },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { tier } = body as {
            tier: TalentPoolProductType;
        };

        // Validate tier
        if (!tier || !(tier in TALENT_POOL_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid subscription tier. Please select Monthly or Annual." },
                { status: 400 }
            );
        }

        // Check if user already has active talent pool access
        const employerDoc = await db.collection("employers").doc(userId).get();
        if (employerDoc.exists) {
            const employerData = employerDoc.data();
            if (
                employerData?.talentPoolAccess?.active &&
                employerData?.talentPoolAccess?.expiresAt?.toDate() > new Date()
            ) {
                return NextResponse.json(
                    { error: "You already have active Talent Pool access. Check your dashboard for details." },
                    { status: 400 }
                );
            }
        }

        const product = TALENT_POOL_PRODUCTS[tier];

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
            success_url: `${request.nextUrl.origin}/organization/talent?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/organization/talent?canceled=true`,
            metadata: {
                type: "talent_pool",
                tier,
                userId,
                duration: product.duration.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create checkout session";
        console.error("Stripe talent pool checkout error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
