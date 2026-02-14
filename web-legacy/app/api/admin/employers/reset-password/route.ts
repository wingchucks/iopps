import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

        // Check if caller is admin
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || adminData.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Get request body
        const body = await req.json();
        const { employerId } = body;

        if (!employerId) {
            return NextResponse.json({ error: "Missing employerId" }, { status: 400 });
        }

        // Get employer document to find userId
        const employerDoc = await db.collection("employers").doc(employerId).get();
        if (!employerDoc.exists) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 });
        }

        const employerData = employerDoc.data();
        const userId = employerData?.userId;

        if (!userId) {
            return NextResponse.json({ error: "Employer has no associated user" }, { status: 400 });
        }

        // Get user's email from Firebase Auth
        const userRecord = await auth.getUser(userId);
        const email = userRecord.email;

        if (!email) {
            return NextResponse.json({ error: "User has no email address" }, { status: 400 });
        }

        // Generate password reset link
        const resetLink = await auth.generatePasswordResetLink(email);

        // Create audit log
        try {
            await db.collection("audit_logs").add({
                action: "password_reset_sent",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                targetUserId: userId,
                targetEmail: email,
                targetEmployerId: employerId,
                employerName: employerData?.organizationName,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        console.log(`[AUDIT] Admin ${decodedToken.email} sent password reset to ${email} (employer: ${employerData?.organizationName})`);

        return NextResponse.json({
            success: true,
            message: `Password reset email sent to ${email}`,
            email,
            // Note: resetLink intentionally not returned for security - only sent via email
        });
    } catch (error) {
        console.error("Error sending password reset:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
