import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyUnsubscribeToken } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnsubscribeType =
  | "all"
  | "job_alerts"
  | "conferences"
  | "powwows"
  | "shop"
  | "digest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TYPES: ReadonlySet<string> = new Set([
  "all",
  "job_alerts",
  "conferences",
  "powwows",
  "shop",
  "digest",
]);

/**
 * Maps an unsubscribe type to the Firestore field(s) to disable on the
 * emailPreferences document.
 */
const TYPE_TO_FIELDS: Record<UnsubscribeType, Record<string, boolean>> = {
  all: {
    jobAlerts: false,
    conferenceUpdates: false,
    powwowUpdates: false,
    shopUpdates: false,
    trainingUpdates: false,
    weeklyDigest: false,
    marketing: false,
  },
  job_alerts: { jobAlerts: false },
  conferences: { conferenceUpdates: false },
  powwows: { powwowUpdates: false },
  shop: { shopUpdates: false },
  digest: { weeklyDigest: false },
};

// ---------------------------------------------------------------------------
// GET /api/emails/unsubscribe
// ---------------------------------------------------------------------------

/**
 * Verify that an unsubscribe token is valid.
 *
 * Used by the unsubscribe confirmation page to check the link before the
 * user confirms.
 *
 * Query params: email, type, token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const email = searchParams.get("email");
    const type = searchParams.get("type");
    const token = searchParams.get("token");

    if (!email || !type || !token) {
      return NextResponse.json(
        { valid: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { valid: false, error: "Invalid unsubscribe type" },
        { status: 400 },
      );
    }

    const isValid = verifyUnsubscribeToken(email, type, token);
    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error("[GET /api/emails/unsubscribe] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify token" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/unsubscribe
// ---------------------------------------------------------------------------

/**
 * Process an unsubscribe request.
 *
 * Body: { email: string, type: UnsubscribeType, token: string }
 *
 * - Verifies the HMAC token
 * - Updates the emailPreferences document to disable the relevant type
 * - For "all": disables every notification category
 * - For "job_alerts": additionally deactivates all jobAlerts documents
 */
export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const { email, type, token } = body as Record<string, unknown>;

    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 },
      );
    }

    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      return NextResponse.json(
        { error: "type must be one of: all, job_alerts, conferences, powwows, shop, digest" },
        { status: 400 },
      );
    }

    if (typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 },
      );
    }

    // Verify the HMAC token
    const isValid = verifyUnsubscribeToken(
      email.trim(),
      type,
      token.trim(),
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe token" },
        { status: 403 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const unsubType = type as UnsubscribeType;

    // Find the user's emailPreferences document by email
    // The document is keyed by userId, so we need to look up the user first
    const usersSnapshot = await adminDb
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      // No user found - still return success to avoid leaking user existence
      return NextResponse.json({ success: true });
    }

    const userId = usersSnapshot.docs[0].id;
    const prefsRef = adminDb.collection("emailPreferences").doc(userId);

    const fieldsToDisable = TYPE_TO_FIELDS[unsubType];

    await prefsRef.set(
      {
        ...fieldsToDisable,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // For job_alerts or all: also deactivate jobAlerts documents for this user
    if (unsubType === "job_alerts" || unsubType === "all") {
      const alertsSnapshot = await adminDb
        .collection("jobAlerts")
        .where("userId", "==", userId)
        .where("active", "==", true)
        .get();

      if (!alertsSnapshot.empty) {
        const batch = adminDb.batch();
        for (const doc of alertsSnapshot.docs) {
          batch.update(doc.ref, {
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/emails/unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 },
    );
  }
}
