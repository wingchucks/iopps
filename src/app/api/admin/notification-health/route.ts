import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { resolveEmployerNotificationEmail } from "@/lib/server/employer-notification-email";

export const dynamic = "force-dynamic";

type JobSummary = {
  id: string;
  title: string;
  slug: string;
};

type EmployerHealthRow = {
  employerId: string;
  employerName: string;
  email: string;
  emailSource: string;
  jobCount: number;
  jobs: JobSummary[];
  checkedIds: string[];
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getEmployerId(data: Record<string, unknown>): string {
  return normalizeString(data.employerId || data.orgId || data.organizationId || data.companyId);
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  try {
    const db = adminDb;
    const snapshot = await db.collection("jobs").where("active", "==", true).get();
    const byEmployer = new Map<string, EmployerHealthRow>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const employerId = getEmployerId(data);
      if (!employerId) return;

      if (!byEmployer.has(employerId)) {
        byEmployer.set(employerId, {
          employerId,
          employerName: normalizeString(data.employerName || data.orgName || data.companyName) || "Unknown employer",
          email: "",
          emailSource: "",
          jobCount: 0,
          jobs: [],
          checkedIds: [],
        });
      }

      const row = byEmployer.get(employerId)!;
      row.jobCount += 1;
      if (row.jobs.length < 25) {
        row.jobs.push({
          id: doc.id,
          title: normalizeString(data.title) || "Untitled job",
          slug: normalizeString(data.slug) || doc.id,
        });
      }
    });

    const rows = await Promise.all(Array.from(byEmployer.values()).map(async (row) => {
      const email = await resolveEmployerNotificationEmail(db, { employerId: row.employerId });
      return {
        ...row,
        email: email.email,
        emailSource: email.source,
        checkedIds: email.checkedIds,
      };
    }));

    const missing = rows
      .filter((row) => !row.email)
      .sort((a, b) => b.jobCount - a.jobCount || a.employerName.localeCompare(b.employerName));
    const ok = rows
      .filter((row) => row.email)
      .sort((a, b) => b.jobCount - a.jobCount || a.employerName.localeCompare(b.employerName));

    return NextResponse.json({
      activeJobCount: snapshot.size,
      employerCount: rows.length,
      employersWithEmail: ok.length,
      employersMissingEmail: missing.length,
      missing,
      ok,
    });
  } catch (error) {
    console.error("[GET /api/admin/notification-health] Error:", error);
    return NextResponse.json({ error: "Failed to check notification health" }, { status: 500 });
  }
}
