import { NextRequest, NextResponse } from "next/server";
import { stripe, JOB_POSTING_PRODUCTS, JobPostingProductType } from "@/lib/stripe";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productType, jobId, userId } = body as {
            productType: JobPostingProductType;
            jobId: string;
            userId: string;
        };

        // Validate product type
        if (!productType || !(productType in JOB_POSTING_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid product type" },
                { status: 400 }
            );
        }

        const product = JOB_POSTING_PRODUCTS[productType];

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
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
            success_url: `${request.nextUrl.origin}/employer/jobs/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/employer/jobs/new?canceled=true`,
            metadata: {
                productType,
                userId,
                jobId,
                duration: product.duration.toString(),
                featured: product.featured.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
