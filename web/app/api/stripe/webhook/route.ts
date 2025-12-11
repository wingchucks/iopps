import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { notifyAdmin } from "@/lib/admin-notifications";

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
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Webhook signature verification failed:", message);
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
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

                    if (!vendorDoc.exists) {
                        console.error(`Vendor ${vendorId} not found for subscription activation`);
                        break;
                    }

                    // Update vendor with subscription info (using new Vendor type fields)
                    await vendorRef.update({
                        status: "active",
                        featured: featured === "true",
                        subscriptionId: session.subscription as string || session.payment_intent as string,
                        subscriptionStatus: "active",
                        subscriptionEndsAt: expirationDate,
                        updatedAt: new Date(),
                    });

                    console.log(`Vendor ${vendorId} subscription activated until ${expirationDate.toISOString()}`);
                    break;
                }

                // Handle job posting payment
                if (jobId) {
                    const durationDays = duration ? parseInt(duration, 10) : 30;
                    // Calculate expiration date
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const jobRef = db.collection("jobs").doc(jobId);

                    // Get job details for notification before updating
                    const jobDoc = await jobRef.get();
                    const jobData = jobDoc.exists ? jobDoc.data() : null;

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

                    // Send admin notification for new paid job
                    if (jobData) {
                        notifyAdmin({
                            type: "new_job",
                            jobTitle: jobData.title || "Unknown",
                            employerName: jobData.employerName || "Unknown",
                            location: jobData.location || "Not specified",
                        }).catch(console.error);
                    }

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
    } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Unknown error";
        const errStack = err instanceof Error ? err.stack : null;
        console.error("Webhook error:", err);

        // Emergency logging to Firestore
        try {
            const { getFirestore } = await import("firebase-admin/firestore");
            const { initAdmin } = await import("@/lib/firebase-admin");
            await initAdmin();
            const db = getFirestore();
            await db.collection("system_logs").add({
                event: "stripe_webhook_error",
                error: errMessage,
                stack: errStack,
                timestamp: new Date(),
            });
        } catch (logErr) {
            console.error("Failed to log to Firestore:", logErr);
        }

        return NextResponse.json(
            { error: `Webhook Error: ${errMessage}` },
            { status: 400 }
        );
    }
}
