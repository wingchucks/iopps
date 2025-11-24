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

                // Extract metadata
                const { productType, userId, jobId, conferenceId, duration, featured } = session.metadata || {};

                const db = getFirebaseAdmin();
                if (!db) {
                    console.error("Firebase Admin not initialized");
                    return NextResponse.json(
                        { error: "Server configuration error" },
                        { status: 500 }
                    );
                }

                // Handle job posting payment
                if (jobId) {
                    // Calculate expiration date
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + parseInt(duration || "30"));

                    const jobRef = db.collection("jobs").doc(jobId);

                    await jobRef.update({
                        active: true,
                        featured: featured === "true",
                        createdAt: new Date(), // Reset created at to payment time
                        expiresAt: expirationDate,
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType,
                        amountPaid: session.amount_total,
                    });

                    console.log(`Job ${jobId} activated successfully`);
                    break;
                }

                // Handle conference payment
                if (conferenceId) {
                    // Calculate expiration date
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + parseInt(duration || "60"));

                    const conferenceRef = db.collection("conferences").doc(conferenceId);

                    await conferenceRef.update({
                        active: true,
                        featured: featured === "true",
                        createdAt: new Date(), // Reset created at to payment time
                        expiresAt: expirationDate,
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType,
                        amountPaid: session.amount_total,
                    });

                    console.log(`Conference ${conferenceId} activated successfully`);
                    break;
                }

                console.error("Missing jobId or conferenceId in metadata");
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
