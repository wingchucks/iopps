import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

//  Lazy-load firebase-admin to prevent build-time initialization errors
function getFirebaseAdmin() {
    const { db } = require("@/lib/firebase-admin");
    return db;
}

// Mark this route as dynamic to prevent static analysis
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json(
            { error: "No signature provided" },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        // Verify webhook signature
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET is not set");
            return NextResponse.json(
                { error: "Webhook secret not configured" },
                { status: 500 }
            );
        }

        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
        console.error("Webhook signature verification failed:", error.message);
        return NextResponse.json(
            { error: `Webhook Error: ${error.message}` },
            { status: 400 }
        );
    }

    // Handle the event
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Extract and validate metadata
                const metadata = session.metadata || {};
                const { type, productType, userId, jobId, conferenceId, vendorId, duration, featured, jobCredits, featuredJobCredits, unlimitedPosts } = metadata;

                // Validate required metadata
                if (!type) {
                    console.error("Missing required metadata: type");
                    return NextResponse.json(
                        { error: "Invalid payment session: missing type" },
                        { status: 400 }
                    );
                }

                const db = getFirebaseAdmin();
                if (!db) {
                    console.error("Firebase Admin not initialized");
                    return NextResponse.json(
                        { error: "Server configuration error" },
                        { status: 500 }
                    );
                }

                // Handle subscription purchase
                if (type === "subscription" && userId) {
                    // Parse and validate numeric metadata with proper defaults
                    const durationDays = duration ? parseInt(duration, 10) : 365;
                    const credits = jobCredits ? parseInt(jobCredits, 10) : 0;
                    const featuredCredits = featuredJobCredits ? parseInt(featuredJobCredits, 10) : 0;

                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const employerRef = db.collection("employers").doc(userId);

                    await employerRef.update({
                        subscription: {
                            active: true,
                            tier: productType || "TIER1",
                            purchasedAt: new Date(),
                            expiresAt: expirationDate,
                            paymentId: session.payment_intent as string,
                            amountPaid: session.amount_total,
                            jobCredits: credits,
                            jobCreditsUsed: 0,
                            featuredJobCredits: featuredCredits,
                            featuredJobCreditsUsed: 0,
                            unlimitedPosts: unlimitedPosts === "true",
                        },
                    });

                    console.log(`Subscription ${productType} activated for user ${userId}`);
                    break;
                }

                // Handle vendor subscription
                if (type === "vendor" && vendorId) {
                    const durationDays = duration ? parseInt(duration, 10) : 30;
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const vendorRef = db.collection("vendors").doc(vendorId);
                    const vendorDoc = await vendorRef.get();

                    // Create or update vendor document
                    if (vendorDoc.exists) {
                        await vendorRef.update({
                            active: true,
                            featured: featured === "true",
                            subscription: {
                                active: true,
                                type: productType || "MONTHLY",
                                purchasedAt: new Date(),
                                expiresAt: expirationDate,
                                paymentId: session.payment_intent as string,
                                amountPaid: session.amount_total,
                            },
                        });
                    } else {
                        // Create new vendor document
                        await vendorRef.set({
                            id: vendorId,
                            active: true,
                            featured: featured === "true",
                            createdAt: new Date(),
                            subscription: {
                                active: true,
                                type: productType || "MONTHLY",
                                purchasedAt: new Date(),
                                expiresAt: expirationDate,
                                paymentId: session.payment_intent as string,
                                amountPaid: session.amount_total,
                            },
                        });
                    }

                    // If upgrading from community to employer, update user role
                    const { upgradeToEmployer } = metadata;
                    const vendorUserId = metadata.userId;
                    if (upgradeToEmployer === "true" && vendorUserId) {
                        const userRef = db.collection("users").doc(vendorUserId);
                        await userRef.update({
                            role: "employer",
                        });

                        // Also create employer document if it doesn't exist
                        const employerRef = db.collection("employers").doc(vendorUserId);
                        const employerDoc = await employerRef.get();
                        if (!employerDoc.exists) {
                            const userDoc = await userRef.get();
                            const userData = userDoc.data();
                            await employerRef.set({
                                id: vendorUserId,
                                name: userData?.displayName || "",
                                email: userData?.email || "",
                                createdAt: new Date(),
                                subscription: null,
                            });
                        }

                        console.log(`User ${vendorUserId} upgraded from community to employer`);
                    }

                    console.log(`Vendor ${vendorId} subscription activated`);
                    break;
                }

                // Handle job posting payment
                if (jobId) {
                    const durationDays = duration ? parseInt(duration, 10) : 30;
                    // Calculate expiration date
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const jobRef = db.collection("jobs").doc(jobId);

                    await jobRef.update({
                        active: true,
                        featured: featured === "true",
                        // Don't reset createdAt - preserve original creation time
                        expiresAt: expirationDate,
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType || "SINGLE",
                        amountPaid: session.amount_total,
                    });

                    console.log(`Job ${jobId} activated successfully`);
                    break;
                }

                // Handle conference payment
                if (conferenceId) {
                    const durationDays = duration ? parseInt(duration, 10) : 60;
                    // Calculate expiration date
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const conferenceRef = db.collection("conferences").doc(conferenceId);

                    await conferenceRef.update({
                        active: true,
                        featured: featured === "true",
                        // Don't reset createdAt - preserve original creation time
                        expiresAt: expirationDate,
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType || "STANDARD",
                        amountPaid: session.amount_total,
                    });

                    console.log(`Conference ${conferenceId} activated successfully`);
                    break;
                }

                console.error("Unknown payment type in metadata");
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                console.error("Payment failed:", paymentIntent.id);
                // Handle payment failure (could send notification email)
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
