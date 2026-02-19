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
  const doc = await adminDb.collection("contentFlags").doc(reportId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const data = doc.data()!;
  return NextResponse.json({
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() ?? null,
    resolutionHistory: (data.resolutionHistory || []).map((h: Record<string, unknown>) => ({
      ...h,
      timestamp: (h.timestamp as { toDate?: () => Date })?.toDate?.()?.toISOString() ?? null,
    })),
  });
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
  const { action, notes, elderConsultation, elderNotes } = body as {
    action: string;
    notes?: string;
    elderConsultation?: boolean;
    elderNotes?: string;
  };

  const validActions = ["dismiss", "warn_user", "suspend_user", "remove_content", "request_elder_input"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

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
    if (elderNotes) update.elderNotes = elderNotes;
  }

  await ref.update(update);

  return NextResponse.json({ success: true, action, reportId });
}
