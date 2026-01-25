import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyAdmin } from "@/lib/admin-notifications";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
            console.error("Firebase Admin not initialized - check environment variables");
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
        const userEmail = decodedToken.email;

        // Get user document
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Verify user is currently a community member
        const userData = userDoc.data();
        if (userData?.role !== "community") {
            return NextResponse.json(
                { error: "Only community members can upgrade to employer. You are already an employer or have a different role." },
                { status: 400 }
            );
        }

        // Check for existing employer application
        const existingEmployer = await db.collection("employers").doc(userId).get();
        if (existingEmployer.exists) {
            const existingData = existingEmployer.data();
            if (existingData?.status === "pending") {
                return NextResponse.json(
                    { error: "You already have a pending employer application. Please wait for admin review." },
                    { status: 400 }
                );
            }
            if (existingData?.status === "rejected") {
                return NextResponse.json(
                    { error: "Your previous application was not approved. Please contact support for assistance." },
                    { status: 400 }
                );
            }
        }

        // Get organization data from request
        const body = await request.json();
        const { organizationName, description, intent, website } = body as {
            organizationName: string;
            description: string;
            intent: string;
            website?: string;
        };

        // Validate required fields
        if (!organizationName || organizationName.trim().length < 2) {
            return NextResponse.json(
                { error: "Organization name is required (minimum 2 characters)" },
                { status: 400 }
            );
        }

        if (!description || description.trim().length < 50) {
            return NextResponse.json(
                { error: "Description is required (minimum 50 characters)" },
                { status: 400 }
            );
        }

        if (!intent) {
            return NextResponse.json(
                { error: "Please select what you plan to do with your employer account" },
                { status: 400 }
            );
        }

        // Create employer application (pending approval)
        // Note: User role stays as "community" until admin approves
        await db.collection("employers").doc(userId).set({
            id: userId,
            userId,
            organizationName: organizationName.trim(),
            description: description.trim(),
            intent,
            website: website?.trim() || "",
            email: userEmail || "",
            status: "pending", // Requires admin approval
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Send admin notification for review (fire and forget)
        notifyAdmin({
            type: "new_employer",
            organizationName: organizationName.trim(),
            employerEmail: userEmail || "Unknown",
            intent,
            status: "pending",
        }).catch(console.error);

        return NextResponse.json({
            success: true,
            message: "Your application has been submitted and is pending review",
            status: "pending",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upgrade account";
        console.error("Upgrade to employer error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
