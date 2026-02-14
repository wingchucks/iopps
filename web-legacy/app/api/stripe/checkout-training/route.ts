import { NextRequest, NextResponse } from "next/server";
import { stripe, TRAINING_PRODUCTS, TrainingProductType } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = rateLimiters.standard(request);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
        );
    }

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
        const { productType, programId } = body as {
            productType: TrainingProductType;
            programId: string;
        };

        // Validate product type
        if (!productType || !(productType in TRAINING_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid product type" },
                { status: 400 }
            );
        }

        // Validate programId
        if (!programId) {
            return NextResponse.json(
                { error: "Missing programId" },
                { status: 400 }
            );
        }

        // Verify the user owns this training program
        const programDoc = await db.collection("training_programs").doc(programId).get();
        if (!programDoc.exists) {
            return NextResponse.json(
                { error: "Training program not found" },
                { status: 404 }
            );
        }

        const programData = programDoc.data();
        if (programData?.organizationId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: You do not own this training program" },
                { status: 403 }
            );
        }

        // Check if program is already featured
        if (programData?.featured) {
            return NextResponse.json(
                { error: "This training program is already featured" },
                { status: 400 }
            );
        }

        const product = TRAINING_PRODUCTS[productType];

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
            success_url: `${request.nextUrl.origin}/organization/training/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/organization/training?canceled=true`,
            metadata: {
                type: "training_featured",
                productType,
                userId,
                programId,
                duration: product.duration.toString(),
                featured: product.featured.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create checkout session";
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
