/**
 * Script to fix missed webhook payments
 * Finds checkout sessions that succeeded but weren't processed
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Stripe from "stripe";
import * as admin from "firebase-admin";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia",
});

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, "base64").toString("utf-8")
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function findMissedWebhooks() {
    console.log("Fetching recent checkout sessions from Stripe...");
    
    // Get checkout sessions from the last 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: sevenDaysAgo },
    });

    console.log(`Found ${sessions.data.length} checkout sessions`);

    const missedSessions: Stripe.Checkout.Session[] = [];

    for (const session of sessions.data) {
        if (session.payment_status !== "paid") {
            continue;
        }

        const metadata = session.metadata || {};
        const { type, userId } = metadata;

        if (type === "subscription" && userId) {
            // Check if this was processed in Firestore
            const employerRef = db.collection("employers").doc(userId);
            const employerDoc = await employerRef.get();
            const employerData = employerDoc.data();

            // Check if subscription exists and was set after this payment
            const subscription = employerData?.subscription;
            if (!subscription || !subscription.paymentId) {
                console.log(`MISSED: Session ${session.id} for user ${userId} - no subscription found`);
                missedSessions.push(session);
            } else if (subscription.paymentId !== session.payment_intent) {
                console.log(`MISSED: Session ${session.id} for user ${userId} - different payment ID`);
                missedSessions.push(session);
            } else {
                console.log(`OK: Session ${session.id} for user ${userId} - already processed`);
            }
        }
    }

    return missedSessions;
}

async function processSession(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const { type, productType, userId, duration, jobCredits, featuredJobCredits, unlimitedPosts, talentPoolAccessDays } = metadata;

    if (type !== "subscription" || !userId) {
        console.log(`Skipping session ${session.id} - not a subscription or no userId`);
        return;
    }

    console.log(`Processing session ${session.id} for user ${userId}...`);

    // Parse metadata
    const durationDays = duration ? parseInt(duration, 10) : 365;
    const credits = jobCredits ? parseInt(jobCredits, 10) : 0;
    const featuredCredits = featuredJobCredits ? parseInt(featuredJobCredits, 10) : 0;
    const talentPoolDays = talentPoolAccessDays ? parseInt(talentPoolAccessDays, 10) : 0;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    const employerRef = db.collection("employers").doc(userId);

    const updateData: Record<string, unknown> = {
        subscription: {
            active: true,
            tier: productType || "TIER1",
            purchasedAt: new Date(session.created * 1000),
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

    // Grant talent pool access if included
    if (talentPoolDays > 0) {
        const talentPoolExpiration = new Date();
        talentPoolExpiration.setDate(talentPoolExpiration.getDate() + talentPoolDays);

        updateData.talentPoolAccess = {
            active: true,
            tier: "bundled",
            purchasedAt: new Date(session.created * 1000),
            expiresAt: talentPoolExpiration,
            paymentId: session.payment_intent as string,
            amountPaid: 0,
        };
    }

    // Check if employer is pending and auto-approve
    const employerDoc = await employerRef.get();
    const employerData = employerDoc.exists ? employerDoc.data() : null;

    if (employerData?.status === "pending") {
        updateData.status = "approved";
        updateData.approvedAt = new Date();
        updateData.approvalMethod = "payment_retroactive";
        console.log(`Auto-approving employer ${userId}`);
    }

    await employerRef.update(updateData);
    console.log(`Updated employer ${userId} with subscription data`);

    // Save payment record
    await db.collection("payments").add({
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        userId: userId,
        amount: session.amount_total,
        currency: session.currency,
        status: "completed",
        productType: "subscription",
        productName: `${productType === "TIER2" ? "Unlimited" : "Growth"} Subscription (Retroactive)`,
        metadata: {
            tier: productType,
            jobCredits: credits,
        },
        createdAt: new Date(session.created * 1000),
        processedAt: new Date(),
    });

    console.log(`Saved payment record for session ${session.id}`);
}

async function main() {
    try {
        const missedSessions = await findMissedWebhooks();
        
        if (missedSessions.length === 0) {
            console.log("\n✅ No missed webhooks found! All payments processed.");
            return;
        }

        console.log(`\n⚠️ Found ${missedSessions.length} missed sessions. Processing...`);
        
        for (const session of missedSessions) {
            await processSession(session);
        }

        console.log("\n✅ All missed webhooks processed!");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
