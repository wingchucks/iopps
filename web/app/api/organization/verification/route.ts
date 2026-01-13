import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// GET - Get current verification status
export async function GET(request: NextRequest) {
  try {
    // Verify server configuration
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const employerId = decodedToken.uid;

    const employerRef = db.collection("employers").doc(employerId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const data = employerDoc.data();
    const verification = data?.indigenousVerification || { status: "not_requested" };

    return NextResponse.json({ verification });
  } catch (error) {
    console.error("Get verification error:", error);
    return NextResponse.json(
      { error: "Failed to get verification status" },
      { status: 500 }
    );
  }
}

// POST - Request verification
export async function POST(request: NextRequest) {
  try {
    // Verify server configuration
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const employerId = decodedToken.uid;

    const body = await request.json();
    const {
      isIndigenousOwned,
      isIndigenousLed,
      nationAffiliation,
      certifications,
      requestNotes,
    } = body;

    // Validate at least one ownership/leadership claim
    if (!isIndigenousOwned && !isIndigenousLed) {
      return NextResponse.json(
        { error: "Please indicate Indigenous ownership or leadership" },
        { status: 400 }
      );
    }

    const employerRef = db.collection("employers").doc(employerId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    // Check if already pending or approved
    const currentData = employerDoc.data();
    const currentStatus = currentData?.indigenousVerification?.status;

    if (currentStatus === "pending") {
      return NextResponse.json(
        { error: "Verification request already pending" },
        { status: 400 }
      );
    }

    if (currentStatus === "approved") {
      return NextResponse.json(
        { error: "Already verified" },
        { status: 400 }
      );
    }

    // Create verification request
    const verification = {
      status: "pending",
      isIndigenousOwned: !!isIndigenousOwned,
      isIndigenousLed: !!isIndigenousLed,
      nationAffiliation: nationAffiliation || null,
      certifications: certifications || [],
      requestNotes: requestNotes || null,
      requestedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
      rejectionReason: null,
    };

    await employerRef.update({
      indigenousVerification: verification,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify admin (optional - send email or create notification)
    try {
      await db.collection("notifications").add({
        userId: "admin", // or specific admin user ID
        type: "verification_request",
        title: "New Indigenous Verification Request",
        message: `${currentData?.organizationName || "An employer"} has requested Indigenous business verification.`,
        link: `/admin/verifications/${employerId}`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (notifyError) {
      console.error("Failed to notify admin:", notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Verification request submitted",
      verification: { ...verification, requestedAt: new Date() },
    });
  } catch (error) {
    console.error("Request verification error:", error);
    return NextResponse.json(
      { error: "Failed to submit verification request" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel pending verification request
export async function DELETE(request: NextRequest) {
  try {
    // Verify server configuration
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const employerId = decodedToken.uid;

    const employerRef = db.collection("employers").doc(employerId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const currentData = employerDoc.data();
    const currentStatus = currentData?.indigenousVerification?.status;

    if (currentStatus !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending requests" },
        { status: 400 }
      );
    }

    await employerRef.update({
      indigenousVerification: { status: "not_requested" },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Verification request cancelled",
    });
  } catch (error) {
    console.error("Cancel verification error:", error);
    return NextResponse.json(
      { error: "Failed to cancel verification request" },
      { status: 500 }
    );
  }
}
