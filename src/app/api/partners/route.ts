import { buildPartnersPayload, selectPublicPartnerRecords } from "@/lib/server/partners-payload";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { mergePublicJobRecords, withAuthoritativeJobCounts } from "@/lib/public-job-merge";
import { loadPublicOrganizationsJobDocuments } from "@/lib/server/public-organization-jobs";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("organizations").get();
    const records = selectPublicPartnerRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    const { jobs, posts } = await loadPublicOrganizationsJobDocuments(db, records);
    const publicJobs = mergePublicJobRecords(
      jobs.map((doc) => ({ ...doc.data(), id: doc.id, active: doc.data()!.active === true })),
      posts.map((doc) => ({ ...doc.data(), id: doc.id })),
    );
    const organizations = withAuthoritativeJobCounts(
      records,
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
