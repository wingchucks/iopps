import { NextRequest, NextResponse } from "next/server";
import { stripe, CONFERENCE_PRODUCTS, ConferenceProductType } from "@/lib/stripe";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { conferenceId, productType, userId } = body;

        if (!conferenceId || !productType || !userId) {
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

        const product = CONFERENCE_PRODUCTS[productType as ConferenceProductType];

        // For free listings, no checkout needed
        if (product.price === 0) {
            return NextResponse.json({
                success: true,
                isFree: true,
                message: "Free listing - no payment required"
            });
        }

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
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/employer/conferences?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/employer/conferences?canceled=true`,
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
