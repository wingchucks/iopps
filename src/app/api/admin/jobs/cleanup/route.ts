import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether a job document is "stale":
 * - closingDate is in the past
 * - active === false
 * - status is "closed" or "filled"
 */
function isStaleJob(data: Record<string, unknown>): boolean {
  if (data.active === false) return true;
  if (data.status === "closed" || data.status === "filled") return true;

  if (data.closingDate) {
    const closing =
      typeof (data.closingDate as { toDate?: () => Date }).toDate ===
      "function"
        ? (data.closingDate as { toDate: () => Date }).toDate()
        : new Date(data.closingDate as string | number);

    if (closing.getTime() < Date.now()) return true;
  }

  return false;
}

/** Serialise a Firestore timestamp (or string/null) to an ISO string. */
function serialiseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === "string") return val;
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CleanupAction = "deactivate" | "delete";

interface CleanupBody {
  employerName: string;
  action: CleanupAction;
  jobIds?: string[];
}

const VALID_ACTIONS: ReadonlySet<string> = new Set(["deactivate", "delete"]);

// ---------------------------------------------------------------------------
// GET /api/admin/jobs/cleanup?employer=Westland
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const employer = searchParams.get("employer");

    if (!employer) {
      return NextResponse.json(
        { error: "employer query param is required" },
        { status: 400 }
      );
    }

    const employerLower = employer.toLowerCase();

    // Firestore doesn't support case-insensitive contains — fetch all then
    // filter client-side.
    const snapshot = await adminDb.collection("jobs").get();

    const jobs: Record<string, unknown>[] = [];
    let staleCount = 0;
    let activeCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const name: string = (data.employerName as string) ?? "";

      if (!name.toLowerCase().includes(employerLower)) return;

      const stale = isStaleJob(data);
      if (stale) staleCount++;
      else activeCount++;

      jobs.push({
        id: doc.id,
        title: data.title ?? null,
        employerName: data.employerName ?? null,
        location: data.location ?? null,
        status: data.status ?? null,
        active: data.active ?? null,
        closingDate: serialiseDate(data.closingDate),
        createdAt: serialiseDate(data.createdAt),
        isStale: stale,
      });
    });

    return NextResponse.json({
      jobs,
      staleCount,
      activeCount,
      totalCount: jobs.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/jobs/cleanup] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stale jobs" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/jobs/cleanup
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as CleanupBody;

    if (!body.employerName || typeof body.employerName !== "string") {
      return NextResponse.json(
        { error: "employerName is required" },
        { status: 400 }
      );
    }

    if (!body.action || !VALID_ACTIONS.has(body.action)) {
      return NextResponse.json(
        { error: "action must be one of: deactivate, delete" },
        { status: 400 }
      );
    }

    // Resolve target job IDs --------------------------------------------------

    let targetIds: string[];

    if (body.jobIds && Array.isArray(body.jobIds) && body.jobIds.length > 0) {
      targetIds = body.jobIds;
    } else {
      // Find all stale jobs for the employer.
      const employerLower = body.employerName.toLowerCase();
      const snapshot = await adminDb.collection("jobs").get();

      targetIds = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          const name: string = (data.employerName as string) ?? "";
          return (
            name.toLowerCase().includes(employerLower) && isStaleJob(data)
          );
        })
        .map((doc) => doc.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        affected: 0,
        action: body.action,
      });
    }

    // Execute action in batches (Firestore limit: 500 per batch) ---------------

    const BATCH_SIZE = 500;

    for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const chunk = targetIds.slice(i, i + BATCH_SIZE);

      for (const id of chunk) {
        const ref = adminDb.collection("jobs").doc(id);

        if (body.action === "deactivate") {
          batch.update(ref, {
            active: false,
            status: "closed",
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          batch.delete(ref);
        }
      }

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      affected: targetIds.length,
      action: body.action,
    });
  } catch (error) {
    console.error("[POST /api/admin/jobs/cleanup] Error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup jobs" },
      { status: 500 }
    );
  }
}
