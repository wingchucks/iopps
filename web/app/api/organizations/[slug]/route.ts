import { NextResponse } from "next/server";
import { getOrganizationBySlug, getOrganization } from "@/lib/firestore/organizations";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Try slug lookup first, then fall back to ID lookup
    let organization = await getOrganizationBySlug(slug);
    if (!organization) {
      organization = await getOrganization(slug);
    }

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch active jobs for this organization
    let jobs: Record<string, unknown>[] = [];
    if (adminDb) {
      try {
        const jobsSnap = await adminDb
          .collection("jobs")
          .where("employerId", "==", organization.id)
          .where("status", "==", "active")
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();

        jobs = jobsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch {
        // Jobs query may fail if index doesn't exist yet — return empty
      }
    }

    return NextResponse.json({ organization, jobs });
  } catch (error) {
    console.error("[GET /api/organizations/[slug]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
