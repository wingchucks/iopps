import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";
import Stripe from "stripe";

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
                const { userId, jobData, duration, featured, productType } = session.metadata || {};

                if (!userId || !jobData) {
                    console.error("Missing required metadata in session");
                    break;
                }

                // Parse job data
                const parsedJobData = JSON.parse(jobData);

                // Calculate expiration date
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + parseInt(duration || "30"));

                // Create job posting in Firestore
                const jobRef = db.collection("jobs").doc();
                await jobRef.set({
                    ...parsedJobData,
                    id: jobRef.id,
                    employerId: userId,
                    active: true,
                    featured: featured === "true",
                    createdAt: new Date(),
                    expiresAt: expirationDate,
                    paymentStatus: "paid",
                    paymentId: session.payment_intent,
                    productType: productType,
                    amountPaid: session.amount_total,
                });

                console.log(`Job created successfully: ${jobRef.id}`);
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
