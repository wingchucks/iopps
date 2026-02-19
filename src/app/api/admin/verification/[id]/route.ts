import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { id } = await params;

  try {
    const doc = await adminDb.collection("verificationRequests").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = doc.data() as Record<string, unknown>;

    // Serialize Firestore timestamps to ISO strings
    const serialized: Record<string, unknown> = { ...data };
    for (const key of ["submittedAt", "createdAt", "reviewedAt", "updatedAt"]) {
      const val = serialized[key];
      if (val && typeof val === "object" && "toDate" in (val as object)) {
        serialized[key] = (val as { toDate: () => Date }).toDate().toISOString();
      }
    }

    // Fetch employer info
    let employer = null;
    if (data?.employerId) {
      const empDoc = await adminDb
        .collection("employers")
        .doc(data.employerId as string)
        .get();
      if (empDoc.exists) {
        employer = { id: empDoc.id, ...empDoc.data() };
      }
    }

    return NextResponse.json({
      request: { id: doc.id, ...serialized },
      employer,
    });
  } catch (error) {
    console.error("Error fetching verification request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, message, checklist, elderConsultation, elderNotes } = body as {
    action: string;
    message?: string;
    checklist?: Record<string, boolean>;
    elderConsultation?: boolean;
    elderNotes?: string;
  };

  if (!action || !["approve", "requestInfo", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const doc = await adminDb.collection("verificationRequests").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = doc.data() as Record<string, unknown>;
    const now = new Date().toISOString();

    const statusMap: Record<string, string> = {
      approve: "approved",
      requestInfo: "info_requested",
      reject: "rejected",
    };

    const updateData: Record<string, unknown> = {
      status: statusMap[action],
      checklist: checklist || {},
      reviewMessage: message || "",
      reviewedBy: auth.decodedToken.uid,
      reviewedAt: now,
      updatedAt: now,
    };

    // Store elder consultation flag and notes
    if (elderConsultation !== undefined) {
      updateData.elderConsultation = elderConsultation;
    }
    if (elderNotes !== undefined) {
      updateData.elderNotes = elderNotes;
    }

    await adminDb.collection("verificationRequests").doc(id).update(updateData);

    // On approve, update employer verification status
    if (action === "approve" && data.employerId) {
      await adminDb
        .collection("employers")
        .doc(data.employerId as string)
        .update({
          verificationStatus: "verified",
          verified: true,
          verifiedAt: now,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing verification action:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
