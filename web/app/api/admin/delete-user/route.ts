import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Collections that have user-related data to soft delete
const USER_RELATED_COLLECTIONS = [
    { collection: "memberProfiles", field: "userId", useDocId: true },
    { collection: "savedJobs", field: "userId", useDocId: false },
    { collection: "applications", field: "applicantId", useDocId: false },
    { collection: "notifications", field: "userId", useDocId: false },
    { collection: "jobAlerts", field: "memberId", useDocId: false },
    { collection: "favorites", field: "userId", useDocId: false },
    { collection: "follows", field: "userId", useDocId: false },
    { collection: "reviews", field: "userId", useDocId: false },
];

async function softDeleteCollection(
    collectionName: string,
    field: string,
    userId: string,
    deletedBy: string,
    useDocId: boolean
): Promise<number> {
    if (!db) return 0;

    let count = 0;

    if (useDocId) {
        // Document ID matches userId
        const docRef = db.collection(collectionName).doc(userId);
        const doc = await docRef.get();
        if (doc.exists) {
            await docRef.update({
                deletedAt: FieldValue.serverTimestamp(),
                deletedBy,
            });
            count = 1;
        }
    } else {
        // Query by field
        const snapshot = await db.collection(collectionName).where(field, "==", userId).get();
        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                deletedAt: FieldValue.serverTimestamp(),
                deletedBy,
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
        }
    }

    return count;
}

export async function POST(req: NextRequest) {
    // Rate limiting
    const rateLimitResult = rateLimiters.auth(req);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        // Check if Firebase Admin is initialized
        if (!auth || !db) {
            console.error("Firebase Admin not initialized");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        // Verify authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if caller is admin
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || adminData.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Get request body
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === decodedToken.uid) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        // Verify target user exists
        const targetUserDoc = await db.collection("users").doc(userId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const targetUserData = targetUserDoc.data();

        // Prevent deletion of other admins (safety measure)
        if (targetUserData?.role === "admin") {
            return NextResponse.json({ error: "Cannot delete other admin accounts" }, { status: 400 });
        }

        // 1. Delete user from Firebase Auth (allows re-registration with same email)
        try {
            await auth.deleteUser(userId);
        } catch (authError: any) {
            // If user doesn't exist in Auth, continue
            if (authError.code !== "auth/user-not-found") {
                console.error("Error deleting user from Auth:", authError);
            }
        }

        // 2. Soft delete user document
        await db.collection("users").doc(userId).update({
            deletedAt: FieldValue.serverTimestamp(),
            deletedBy: decodedToken.uid,
            disabled: true,
        });

        // 3. Cascade soft delete to related collections
        const deletionResults: Record<string, number> = {};

        for (const { collection, field, useDocId } of USER_RELATED_COLLECTIONS) {
            try {
                const count = await softDeleteCollection(collection, field, userId, decodedToken.uid, useDocId);
                deletionResults[collection] = count;
            } catch (error) {
                console.error(`Error soft deleting from ${collection}:`, error);
                deletionResults[collection] = -1; // Indicate error
            }
        }

        // 4. Create audit log
        try {
            await db.collection("audit_logs").add({
                action: "delete_user",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                targetUserId: userId,
                targetUserEmail: targetUserData?.email,
                deletionResults,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        console.log(`[AUDIT] Admin ${decodedToken.email} deleted user ${userId}`);

        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
            deletionResults,
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
