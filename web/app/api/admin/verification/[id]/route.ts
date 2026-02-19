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
      request: { id: doc.id, ...data },
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
  const { action, message, checklist } = body;

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

    await adminDb.collection("verificationRequests").doc(id).update({
      status: statusMap[action],
      checklist: checklist || {},
      reviewMessage: message || "",
      reviewedBy: auth.decodedToken.uid,
      reviewedAt: now,
      updatedAt: now,
    });

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
