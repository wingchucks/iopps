import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json(
                { error: "Session ID is required" },
                { status: 400 }
            );
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Verify the session belongs to this user
        if (session.metadata?.userId !== userId) {
            return NextResponse.json(
                { error: "Session does not belong to this user" },
                { status: 403 }
            );
        }

        // Check if payment was successful
        if (session.payment_status !== "paid") {
            return NextResponse.json(
                { error: "Payment not completed", status: session.payment_status },
                { status: 400 }
            );
        }

        // Check if this is a vendor purchase that needs role upgrade
        const { type, upgradeToEmployer, vendorId, productType, duration, featured } = session.metadata || {};

        if (type !== "vendor") {
            return NextResponse.json(
                { error: "This endpoint is for vendor sessions only" },
                { status: 400 }
            );
        }

        // Get current user role
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const currentRole = userDoc.data()?.role;

        // If already employer, session was processed
        if (currentRole === "employer") {
            return NextResponse.json({
                success: true,
                message: "Role already updated",
                role: "employer",
            });
        }

        // Process the vendor subscription (same logic as webhook)
        const durationDays = duration ? parseInt(duration, 10) : 30;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + durationDays);

        const vendorRef = db.collection("vendors").doc(vendorId || userId);
        const vendorDoc = await vendorRef.get();

        // Create or update vendor document
        if (vendorDoc.exists) {
            const existingData = vendorDoc.data() || {};
            const updateData: Record<string, any> = {
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
            };

            // Ensure ownerUserId is set if missing
            if (!existingData.ownerUserId) {
                updateData.ownerUserId = userId;
            }

            await vendorRef.update(updateData);
        } else {
            await vendorRef.set({
                id: vendorId || userId,
                ownerUserId: userId, // Always set ownerUserId for new vendor documents
                userId: userId, // For shop display compatibility
                active: true,
                featured: featured === "true",
                // Shop display fields - will be populated when user completes profile
                slug: '', // Empty until profile is set up
                businessName: '',
                status: 'draft', // Draft until profile is completed
                verificationStatus: 'pending',
                approvalStatus: 'approved', // Pre-approved since they paid
                // Initialize metrics
                profileViews: 0,
                websiteClicks: 0,
                favorites: 0,
                followers: 0,
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

        // Upgrade user role if needed
        if (upgradeToEmployer === "true") {
            await userRef.update({
                role: "employer",
            });

            // Also create employer document if it doesn't exist
            const employerRef = db.collection("employers").doc(userId);
            const employerDoc = await employerRef.get();
            if (!employerDoc.exists) {
                const userData = userDoc.data();
                await employerRef.set({
                    id: userId,
                    name: userData?.displayName || "",
                    email: userData?.email || "",
                    createdAt: new Date(),
                    subscription: null,
                });
            }

            console.log(`User ${userId} upgraded from community to employer via session verification`);
        }

        return NextResponse.json({
            success: true,
            message: "Subscription activated successfully",
            role: "employer",
        });
    } catch (error: any) {
        console.error("Verify vendor session error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to verify session" },
            { status: 500 }
        );
    }
}
