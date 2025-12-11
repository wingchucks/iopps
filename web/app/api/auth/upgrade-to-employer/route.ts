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

        // Get organization data from request
        const body = await request.json();
        const { organizationName, description } = body as {
            organizationName: string;
            description?: string;
        };

        // Validate required fields
        if (!organizationName || organizationName.trim().length < 2) {
            return NextResponse.json(
                { error: "Organization name is required (minimum 2 characters)" },
                { status: 400 }
            );
        }

        // Update user role to employer
        await db.collection("users").doc(userId).update({
            role: "employer",
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Create employer profile
        await db.collection("employers").doc(userId).set({
            id: userId,
            userId,
            organizationName: organizationName.trim(),
            description: description?.trim() || "",
            email: userEmail || "",
            status: "approved", // Auto-approve for simplicity
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Send admin notification (fire and forget)
        notifyAdmin({
            type: "new_employer",
            organizationName: organizationName.trim(),
            employerEmail: userEmail || "Unknown",
        }).catch(console.error);

        return NextResponse.json({
            success: true,
            message: "Account upgraded to employer successfully",
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
