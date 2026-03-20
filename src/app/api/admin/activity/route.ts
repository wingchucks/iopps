import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract ISO timestamp from a Firestore document field. */
function toISO(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === "string") return val;
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/admin/activity
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  try {
    const entries: ActivityEntry[] = [];

    // 1. Try auditLogs collection first (primary source)
    const auditSnap = await adminDb
      .collection("auditLogs")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    for (const doc of auditSnap.docs) {
      const data = doc.data();
      entries.push({
        id: doc.id,
        type: data.type ?? "other",
        message: data.message ?? "",
        createdAt: toISO(data.createdAt),
      });
    }

    // 2. If auditLogs is empty or has fewer than 20 entries, supplement
    //    with recent user signups and job postings.
    if (entries.length < 20) {
      const remaining = 20 - entries.length;
      const half = Math.ceil(remaining / 2);

      const [usersSnap, jobsSnap] = await Promise.all([
        adminDb
          .collection("users")
          .orderBy("createdAt", "desc")
          .limit(half)
          .get(),
        adminDb
          .collection("jobs")
          .orderBy("createdAt", "desc")
          .limit(remaining - half)
          .get(),
      ]);

      for (const doc of usersSnap.docs) {
        const data = doc.data();
        const name = data.displayName || data.name || data.email || "Unknown user";
        entries.push({
          id: `user-${doc.id}`,
          type: "user_signup",
          message: `New user signed up: ${name}`,
          createdAt: toISO(data.createdAt),
        });
      }

      for (const doc of jobsSnap.docs) {
        const data = doc.data();
        const title = data.title || "Untitled job";
        entries.push({
          id: `job-${doc.id}`,
          type: "job_posted",
          message: `New job posted: ${title}`,
          createdAt: toISO(data.createdAt),
        });
      }
    }

    // 3. Also pull recent content flags if any exist
    try {
      const flagsSnap = await adminDb
        .collection("contentFlags")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      for (const doc of flagsSnap.docs) {
        const data = doc.data();
        entries.push({
          id: `flag-${doc.id}`,
          type: "content_report",
          message: `Content reported: ${data.reason || data.type || "policy violation"}`,
          createdAt: toISO(data.createdAt),
        });
      }
    } catch {
      // contentFlags may not have a createdAt index -- ignore
    }

    // 4. Sort all entries by date descending, limit to 20
    entries.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const logs = entries.slice(0, 20);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[GET /api/admin/activity] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
