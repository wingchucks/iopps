import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";
import { normalizeAdminEmployerRow } from "@/lib/admin/employers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployerStatus = "pending" | "approved" | "rejected";
type EmployerAction = "approve" | "reject";
type EmployerType = "business" | "school";

interface UpdateEmployerBody {
  employerId: string;
  action: EmployerAction;
  reason?: string;
}

// ---------------------------------------------------------------------------
// GET /api/admin/employers
// ---------------------------------------------------------------------------

/**
 * List employer profiles with optional status filter.
 *
 * Query params:
 *   status - "pending" | "approved" | "rejected" (optional)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as EmployerStatus | null;
    const type = searchParams.get("type") as EmployerType | null;

    const validStatuses: ReadonlySet<string> = new Set([
      "pending",
      "approved",
      "rejected",
    ]);
    const validTypes: ReadonlySet<string> = new Set(["business", "school"]);

    if (status && !validStatuses.has(status)) {
      return NextResponse.json(
        { error: "Invalid status filter. Must be: pending, approved, or rejected" },
        { status: 400 }
      );
    }

    if (type && !validTypes.has(type)) {
      return NextResponse.json(
        { error: "Invalid type filter. Must be: business or school" },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection("employers")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const normalizedEmployers = snapshot.docs.map((doc) =>
      normalizeAdminEmployerRow({ id: doc.id, ...doc.data() }, doc.id),
    );

    const employers = normalizedEmployers.filter((employer) => {
      if (status && employer.status !== status) return false;
      if (type && employer.accountType !== type) return false;
      return true;
    });

    const summary = {
      total: normalizedEmployers.length,
      pending: normalizedEmployers.filter((employer) => employer.status === "pending").length,
      approved: normalizedEmployers.filter((employer) => employer.status === "approved").length,
      rejected: normalizedEmployers.filter((employer) => employer.status === "rejected").length,
      schools: normalizedEmployers.filter((employer) => employer.accountType === "school").length,
      businesses: normalizedEmployers.filter((employer) => employer.accountType === "business").length,
    };

    return NextResponse.json({ employers, summary });
  } catch (error) {
    console.error("[GET /api/admin/employers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employers" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/employers
// ---------------------------------------------------------------------------

/**
 * Approve or reject an employer.
 *
 * Body:
 *   employerId - the document ID of the employer
 *   action     - "approve" | "reject"
 *   reason     - optional rejection reason (required for reject)
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as UpdateEmployerBody;

    if (!body.employerId || typeof body.employerId !== "string") {
      return NextResponse.json(
        { error: "employerId is required" },
        { status: 400 }
      );
    }

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const employerRef = adminDb.collection("employers").doc(body.employerId);
    const organizationRef = adminDb.collection("organizations").doc(body.employerId);
    const employerSnap = await employerRef.get();

    if (!employerSnap.exists) {
      return NextResponse.json(
        { error: "Employer not found" },
        { status: 404 }
      );
    }

    if (body.action === "approve") {
      await employerRef.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await organizationRef.set({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        rejectionReason: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await employerRef.update({
        status: "rejected",
        rejectionReason: body.reason ?? "",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await organizationRef.set({
        status: "rejected",
        rejectionReason: body.reason ?? "",
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      employerId: body.employerId,
      action: body.action,
    });
  } catch (error) {
    console.error("[POST /api/admin/employers] Error:", error);
    return NextResponse.json(
      { error: "Failed to update employer" },
      { status: 500 }
    );
  }
}
