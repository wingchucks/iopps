import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    // Rate limiting for admin impersonation
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
            console.error("Firebase Admin not initialized - check environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];

        // Verify the admin's token
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if the user is actually an admin
        // We can check custom claims or look up the user in Firestore
        // For now, let's look up in Firestore as that's how the frontend checks
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Restrict impersonation to super admins only (using private env var, not public)
        const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);

        if (SUPER_ADMIN_EMAILS.length === 0) {
            console.error("SUPER_ADMIN_EMAILS environment variable not configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
        }

        if (!decodedToken.email || !SUPER_ADMIN_EMAILS.includes(decodedToken.email.toLowerCase())) {
            console.warn(`Impersonation attempt denied for ${decodedToken.email}`);
            return NextResponse.json({ error: "Forbidden: Only super admins can impersonate users." }, { status: 403 });
        }

        const body = await req.json();
        const { targetUserId } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        }

        // Verify target user exists
        const targetUserDoc = await db.collection("users").doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "Target user not found" }, { status: 404 });
        }

        // Log impersonation for audit trail
        console.log(`[AUDIT] Admin ${decodedToken.email} (${decodedToken.uid}) impersonating user ${targetUserId}`);

        // Store audit log in Firestore
        try {
            await db.collection("audit_logs").add({
                action: "impersonate",
                adminId: decodedToken.uid,
                adminEmail: decodedToken.email,
                targetUserId,
                timestamp: new Date(),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
            // Continue anyway - don't block impersonation due to audit log failure
        }

        // Create custom token for the target user
        const customToken = await auth.createCustomToken(targetUserId);

        return NextResponse.json({ token: customToken });
    } catch (error) {
        console.error("Error creating custom token:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
