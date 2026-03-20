import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { collection, field, value, action } = body;

  if (!collection || !field || !value || action !== "delete") {
    return NextResponse.json({ error: "collection, field, value, and action=delete required" }, { status: 400 });
  }

  const db = getAdminDb();
  const snap = await db.collection(collection).where(field, "==", value).get();

  if (snap.empty) {
    return NextResponse.json({ deleted: 0, message: "No matching docs found" });
  }

  const docs = snap.docs.map(d => ({ id: d.id, title: d.data().title || d.data().name || d.id }));
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ deleted: snap.size, docs });
}
