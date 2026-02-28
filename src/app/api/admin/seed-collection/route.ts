import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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