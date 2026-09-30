import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantCreditsBody {
  employerId?: unknown;
  credits?: unknown;
  requestId?: unknown;
}

// A single grant is capped so a typo cannot mint an unbounded balance.
// Larger adjustments can be made with repeated grants; each is audit-logged.
const MAX_GRANT_PER_REQUEST = 100;

// ---------------------------------------------------------------------------
// POST /api/admin/employers/credits
// ---------------------------------------------------------------------------

/**
 * Grant paid job-posting credits to an employer.
 *
 * Admin-only. Each publication consumes one standardPostCredits credit via
 * the paid-publication gate, so this is how the admin comps a posting
 * (e.g. for a partner or a goodwill gesture) without touching Stripe.
 *
 * Body:
 *   employerId - the document ID of the employer in `employers`
 *   credits    - positive integer, 1..MAX_GRANT_PER_REQUEST
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as GrantCreditsBody;

    const employerId =
      typeof body.employerId === "string" ? body.employerId.trim() : "";
    if (!employerId || employerId.includes("/")) {
      return NextResponse.json(
        { error: "employerId is required" },
        { status: 400 },
      );
    }

    if (
      typeof body.credits !== "number" ||
      !Number.isSafeInteger(body.credits) ||
      body.credits < 1 ||
      body.credits > MAX_GRANT_PER_REQUEST
    ) {
      return NextResponse.json(
        { error: `credits must be a whole number from 1 to ${MAX_GRANT_PER_REQUEST}` },
        { status: 400 },
      );
    }
    const credits = body.credits;

    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
      return NextResponse.json({ error: "A valid requestId is required" }, { status: 400 });
    }
    const grantedBy = auth.viewerEmail || "admin";
    const employerRef = adminDb.collection("employers").doc(employerId);
    const auditRef = adminDb.collection("auditLogs").doc(`credit_grant_${requestId}`);
    const result = await adminDb.runTransaction(async (tx) => {
      const receipt = await tx.get(auditRef);
      if (receipt.exists) {
        const previous = receipt.data()!;
        if (previous.employerId !== employerId || previous.credits !== credits || previous.grantedBy !== grantedBy) {
          return { error: "This requestId was already used for a different grant", status: 409 };
        }
        return { success: true, employerId, granted: credits, balance: previous.balance };
      }
      const employerSnap = await tx.get(employerRef);
      if (!employerSnap.exists) return { error: "Employer not found", status: 404 };
      const data = employerSnap.data()!;
      const beforeRaw = data.standardPostCredits;
      const before = typeof beforeRaw === "number" && Number.isSafeInteger(beforeRaw) && beforeRaw >= 0 ? beforeRaw : 0;
      const balance = before + credits;
      if (!Number.isSafeInteger(balance)) return { error: "Credit balance exceeds the supported limit", status: 409 };
      const employerName = data.displayName || data.name || employerId;
      tx.update(employerRef, { standardPostCredits: balance, updatedAt: FieldValue.serverTimestamp() });
      tx.create(auditRef, {
        type: "credit_grant",
        message: `${grantedBy} granted ${credits} job posting credit(s) to ${employerName} (balance: ${before} -> ${balance})`,
        createdAt: FieldValue.serverTimestamp(), employerId, credits, balance, grantedBy,
      });
      return { success: true, employerId, granted: credits, balance };
    });
    return NextResponse.json(result, { status: "status" in result ? result.status : 200 });
  } catch (error) {
    console.error("[POST /api/admin/employers/credits] Error:", error);
    return NextResponse.json(
      { error: "Failed to grant credits" },
      { status: 500 },
    );
  }
}
