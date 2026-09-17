import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { AUDIT_FIELDS, scanCollection, summarizeCollections } from "@/lib/server/release-inventory.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };

// Explicit action, fixed collections/projections/cap, no supplied query or writes.
export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) {
    auth.response.headers.set("Cache-Control", "private, no-store");
    return auth.response;
  }
  if (!auth.isSuperAdmin) return NextResponse.json({ error: "Only the super administrator can run this audit." }, { status: 403, headers });
  try {
    const db = getAdminDb();
    const expectedProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!expectedProject || getAdminApp().options.projectId !== expectedProject) {
      return NextResponse.json({ error: "Database project could not be verified." }, { status: 503, headers });
    }
    const scans: Record<string, Awaited<ReturnType<typeof scanCollection>>> = {};
    for (const name of Object.keys(AUDIT_FIELDS)) {
      scans[name] = await scanCollection(db, FieldPath, name, 1000);
    }
    return NextResponse.json({
      mode: "read-only-inventory",
      project: expectedProject,
      auditedAt: new Date().toISOString(),
      maxDocumentsPerCollection: 1000,
      ...summarizeCollections(scans),
      limitations: [
        "Counts flag records for review; they do not approve a release or authorize data changes.",
        "Scans are bounded, sequential reads, not a consistent snapshot. Incomplete scans make missing joins inconclusive.",
        "No names, contact information, resumes or listing content are returned.",
        "Draft content and private counterparts, historical aliases, billing, Storage access, and production write containment need separate verification.",
      ],
    }, { headers });
  } catch {
    return NextResponse.json({ error: "The read-only audit did not complete. No records were changed." }, { status: 503, headers });
  }
}
