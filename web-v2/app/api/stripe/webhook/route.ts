/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // 60 second timeout for complex webhook operations

// Stub notifyAdmin as a no-op (not yet ported to web-v2)
const notifyAdmin = async (..._args: unknown[]) => {};

// Stub recomputeVisibility as a no-op (not yet ported to web-v2)
const recomputeVisibility = async (_orgId: string): Promise<void> => {};

// Lazy-load firebase-admin to prevent build-time initialization errors
async function getFirebaseAdmin() {
    // Dynamic import triggers initAdmin() on module load
    await import("@/lib/firebase-admin");
    const { getFirestore } = await import("firebase-admin/firestore");
    const { getApps } = await import("firebase-admin/app");

    if (!getApps().length) {
        console.error("Firebase Admin failed to initialize - no apps registered");
        return null;
    }

    return getFirestore();
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

    let event: Stripe.Event | undefined;

    try {
        // Verify webhook signature using the production secret only
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
            { error: "Webhook signature verification failed" },
            { status: 400 }
        );
    }

    // Get Firebase admin (await to ensure initialization completes)
    const db = await getFirebaseAdmin();
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
                // Note: jobId without type is still allowed for backward compatibility
                if (!type && !jobId) {
                    console.error("Missing required metadata: type (and no jobId fallback)");
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
                    }

                    // Check if employer is pending and auto-approve on payment
                    const employerDoc = await employerRef.get();
                    const employerData = employerDoc.exists ? employerDoc.data() : null;

                    if (employerData?.status === "pending") {
                        updateData.status = "approved";
                        updateData.approvedAt = new Date();
                        updateData.approvalMethod = "payment";
                        // Also activate any jobs that were waiting for employer approval
                        const pendingJobs = await db.collection("jobs")
                            .where("employerId", "==", userId)
                            .where("pendingEmployerApproval", "==", true)
                            .get();

                        for (const pendingJobDoc of pendingJobs.docs) {
                            await pendingJobDoc.ref.update({
                                active: true,
                                pendingEmployerApproval: false,
                            });
                        }
                    }

                    await employerRef.update(updateData);

                    // Save payment record
                    await savePaymentRecord(
                        db,
                        session,
                        "subscription",
                        `${productType === "TIER2" ? "Unlimited" : "Growth"} Subscription`
                    );

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

                    // Update vendor with subscription info
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

                    // Recompute directory visibility for the vendor's owner organization
                    if (vendorData?.ownerUserId) {
                        await recomputeVisibility(vendorData.ownerUserId);
                    }

                    break;
                }

                // Handle job credit purchase (payment before posting)
                // This auto-approves the employer and grants them a job credit
                if (type === "job_credit" && userId) {
                    const durationDays = duration ? parseInt(duration, 10) : 30;
                    const talentPoolDays = talentPoolAccessDays ? parseInt(talentPoolAccessDays, 10) : 0;
                    const isFeatured = featured === "true";

                    const employerRef = db.collection("employers").doc(userId);
                    const employerDoc = await employerRef.get();
                    const employerData = employerDoc.exists ? employerDoc.data() : null;

                    if (!employerData) {
                        console.error(`Employer ${userId} not found for job credit purchase`);
                        break;
                    }

                    // Build update data
                    const updateData: Record<string, unknown> = {
                        // Grant job credit
                        jobCredits: (employerData.jobCredits || 0) + 1,
                        // Store credit details for when they use it
                        lastCreditPurchase: {
                            purchasedAt: new Date(),
                            duration: durationDays,
                            featured: isFeatured,
                            paymentId: session.payment_intent as string,
                            amountPaid: session.amount_total,
                        },
                    };

                    // Auto-approve pending employers
                    if (employerData.status === "pending") {
                        updateData.status = "approved";
                        updateData.approvedAt = new Date();
                        updateData.approvalMethod = "payment";
                        // Also activate any jobs that were waiting for employer approval
                        const pendingJobs = await db.collection("jobs")
                            .where("employerId", "==", userId)
                            .where("pendingEmployerApproval", "==", true)
                            .get();

                        for (const pendingJobDoc of pendingJobs.docs) {
                            await pendingJobDoc.ref.update({
                                active: true,
                                pendingEmployerApproval: false,
                            });
                        }
                    }

                    // Grant bonus talent pool access if included
                    if (talentPoolDays > 0) {
                        const existing = employerData.talentPoolAccess;
                        let newExpiration = new Date();
                        if (existing?.active && existing?.expiresAt) {
                            const existingExpires = existing.expiresAt.toDate ? existing.expiresAt.toDate() : new Date(existing.expiresAt);
                            if (existingExpires > new Date()) {
                                newExpiration = existingExpires;
                            }
                        }
                        newExpiration.setDate(newExpiration.getDate() + talentPoolDays);

                        updateData.talentPoolAccess = {
                            active: true,
                            tier: existing?.tier || "bonus",
                            purchasedAt: existing?.purchasedAt || new Date(),
                            expiresAt: newExpiration,
                        };
                    }

                    await employerRef.update(updateData);

                    // Save payment record
                    await savePaymentRecord(
                        db,
                        session,
                        "job_credit",
                        isFeatured ? "Featured Job Credit" : "Job Credit"
                    );

                    // Recompute directory visibility
                    await recomputeVisibility(userId);

                    break;
                }

                // Handle job posting payment
                // Handles both type === "job" and legacy jobId-only payments
                if (type === "job" || jobId) {
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
                                ...(existing?.paymentId && { paymentId: existing.paymentId }),
                                ...(existing?.amountPaid && { amountPaid: existing.amountPaid }),
                            },
                        });
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

                    // Auto-approve pending employers on successful payment
                    if (jobData?.employerId) {
                        const employerRef = db.collection("employers").doc(jobData.employerId);
                        const employerDoc = await employerRef.get();
                        const employerData = employerDoc.exists ? employerDoc.data() : null;

                        if (employerData?.status === "pending") {
                            await employerRef.update({
                                status: "approved",
                                approvedAt: new Date(),
                                approvalMethod: "payment",
                            });
                            // Also activate any jobs that were waiting for employer approval
                            const pendingJobs = await db.collection("jobs")
                                .where("employerId", "==", jobData.employerId)
                                .where("pendingEmployerApproval", "==", true)
                                .get();

                            for (const pendingJobDoc of pendingJobs.docs) {
                                await pendingJobDoc.ref.update({
                                    active: true,
                                    pendingEmployerApproval: false,
                                });
                            }
                        }

                        // Recompute directory visibility (job publish extends visibility)
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
                        freeVisibilityExpiresAt.setDate(freeVisibilityExpiresAt.getDate() + 45);

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

                    break;
                }

                // Handle training program listing (3+ month programs require payment)
                if (type === "training_program_listing" && userId) {
                    const durationDays = metadata.durationDays ? parseInt(metadata.durationDays, 10) : 60;
                    const programDataStr = metadata.programData;

                    if (!programDataStr) {
                        console.error("Missing programData in training_program_listing metadata");
                        break;
                    }

                    let programData;
                    try {
                        programData = JSON.parse(programDataStr);
                    } catch (parseErr) {
                        console.error("Failed to parse programData:", parseErr);
                        break;
                    }

                    // Calculate expiration date for the listing
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + durationDays);

                    // Create the training program
                    await db.collection("training_programs").add({
                        ...programData,
                        organizationId: userId,
                        status: "approved",
                        active: true,
                        featured: true,
                        featuredAt: new Date(),
                        featuredExpiresAt: expiresAt,
                        listingExpiresAt: expiresAt,
                        paymentStatus: "paid",
                        paymentId: session.payment_intent as string,
                        productType: productType || "FEATURED_60",
                        amountPaid: session.amount_total,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        viewCount: 0,
                        clickCount: 0,
                    });

                    // Save payment record
                    await savePaymentRecord(
                        db,
                        session,
                        "training_program_listing",
                        `Training Program Listing (${durationDays} days): ${programData.title || "Training Program"}`
                    );

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
                    } catch (updateErr) {
                        console.error("Failed to update job payment status:", updateErr);
                    }
                }
                if (failedMetadata.conferenceId) {
                    try {
                        await db.collection("conferences").doc(failedMetadata.conferenceId).update({
                            paymentStatus: "failed",
                        });
                    } catch (updateErr) {
                        console.error("Failed to update conference payment status:", updateErr);
                    }
                }
                break;
            }

            case "charge.refunded": {
                const charge = event.data.object as Stripe.Charge;
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
                        }
                    } catch (refundErr) {
                        console.error("Failed to process refund:", refundErr);
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
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
                const invoiceSubscription = (invoice as any).subscription;
                const subscriptionId = typeof invoiceSubscription === "string"
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
                        }
                    } catch (invoiceErr) {
                        console.error("Failed to process invoice failure:", invoiceErr);
                    }
                }
                break;
            }

            default:
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
            await import("@/lib/firebase-admin");
            const emergencyDb = getFirestore();
            await emergencyDb.collection("system_logs").add({
                event: "stripe_webhook_error",
                error: errMessage,
                stack: errStack,
                timestamp: new Date(),
            });
        } catch (logErr) {
            console.error("Failed to log to Firestore:", logErr);
        }

        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 400 }
        );
    }
}
