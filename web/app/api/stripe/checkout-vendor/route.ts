import { NextRequest, NextResponse } from "next/server";
import { stripe, VENDOR_PRODUCTS, VendorProductType } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { productType } = body as {
            productType: VendorProductType;
        };

        // Validate product type
        if (!productType || !(productType in VENDOR_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid vendor product type" },
                { status: 400 }
            );
        }

        // Get user data to check current role
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();
        const currentRole = userData?.role || "community";

        // Check if user already has an active vendor subscription
        const vendorDoc = await db.collection("vendors").doc(userId).get();
        if (vendorDoc.exists) {
            const vendorData = vendorDoc.data();
            if (vendorData?.subscription?.active && vendorData?.subscription?.expiresAt?.toDate() > new Date()) {
                return NextResponse.json(
                    { error: "You already have an active vendor subscription. Manage it from your dashboard." },
                    { status: 400 }
                );
            }
        }

        const product = VENDOR_PRODUCTS[productType];

        // Determine the price (first month free for monthly)
        const finalPrice = product.firstMonthFree && productType === "MONTHLY" ? 0 : product.price;

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
                        unit_amount: finalPrice,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${request.nextUrl.origin}/organization/shop/setup?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/organization/shop/setup?canceled=true`,
            metadata: {
                type: "vendor",
                productType,
                userId,
                vendorId: userId, // Use userId as vendorId
                duration: product.duration.toString(),
                featured: product.featured.toString(),
                currentRole, // Track if this is an upgrade from community
                upgradeToEmployer: currentRole === "community" ? "true" : "false",
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("Stripe vendor checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
