import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdminServiceRequest } from "@/lib/internal-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminServiceRequest(request);
  if (unauthorized) return unauthorized;

  const db = getAdminDb();
  const snap = await db.collection("users").get();

  const BATCH_SIZE = 500;
  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.newsletterOptIn === undefined || data.newsletterOptIn === null) {
      batch.update(doc.ref, { newsletterOptIn: true });
      batchCount++;
      updated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) await batch.commit();

  return NextResponse.json({ success: true, updated, total: snap.size });
}
