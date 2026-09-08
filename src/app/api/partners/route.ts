import { buildPartnersPayload, type JsonRecord } from "@/lib/server/partners-payload";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mergePublicJobRecords, withAuthoritativeJobCounts } from "@/lib/public-job-merge";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminDb();
    const [snapshot, jobsSnapshot, postsSnapshot] = await Promise.all([
      db.collection("organizations").get(),
      db.collection("jobs").where("active", "==", true).get(),
      db.collection("posts").where("type", "==", "job").where("status", "==", "active").get(),
    ]);
    const publicJobs = mergePublicJobRecords(
      jobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      postsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    );
    const organizations = withAuthoritativeJobCounts(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as JsonRecord),
      publicJobs,
    );

    return NextResponse.json(
      buildPartnersPayload(organizations),
    );
  } catch (err) {
    console.error("[api/partners] Error:", err);
    return NextResponse.json(
      { partners: [], groups: { premium: [], school: [], standard: [] } },
      { status: 500 },
    );
  }
}
