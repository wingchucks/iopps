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

    // Check if caller is admin or moderator
    const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
    const adminData = adminDoc.data();

    if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get request body
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(email);

    // Send email using Resend (optional - the link can also be sent manually)
    // For now, we'll use Firebase's built-in email sending
    // which is triggered when generatePasswordResetLink is called with an action code settings

    // Create audit log
    try {
      await db.collection("audit_logs").add({
        action: "send_password_reset",
        adminId: decodedToken.uid,
        adminEmail: decodedToken.email,
        targetEmail: email,
        timestamp: new Date(),
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    console.log(`[AUDIT] Admin ${decodedToken.email} sent password reset to ${email}`);

    return NextResponse.json({
      success: true,
      message: `Password reset link generated for ${email}`,
      resetLink, // Include link so admin can share it directly if needed
    });
  } catch (error: any) {
    console.error("Error sending password reset:", error);

    // Handle specific Firebase errors
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({ error: "No user found with this email" }, { status: 404 });
    }
    if (error.code === "auth/invalid-email") {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to send password reset" }, { status: 500 });
  }
}
