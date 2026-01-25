import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";
import { softDeleteOrganization } from "@/lib/firestore/organizations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Collections that have employer-related data to soft delete
const EMPLOYER_RELATED_COLLECTIONS = [
    { collection: "jobs", field: "employerId" },
    { collection: "conferences", field: "employerId" },
    { collection: "scholarships", field: "employerId" },
];

// Collections that have user-related data to soft delete (for the associated user)
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

async function softDeleteByField(
    collectionName: string,
    field: string,
    value: string,
    deletedBy: string
): Promise<number> {
    if (!db) return 0;

    const snapshot = await db.collection(collectionName).where(field, "==", value).get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            deletedAt: FieldValue.serverTimestamp(),
            deletedBy,
        });
    });

    await batch.commit();
    return snapshot.size;
}

async function softDeleteUserRelatedData(
    userId: string,
    deletedBy: string
): Promise<Record<string, number>> {
    if (!db) return {};

    const results: Record<string, number> = {};

    for (const { collection, field, useDocId } of USER_RELATED_COLLECTIONS) {
        try {
            if (useDocId) {
                const docRef = db.collection(collection).doc(userId);
                const doc = await docRef.get();
                if (doc.exists) {
                    await docRef.update({
                        deletedAt: FieldValue.serverTimestamp(),
                        deletedBy,
                    });
                    results[collection] = 1;
                } else {
                    results[collection] = 0;
                }
            } else {
                results[collection] = await softDeleteByField(collection, field, userId, deletedBy);
            }
        } catch (error) {
            console.error(`Error soft deleting from ${collection}:`, error);
            results[collection] = -1;
        }
    }

    return results;
}

export async function POST(req: NextRequest) {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req);
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

        // Check if caller is admin or moderator
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
            return NextResponse.json({ error: "Forbidden: Admin or moderator access required" }, { status: 403 });
        }

        // Get request body
        const body = await req.json();
        const { employerId } = body;

        if (!employerId) {
            return NextResponse.json({ error: "Missing employerId" }, { status: 400 });
        }

        // Verify employer exists
        const employerDoc = await db.collection("employers").doc(employerId).get();
        if (!employerDoc.exists) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 });
        }

        const employerData = employerDoc.data();
        const userId = employerData?.userId;

        // Prevent self-deletion
        if (userId === decodedToken.uid) {
            return NextResponse.json({ error: "Cannot delete your own employer profile" }, { status: 400 });
        }

        const deletionResults: Record<string, number | Record<string, number>> = {};

        // 1. Soft delete employer document using shared function
        // This sets status='deleted', directoryVisible=false, removes from directory_index
        const deleteResult = await softDeleteOrganization(employerId, decodedToken.uid);
        if (!deleteResult.success) {
            return NextResponse.json(
                { error: deleteResult.error || "Failed to delete employer" },
                { status: 400 }
            );
        }
        deletionResults["employers"] = 1;

        // 2. Cascade soft delete to employer-related collections (jobs, conferences, scholarships)
        for (const { collection, field } of EMPLOYER_RELATED_COLLECTIONS) {
            try {
                const count = await softDeleteByField(collection, field, employerId, decodedToken.uid);
                deletionResults[collection] = count;
            } catch (error) {
                console.error(`Error soft deleting from ${collection}:`, error);
                deletionResults[collection] = -1;
            }
        }

        // 3. Also delete the associated user account
        if (userId) {
            // Check if user exists and is not an admin
            const userDoc = await db.collection("users").doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();

                // Don't delete if user is admin
                if (userData?.role !== "admin") {
                    // Disable user in Firebase Auth
                    try {
                        await auth.updateUser(userId, { disabled: true });
                    } catch (authError) {
                        console.error("Error disabling user in Auth:", authError);
                    }

                    // Soft delete user document
                    await db.collection("users").doc(userId).update({
                        deletedAt: FieldValue.serverTimestamp(),
                        deletedBy: decodedToken.uid,
                        disabled: true,
                    });
                    deletionResults["users"] = 1;

                    // Cascade to user-related collections
                    const userResults = await softDeleteUserRelatedData(userId, decodedToken.uid);
                    deletionResults["userRelated"] = userResults;
                }
            }
        }

        // 4. Create audit log
        try {
            await db.collection("audit_logs").add({
                action: "delete_employer",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                targetEmployerId: employerId,
                targetUserId: userId,
                employerName: employerData?.organizationName,
                deletionResults,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        console.log(`[AUDIT] Admin ${decodedToken.email} deleted employer ${employerId} (${employerData?.organizationName})`);

        return NextResponse.json({
            success: true,
            message: "Employer and associated user deleted successfully",
            deletionResults,
        });
    } catch (error) {
        console.error("Error deleting employer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
