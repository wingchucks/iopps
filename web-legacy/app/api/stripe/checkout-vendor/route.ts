import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, VENDOR_PRODUCTS, VendorProductType } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
            console.error("Firebase Admin not initialized");
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
        const { productType, vendorId } = body as {
            productType: VendorProductType;
            vendorId: string;
        };

        // Validate product type
        if (!productType || !(productType in VENDOR_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid product type" },
                { status: 400 }
            );
        }

        // Validate vendorId
        if (!vendorId) {
            return NextResponse.json(
                { error: "Missing vendorId" },
                { status: 400 }
            );
        }

        // Verify the user owns this vendor profile
        const vendorDoc = await db.collection("vendors").doc(vendorId).get();
        if (!vendorDoc.exists) {
            return NextResponse.json(
                { error: "Vendor profile not found" },
                { status: 404 }
            );
        }

        const vendorData = vendorDoc.data();
        if (vendorData?.userId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: You do not own this vendor profile" },
                { status: 403 }
            );
        }

        const product = VENDOR_PRODUCTS[productType];

        // For monthly with first month free, we use a trial period
        const isMonthlyWithTrial = productType === "MONTHLY" && product.firstMonthFree;

        // Create Checkout Session
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
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
                        ...(product.recurring && {
                            recurring: {
                                interval: "month",
                            },
                        }),
                    },
                    quantity: 1,
                },
            ],
            mode: product.recurring ? "subscription" : "payment",
            success_url: `${request.nextUrl.origin}/organization/shop/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/organization/shop/dashboard?canceled=true`,
            metadata: {
                type: "vendor",
                productType,
                userId,
                vendorId,
                duration: product.duration.toString(),
                featured: product.featured.toString(),
            },
        };

        // Add trial period for monthly plan with first month free
        if (isMonthlyWithTrial) {
            sessionConfig.subscription_data = {
                trial_period_days: 30,
                metadata: {
                    type: "vendor",
                    productType,
                    userId,
                    vendorId,
                },
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create checkout session";
        console.error("Stripe vendor checkout error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
