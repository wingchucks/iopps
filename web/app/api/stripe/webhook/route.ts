import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { notifyAdmin } from "@/lib/admin-notifications";

// Mark this route as dynamic to prevent static analysis
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout for complex webhook operations

//  Lazy-load firebase-admin to prevent build-time initialization errors
function getFirebaseAdmin() {
    const { db } = require("@/lib/firebase-admin");
    return db;
}

// Lazy-load visibility recompute function
async function recomputeVisibility(orgId: string): Promise<void> {
    try {
        const { recomputeOrganizationVisibility } = await import("@/lib/firestore/visibility");
        const result = await recomputeOrganizationVisibility(orgId);
        if (result.success) {
            console.log(`[webhook] Recomputed visibility for ${orgId}: visible=${result.isDirectoryVisible}, reason=${result.visibilityReason}`);
        } else {
            console.warn(`[webhook] Failed to recompute visibility for ${orgId}: ${result.error}`);
        }
    } catch (error) {
        // Non-fatal - visibility will be corrected by scheduled reconciliation
        console.warn(`[webhook] Error recomputing visibility for ${orgId}:`, error);
    }
}

// Check if event has already been processed (idempotency)
async function isEventProcessed(db: FirebaseFirestore.Firestore, eventId: string): Promise<boolean> {
    const eventRef = db.collection("stripe_events").doc(eventId);
    const eventDoc = await eventRef.get();
    return eventDoc.exists;
}

// Mark event as processed
async function markEventProcessed(db: FirebaseFirestore.Firestore, eventId: string, eventType: string): Promise<void> {
    const eventRef = db.collection("stripe_events").doc(eventId);
    await eventRef.set({
        eventId,
        eventType,
        processedAt: new Date(),
    });
}

