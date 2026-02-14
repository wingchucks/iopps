/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper: verify admin/moderator
async function verifyAdmin(req: NextRequest) {
  if (!auth || !db) {
    return { error: "Server configuration error", status: 503 };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await auth.verifyIdToken(token);
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const userData = userDoc.data();

  if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }

  return { uid: decoded.uid };
}

// GET - List employers with verification requests
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdmin(req);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";

    // Query all employers that have an indigenousVerification field
    const employersRef = db!.collection("employers");
    const snap = await employersRef.get();

    const requests: any[] = [];
    const counts = { pending: 0, approved: 0, rejected: 0 };

    snap.docs.forEach((doc) => {
      const data = doc.data();
      const v = data.indigenousVerification;
      if (!v || v.status === "not_requested") return;

      // Count all statuses
      if (v.status === "pending") counts.pending++;
      else if (v.status === "approved") counts.approved++;
      else if (v.status === "rejected") counts.rejected++;

      // Filter by status
      if (status !== "all" && v.status !== status) return;

      requests.push({
        employerId: doc.id,
        organizationName: data.organizationName || "Unknown",
        logoUrl: data.logoUrl || null,
        industry: data.industry || null,
        location: data.location || null,
        website: data.website || null,
        contactEmail: data.contactEmail || null,
        employerStatus: data.status,
        verification: {
          status: v.status,
          isIndigenousOwned: v.isIndigenousOwned || false,
          isIndigenousLed: v.isIndigenousLed || false,
          nationAffiliation: v.nationAffiliation || null,
          certifications: v.certifications || [],
          requestNotes: v.requestNotes || null,
          requestedAt: v.requestedAt?._seconds
            ? new Date(v.requestedAt._seconds * 1000).toISOString()
            : null,
          reviewedAt: v.reviewedAt?._seconds
            ? new Date(v.reviewedAt._seconds * 1000).toISOString()
            : null,
          reviewedBy: v.reviewedBy || null,
          reviewNotes: v.reviewNotes || null,
          rejectionReason: v.rejectionReason || null,
        },
      });
    });

    // Sort: pending first, then by request date descending
    requests.sort((a, b) => {
      if (a.verification.status === "pending" && b.verification.status !== "pending") return -1;
      if (a.verification.status !== "pending" && b.verification.status === "pending") return 1;
      const aDate = a.verification.requestedAt || "";
      const bDate = b.verification.requestedAt || "";
      return bDate.localeCompare(aDate);
    });

    return NextResponse.json({ requests, counts });
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification requests" },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject a verification request
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await verifyAdmin(req);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await req.json();
    const { employerId, action, reviewNotes, rejectionReason } = body;

    if (!employerId || !action) {
      return NextResponse.json(
        { error: "employerId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: "rejectionReason is required when rejecting" },
        { status: 400 }
      );
    }

    const employerRef = db!.collection("employers").doc(employerId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const data = employerDoc.data();
    const currentStatus = data?.indigenousVerification?.status;

    if (!currentStatus || currentStatus === "not_requested") {
      return NextResponse.json(
        { error: "No verification request found" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      "indigenousVerification.status": action === "approve" ? "approved" : "rejected",
      "indigenousVerification.reviewedAt": FieldValue.serverTimestamp(),
      "indigenousVerification.reviewedBy": authResult.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (reviewNotes) {
      updateData["indigenousVerification.reviewNotes"] = reviewNotes;
    }

    if (action === "reject") {
      updateData["indigenousVerification.rejectionReason"] = rejectionReason;
    }

    await employerRef.update(updateData);

    // Create notification for the employer
    try {
      await db!.collection("notifications").add({
        userId: employerId,
        type: "system",
        title:
          action === "approve"
            ? "Indigenous Verification Approved"
            : "Indigenous Verification Update",
        message:
          action === "approve"
            ? "Your Indigenous business verification has been approved. Your profile now displays a verified badge."
            : `Your Indigenous business verification request was not approved. Reason: ${rejectionReason}`,
        link: "/organization/profile",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (notifyError) {
      console.error("Failed to send notification:", notifyError);
    }

    return NextResponse.json({
      success: true,
      message: `Verification ${action === "approve" ? "approved" : "rejected"}`,
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json(
      { error: "Failed to update verification" },
      { status: 500 }
    );
  }
}
