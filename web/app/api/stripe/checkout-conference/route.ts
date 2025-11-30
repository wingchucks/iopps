import { NextRequest, NextResponse } from "next/server";
import { stripe, CONFERENCE_PRODUCTS, ConferenceProductType } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

        const body = await request.json();
        const { conferenceId, productType } = body;

        if (!conferenceId || !productType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate product type
        if (!(productType in CONFERENCE_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid product type" },
                { status: 400 }
            );
        }

        // Verify the user owns this conference
        const conferenceDoc = await db.collection("conferences").doc(conferenceId).get();
        if (!conferenceDoc.exists) {
            return NextResponse.json(
                { error: "Conference not found" },
                { status: 404 }
            );
        }

        const conferenceData = conferenceDoc.data();
        if (conferenceData?.employerId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: You do not own this conference" },
                { status: 403 }
            );
        }

        const product = CONFERENCE_PRODUCTS[productType as ConferenceProductType];

        // Create Stripe checkout session
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
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/organization/conferences?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/organization/conferences?canceled=true`,
            metadata: {
                productType: productType,
                userId: userId,
                conferenceId: conferenceId,
                duration: product.duration.toString(),
                featured: product.featured.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("Conference checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
