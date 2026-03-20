import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { reportId } = await params;

  try {
    const doc = await adminDb.collection("contentFlags").doc(reportId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
      resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() ?? data.resolvedAt ?? null,
      resolutionHistory: (data.resolutionHistory || []).map((h: Record<string, unknown>) => ({
        ...h,
        timestamp: (h.timestamp as { toDate?: () => Date })?.toDate?.()?.toISOString() ?? h.timestamp ?? null,
      })),
    });
  } catch (error) {
    console.error("Error fetching moderation report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { reportId } = await params;
  const body = await request.json();
  const { action, notes, elderConsultation, elderNotes, adminNotes } = body as {
    action: string;
    notes?: string;
    elderConsultation?: boolean;
    elderNotes?: string;
    adminNotes?: string;
  };

  // Handle save_notes action (no status change, just persist notes)
  if (action === "save_notes") {
    try {
      const ref = adminDb.collection("contentFlags").doc(reportId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const noteUpdate: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: auth.decodedToken.uid,
      };
      if (adminNotes !== undefined) noteUpdate.adminNotes = adminNotes;
      if (elderConsultation !== undefined) noteUpdate.elderConsultation = elderConsultation;
      if (elderNotes !== undefined) noteUpdate.elderNotes = elderNotes;

      await ref.update(noteUpdate);
      return NextResponse.json({ success: true, action: "save_notes", reportId });
    } catch (error) {
      console.error("Error saving admin notes:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const validActions = ["dismiss", "warn_user", "suspend_user", "remove_content", "request_elder_input"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const ref = adminDb.collection("contentFlags").doc(reportId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const historyEntry = {
      action,
      notes: notes || "",
      resolvedBy: auth.decodedToken.uid,
      timestamp: FieldValue.serverTimestamp(),
    };

    const update: Record<string, unknown> = {
      status: action === "request_elder_input" ? "pending_elder" : "resolved",
      resolution: action,
      resolutionNotes: notes || "",
      resolvedBy: auth.decodedToken.uid,
      resolvedAt: FieldValue.serverTimestamp(),
      resolutionHistory: FieldValue.arrayUnion(historyEntry),
    };

    if (elderConsultation !== undefined) {
      update.elderConsultation = elderConsultation;
      if (elderNotes !== undefined) update.elderNotes = elderNotes;
    }

    if (adminNotes !== undefined) {
      update.adminNotes = adminNotes;
    }

    await ref.update(update);

    return NextResponse.json({ success: true, action, reportId });
  } catch (error) {
    console.error("Error processing moderation action:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
