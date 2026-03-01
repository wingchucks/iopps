import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updates } = await request.json();
    if (!Array.isArray(updates)) return NextResponse.json({ error: "updates array required" }, { status: 400 });

    const db = getAdminDb();
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let count = 0;

    for (const { collection, id, data } of updates) {
      if (!collection || !id || !data) continue;
      batch.update(db.collection(collection).doc(id), data);
      count++;
      if (count % BATCH_SIZE === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }

    if (count % BATCH_SIZE !== 0) await batch.commit();

    return NextResponse.json({ success: true, updated: count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}