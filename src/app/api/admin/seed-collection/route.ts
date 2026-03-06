import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdminServiceRequest } from "@/lib/internal-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminServiceRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const { collection, docId, data } = await req.json();
    if (!collection || !docId || !data) {
      return NextResponse.json({ error: "Missing collection, docId, or data" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection(collection).doc(docId).set(data, { merge: true });
    return NextResponse.json({ ok: true, collection, id: docId });
  } catch (err) {
    console.error("seed-collection error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
