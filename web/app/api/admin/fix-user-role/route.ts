import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

// Valid roles that can be assigned
const VALID_ROLES = ["community", "employer", "moderator", "admin"] as const;
type ValidRole = typeof VALID_ROLES[number];

// Quick fix endpoint for specific user role issues
// DELETE THIS FILE after fixing the user
export async function POST(request: NextRequest) {
    try {
        if (!auth || !db) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 503 });
        }

        // Verify admin authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if user is admin
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
        }

        // Validate role is in the allowed list
        if (!VALID_ROLES.includes(role as ValidRole)) {
            return NextResponse.json({
                error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`
            }, { status: 400 });
        }

        // Prevent self-demotion from admin (safety check)
        if (userId === decodedToken.uid && role !== "admin") {
            return NextResponse.json({
                error: "Cannot demote your own admin account"
            }, { status: 400 });
        }

        // Update the user's role
        await db.collection("users").doc(userId).update({
            role: role,
            updatedAt: new Date(),
        });

        // Log the role change for audit
        console.log(`[AUDIT] Admin ${decodedToken.email} changed user ${userId} role to ${role}`);

        return NextResponse.json({
            success: true,
            message: `Updated user ${userId} role to ${role}`
        });
    } catch (error) {
        console.error("Fix user role error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fix user role" },
            { status: 500 }
        );
    }
}
