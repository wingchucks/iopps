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

    const employerRef = adminDb.collection("employers").doc(employerId);
    const employerSnap = await employerRef.get();
    if (!employerSnap.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const beforeRaw = employerSnap.data()?.standardPostCredits;
    const before =
      typeof beforeRaw === "number" && Number.isSafeInteger(beforeRaw) && beforeRaw >= 0
        ? beforeRaw
        : 0;

    await employerRef.update({
      standardPostCredits: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const balance = before + credits;
    const employerName =
      (typeof employerSnap.data()?.displayName === "string" &&
        employerSnap.data()?.displayName) ||
      (typeof employerSnap.data()?.name === "string" &&
        employerSnap.data()?.name) ||
      employerId;
    const grantedBy =
      typeof auth.viewerEmail === "string" && auth.viewerEmail
        ? auth.viewerEmail
        : "admin";

    await adminDb.collection("auditLogs").add({
      type: "credit_grant",
      message: `${grantedBy} granted ${credits} job posting credit(s) to ${employerName} (balance: ${before} → ${balance})`,
      createdAt: FieldValue.serverTimestamp(),
      employerId,
      credits,
      balance,
      grantedBy,
    });

    return NextResponse.json({
      success: true,
      employerId,
      granted: credits,
      balance,
    });
  } catch (error) {
    console.error("[POST /api/admin/employers/credits] Error:", error);
    return NextResponse.json(
      { error: "Failed to grant credits" },
      { status: 500 },
    );
  }
}
