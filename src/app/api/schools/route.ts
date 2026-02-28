import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminDb();

    // Only show schools with an active plan (paid)
    const snap = await db
      .collection("organizations")
      .where("type", "==", "school")
      .where("onboardingComplete", "==", true)
      .get();

    const tierSnap = await db
      .collection("organizations")
      .where("tier", "==", "school")
      .where("onboardingComplete", "==", true)
      .get();

    const seen = new Set<string>();
    const schools: Record<string, unknown>[] = [];

    for (const doc of [...snap.docs, ...tierSnap.docs]) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const data = doc.data();
      // Only include schools with a paid plan
      if (data.plan && data.plan !== "free") {
        schools.push({ id: doc.id, ...data });
      }
    }

    return NextResponse.json(schools);
  } catch (err) {
    console.error("Failed to fetch schools:", err);
    return NextResponse.json([], { status: 500 });
  }
}
