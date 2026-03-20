import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = getAdminDb();
    const found = await findPublicJobDocument(db, id);

    if (found) {
      await db.collection(found.source).doc(found.id).update({ viewCount: FieldValue.increment(1) });
      return NextResponse.json({ ok: true });
    }

    // Document not found in either collection — still return ok
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[job-view] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