// Save payment record for billing history
async function savePaymentRecord(
    db: FirebaseFirestore.Firestore,
    session: Stripe.Checkout.Session,
    type: string,
    description: string
): Promise<void> {
    const metadata = session.metadata || {};
    const userId = metadata.userId || metadata.employerId;

    if (!userId) {
        console.log("No userId found for payment record, skipping");
        return;
    }

    await db.collection("payments").add({
        userId,
        type,
        description,
        amount: session.amount_total,
        currency: session.currency || "cad",
        status: "succeeded",
        paymentIntentId: session.payment_intent as string,
        sessionId: session.id,
        metadata: {
            productType: metadata.productType,
            jobId: metadata.jobId,
            conferenceId: metadata.conferenceId,
            vendorId: metadata.vendorId,
            programId: metadata.programId,
            tier: metadata.tier,
        },
        createdAt: new Date(),
    });
}

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
        // Return generic error message to avoid information leakage
        return NextResponse.json(
            { error: "Webhook signature verification failed" },
            { status: 400 }
        );
    }

    // Get Firebase admin
    const db = getFirebaseAdmin();
    if (!db) {
        console.error("Firebase Admin not initialized");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }

    // Idempotency check - skip if already processed
    try {
        if (await isEventProcessed(db, event.id)) {
            console.log(`Event ${event.id} already processed, skipping`);
            return NextResponse.json({ received: true, skipped: true });
        }
    } catch (error) {
        console.warn("Could not check event idempotency, proceeding:", error);
    }

    // Handle the event
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Extract and validate metadata
                const metadata = session.metadata || {};
                const { type, productType, userId, jobId, conferenceId, vendorId, programId, duration, featured, jobCredits, featuredJobCredits, unlimitedPosts, talentPoolAccessDays } = metadata;

                // Validate required metadata
                if (!type) {
                    console.error("Missing required metadata: type");
                    return NextResponse.json(
                        { error: "Invalid payment session: missing type" },
                        { status: 400 }
                    );
                }

                // Handle subscription purchase
                if (type === "subscription" && userId) {
                    // Parse and validate numeric metadata with proper defaults
                    const durationDays = duration ? parseInt(duration, 10) : 365;
                    const credits = jobCredits ? parseInt(jobCredits, 10) : 0;
                    const featuredCredits = featuredJobCredits ? parseInt(featuredJobCredits, 10) : 0;
                    const talentPoolDays = talentPoolAccessDays ? parseInt(talentPoolAccessDays, 10) : 0;

                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const employerRef = db.collection("employers").doc(userId);

                    // Build update object with subscription data
                    const updateData: Record<string, unknown> = {
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
                    };

                    // Grant bundled talent pool access if included with subscription tier
                    if (talentPoolDays > 0) {
                        const talentPoolExpiration = new Date();
                        talentPoolExpiration.setDate(talentPoolExpiration.getDate() + talentPoolDays);

                        updateData.talentPoolAccess = {
                            active: true,
                            tier: "bundled",
                            purchasedAt: new Date(),
                            expiresAt: talentPoolExpiration,
                            paymentId: session.payment_intent as string,
                            amountPaid: 0, // Bundled - no separate charge
                        };

                        console.log(`Bundled ${talentPoolDays} days talent pool access for user ${userId}`);
                    }

                    await employerRef.update(updateData);

                    // Save payment record
                    await savePaymentRecord(
                        db,
                        session,
                        "subscription",
                        `${productType === "TIER2" ? "Unlimited" : "Growth"} Subscription`
                    );

                    console.log(`Subscription ${productType} activated for user ${userId}`);

                    // Recompute directory visibility (subscription extends visibility)
                    await recomputeVisibility(userId);

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

                    // Get vendor owner for payment record
                    const vendorData = vendorDoc.data();
                    if (vendorData?.ownerUserId) {
                        await savePaymentRecord(
                            db,
                            { ...session, metadata: { ...metadata, userId: vendorData.ownerUserId } } as Stripe.Checkout.Session,
                            "vendor",
                            featured === "true" ? "Annual Vendor Plan" : "Monthly Vendor Listing"
                        );
                    }

                    console.log(`Vendor ${vendorId} subscription activated until ${expirationDate.toISOString()}`);

                    // Recompute directory visibility for the vendor's owner organization
                    if (vendorData?.ownerUserId) {
                        await recomputeVisibility(vendorData.ownerUserId);
                    }

                    break;
                }

                // Handle job posting payment
                if (jobId) {
                    const durationDays = duration ? parseInt(duration, 10) : 30;
                    const talentPoolDays = talentPoolAccessDays ? parseInt(talentPoolAccessDays, 10) : 0;
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

                    // Grant bonus talent pool access for featured jobs
                    if (talentPoolDays > 0 && jobData?.employerId) {
                        const employerRef = db.collection("employers").doc(jobData.employerId);
                        const employerDoc = await employerRef.get();
                        const existing = employerDoc.exists ? employerDoc.data()?.talentPoolAccess : null;

                        // Extend existing access or create new
                        let newExpiration = new Date();
                        if (existing?.active && existing?.expiresAt) {
                            // Get expiration date from existing access
                            const existingExpires = existing.expiresAt.toDate ? existing.expiresAt.toDate() : new Date(existing.expiresAt);
                            if (existingExpires > new Date()) {
                                newExpiration = existingExpires;
                            }
                        }
                        newExpiration.setDate(newExpiration.getDate() + talentPoolDays);

                        await employerRef.update({
                            talentPoolAccess: {
                                active: true,
                                tier: existing?.tier || "bonus",
                                purchasedAt: existing?.purchasedAt || new Date(),
                                expiresAt: newExpiration,
                                // Preserve existing payment info if upgrading
                                ...(existing?.paymentId && { paymentId: existing.paymentId }),
                                ...(existing?.amountPaid && { amountPaid: existing.amountPaid }),
                            },
                        });

                        console.log(`Granted ${talentPoolDays} days bonus talent pool access to employer ${jobData.employerId}`);
                    }

                    // Send admin notification for new paid job
                    if (jobData) {
                        notifyAdmin({
                            type: "new_job",
                            jobTitle: jobData.title || "Unknown",
                            employerName: jobData.employerName || "Unknown",
                            location: jobData.location || "Not specified",
                        }).catch(console.error);

                        // Save payment record
                        await savePaymentRecord(
                            db,
                            { ...session, metadata: { ...metadata, userId: jobData.employerId } } as Stripe.Checkout.Session,
                            "job",
                            featured === "true" ? `Featured Job Ad: ${jobData.title}` : `Job Post: ${jobData.title}`
                        );
                    }

                    console.log(`Job ${jobId} activated successfully`);

                    // Recompute directory visibility (job publish extends visibility)
                    if (jobData?.employerId) {
                        await recomputeVisibility(jobData.employerId);
                    }

                    break;
                }

                // Handle conference payment (featured visibility upgrade)
                if (conferenceId) {
                    const durationDays = duration ? parseInt(duration, 10) : 90;
                    // Calculate featured expiration date
                    const featuredExpiresAt = new Date();
                    featuredExpiresAt.setDate(featuredExpiresAt.getDate() + durationDays);

                    const conferenceRef = db.collection("conferences").doc(conferenceId);
                    const conferenceDoc = await conferenceRef.get();
                    const existingData = conferenceDoc.exists ? conferenceDoc.data() : {};

                    // Build update - featuring should work even for demoted conferences
                    const updateData: Record<string, unknown> = {
                        active: true,
                        featured: true,
                        featuredExpiresAt,
                        featurePlan: productType || "FEATURED_90",
                        visibilityTier: "featured",
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType || "FEATURED_90",
                        amountPaid: session.amount_total,
                        // Legacy field for backwards compatibility
                        expiresAt: featuredExpiresAt,
                    };

                    // If not yet published, set publishedAt now
                    if (!existingData?.publishedAt) {
                        const now = new Date();
                        const freeVisibilityExpiresAt = new Date(now);
                        freeVisibilityExpiresAt.setDate(freeVisibilityExpiresAt.getDate() + 45); // 45-day free period

                        updateData.publishedAt = now;
                        updateData.freeVisibilityExpiresAt = freeVisibilityExpiresAt;
                        updateData.freeVisibilityUsed = true;

                        // Generate and store fingerprint
                        const title = existingData?.title || "";
                        const location = existingData?.location || "";
                        const startDate = existingData?.startDate?.toDate?.()
                            ? existingData.startDate.toDate().toISOString()
                            : existingData?.startDate;
                        const employerId = existingData?.employerId;

                        if (employerId) {
                            // Simple fingerprint generation
                            const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, " ");
                            const city = (location || "").toLowerCase().trim().split(",")[0].trim();
                            let dateStr = "";
                            if (startDate) {
                                const d = new Date(startDate);
                                if (!isNaN(d.getTime())) {
                                    dateStr = d.toISOString().split("T")[0];
                                }
                            }
                            const fingerprintInput = `${employerId}|${normalizedTitle}|${dateStr}|${city}`;
                            let hash = 5381;
                            for (let i = 0; i < fingerprintInput.length; i++) {
                                hash = (hash * 33) ^ fingerprintInput.charCodeAt(i);
                            }
                            const fingerprint = `fp_${(hash >>> 0).toString(16)}`;

                            updateData.eventFingerprint = fingerprint;

                            // Record fingerprint history
                            const historyDocId = `${employerId}_${fingerprint}`;
                            await db.collection("conference_fingerprint_history").doc(historyDocId).set({
                                employerId,
                                fingerprint,
                                firstPublishedAt: now,
                                freeVisibilityExpiresAt,
                                freeVisibilityUsed: true,
                                conferenceId,
                                title,
                            });
                        }
                    }

                    await conferenceRef.update(updateData);

                    // Get updated conference data for payment record
                    const updatedConferenceDoc = await conferenceRef.get();
                    const conferenceData = updatedConferenceDoc.exists ? updatedConferenceDoc.data() : null;
                    if (conferenceData?.employerId) {
                        await savePaymentRecord(
                            db,
                            { ...session, metadata: { ...metadata, userId: conferenceData.employerId } } as Stripe.Checkout.Session,
                            "conference",
                            featured === "true"
                                ? `Featured Conference: ${conferenceData.title || "Conference"}`
                                : `Conference: ${conferenceData.title || "Conference"}`
                        );
                    }

                    console.log(`Conference ${conferenceId} activated successfully`);
                    break;
                }

                // Handle training program featured payment
                if (type === "training_featured" && programId) {
                    const durationDays = duration ? parseInt(duration, 10) : 60;
                    // Calculate expiration date for featured status
                    const featuredExpiresAt = new Date();
                    featuredExpiresAt.setDate(featuredExpiresAt.getDate() + durationDays);

                    const programRef = db.collection("training_programs").doc(programId);

                    await programRef.update({
                        featured: true,
                        featuredAt: new Date(),
                        featuredExpiresAt: featuredExpiresAt,
                        featuredPaymentId: session.payment_intent as string,
                        featuredProductType: productType || "FEATURED",
                        featuredAmountPaid: session.amount_total,
                        updatedAt: new Date(),
                    });

                    // Get program data for payment record
                    const programDoc = await programRef.get();
                    const programData = programDoc.exists ? programDoc.data() : null;
                    if (programData?.employerId) {
                        await savePaymentRecord(
                            db,
                            { ...session, metadata: { ...metadata, userId: programData.employerId } } as Stripe.Checkout.Session,
                            "training_featured",
                            `Featured Training: ${programData.title || "Training Program"}`
                        );
                    }

                    console.log(`Training program ${programId} featured successfully until ${featuredExpiresAt.toISOString()}`);
                    break;
                }

                // Handle Talent Pool Access purchase
                if (type === "talent_pool" && userId) {
                    const tier = metadata.tier as "MONTHLY" | "ANNUAL";
                    const durationDays = duration ? parseInt(duration, 10) : 30;

                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + durationDays);

                    const employerRef = db.collection("employers").doc(userId);

                    await employerRef.update({
                        talentPoolAccess: {
                            active: true,
                            tier: tier.toLowerCase(),
                            purchasedAt: new Date(),
                            expiresAt: expirationDate,
                            paymentId: session.payment_intent as string,
                            amountPaid: session.amount_total,
                        },
                    });

                    // Save payment record
                    await savePaymentRecord(
                        db,
                        session,
                        "talent_pool",
                        `Talent Pool Access (${tier === "ANNUAL" ? "Annual" : "Monthly"})`
                    );

                    console.log(`Talent Pool Access (${tier}) activated for user ${userId} until ${expirationDate.toISOString()}`);
                    break;
                }

                console.error("Unknown payment type in metadata");
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.error("Payment failed:", paymentIntent.id);

                // Try to find and update the related job/conference to failed status
                const failedMetadata = paymentIntent.metadata || {};
                if (failedMetadata.jobId) {
                    try {
                        await db.collection("jobs").doc(failedMetadata.jobId).update({
                            paymentStatus: "failed",
                        });
                        console.log(`Job ${failedMetadata.jobId} marked as payment failed`);
                    } catch (updateErr) {
                        console.error("Failed to update job payment status:", updateErr);
                    }
                }
                if (failedMetadata.conferenceId) {
                    try {
                        await db.collection("conferences").doc(failedMetadata.conferenceId).update({
                            paymentStatus: "failed",
                        });
                        console.log(`Conference ${failedMetadata.conferenceId} marked as payment failed`);
                    } catch (updateErr) {
                        console.error("Failed to update conference payment status:", updateErr);
                    }
                }
                break;
            }

            case "charge.refunded": {
                const charge = event.data.object as Stripe.Charge;
                console.log("Charge refunded:", charge.id);

                // Find the payment intent to get metadata
                if (charge.payment_intent) {
                    try {
                        const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
                        const refundMetadata = paymentIntent.metadata || {};

                        // Deactivate the job/conference if refunded
                        if (refundMetadata.jobId) {
                            // Get employerId before updating
                            const jobDoc = await db.collection("jobs").doc(refundMetadata.jobId).get();
                            const jobEmployerId = jobDoc.exists ? jobDoc.data()?.employerId : null;

                            await db.collection("jobs").doc(refundMetadata.jobId).update({
                                active: false,
                                paymentStatus: "refunded",
                            });
                            console.log(`Job ${refundMetadata.jobId} deactivated due to refund`);

                            // Recompute visibility after job deactivation
                            if (jobEmployerId) {
                                await recomputeVisibility(jobEmployerId);
                            }
                        }
                        if (refundMetadata.conferenceId) {
                            await db.collection("conferences").doc(refundMetadata.conferenceId).update({
                                active: false,
                                paymentStatus: "refunded",
                            });
                            console.log(`Conference ${refundMetadata.conferenceId} deactivated due to refund`);
                        }
                    } catch (refundErr) {
                        console.error("Failed to process refund:", refundErr);
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                console.log("Subscription cancelled:", subscription.id);

                // Find and deactivate the vendor subscription
                try {
                    const vendorsSnapshot = await db.collection("vendors")
                        .where("subscriptionId", "==", subscription.id)
                        .get();

                    for (const vendorDoc of vendorsSnapshot.docs) {
                        await vendorDoc.ref.update({
                            subscriptionStatus: "cancelled",
                            status: "inactive",
                        });
                        console.log(`Vendor ${vendorDoc.id} subscription cancelled`);

                        // Recompute visibility for vendor's owner organization
                        const vendorData = vendorDoc.data();
                        if (vendorData?.ownerUserId) {
                            await recomputeVisibility(vendorData.ownerUserId);
                        }
                    }
                } catch (subErr) {
                    console.error("Failed to process subscription cancellation:", subErr);
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                console.error("Invoice payment failed:", invoice.id);

                // Handle recurring payment failure for vendor subscriptions
                // Access subscription via any cast since Stripe types vary by version
                const invoiceSubscription = (invoice as any).subscription;
                const subscriptionId = typeof invoiceSubscription === 'string'
                    ? invoiceSubscription
                    : invoiceSubscription?.id;

                if (subscriptionId) {
                    try {
                        const vendorsSnapshot = await db.collection("vendors")
                            .where("subscriptionId", "==", subscriptionId)
                            .get();

                        for (const vendorDoc of vendorsSnapshot.docs) {
                            await vendorDoc.ref.update({
                                subscriptionStatus: "past_due",
                            });
                            console.log(`Vendor ${vendorDoc.id} marked as past due`);
                        }
                    } catch (invoiceErr) {
                        console.error("Failed to process invoice failure:", invoiceErr);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Mark event as processed for idempotency
        try {
            await markEventProcessed(db, event.id, event.type);
        } catch (markErr) {
            console.warn("Could not mark event as processed:", markErr);
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

        // Return generic error message to avoid information leakage
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 400 }
        );
    }
}
