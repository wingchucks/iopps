import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertFrequency = "instant" | "daily" | "weekly";

interface EmailPreferences {
  userId: string;
  jobAlerts: boolean;
  jobAlertFrequency: AlertFrequency;
  conferenceUpdates: boolean;
  conferenceFrequency: AlertFrequency;
  powwowUpdates: boolean;
  powwowFrequency: AlertFrequency;
  shopUpdates: boolean;
  shopFrequency: AlertFrequency;
  trainingUpdates: boolean;
  trainingFrequency: AlertFrequency;
  weeklyDigest: boolean;
  marketing: boolean;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

/** Fields callers may update via PUT. */
type UpdatablePreferenceFields = Omit<EmailPreferences, "userId" | "updatedAt">;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDefaultPreferences(userId: string): EmailPreferences {
  return {
    userId,
    jobAlerts: true,
    jobAlertFrequency: "weekly",
    conferenceUpdates: true,
    conferenceFrequency: "weekly",
    powwowUpdates: true,
    powwowFrequency: "weekly",
    shopUpdates: true,
    shopFrequency: "weekly",
    trainingUpdates: true,
    trainingFrequency: "weekly",
    weeklyDigest: true,
    marketing: false,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

const BOOLEAN_FIELDS: ReadonlySet<keyof UpdatablePreferenceFields> = new Set([
  "jobAlerts",
  "conferenceUpdates",
  "powwowUpdates",
  "shopUpdates",
  "trainingUpdates",
  "weeklyDigest",
  "marketing",
]);

const FREQUENCY_FIELDS: ReadonlySet<keyof UpdatablePreferenceFields> = new Set([
  "jobAlertFrequency",
  "conferenceFrequency",
  "powwowFrequency",
  "shopFrequency",
  "trainingFrequency",
]);

const VALID_FREQUENCIES: ReadonlySet<string> = new Set([
  "instant",
  "daily",
  "weekly",
]);

/**
 * Validate and sanitize the incoming partial preferences update.
 *
 * Returns only recognised fields with correct types so that callers
 * cannot inject arbitrary data into Firestore.
 */
function validateUpdate(
  body: unknown,
): { valid: true; data: Partial<UpdatablePreferenceFields> } | { valid: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid request body" };
  }

  const raw = body as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    if (BOOLEAN_FIELDS.has(key as keyof UpdatablePreferenceFields)) {
      if (typeof raw[key] !== "boolean") {
        return { valid: false, error: `${key} must be a boolean` };
      }
      cleaned[key] = raw[key];
    } else if (FREQUENCY_FIELDS.has(key as keyof UpdatablePreferenceFields)) {
      if (typeof raw[key] !== "string" || !VALID_FREQUENCIES.has(raw[key] as string)) {
        return {
          valid: false,
          error: `${key} must be one of: instant, daily, weekly`,
        };
      }
      cleaned[key] = raw[key];
    }
    // Silently ignore unrecognised fields
  }

  if (Object.keys(cleaned).length === 0) {
    return { valid: false, error: "No valid preference fields provided" };
  }

  return { valid: true, data: cleaned as Partial<UpdatablePreferenceFields> };
}

// ---------------------------------------------------------------------------
// GET /api/emails/preferences
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's email preferences.
 *
 * If no document exists yet, a default set of preferences is created and
 * returned so the client always receives a complete object.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const userId = auth.decodedToken.uid;
    const docRef = adminDb.collection("emailPreferences").doc(userId);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      return NextResponse.json({ preferences: snapshot.data() });
    }

    // First access - create defaults
    const defaults = buildDefaultPreferences(userId);
    await docRef.set(defaults);

    // Read back so the client sees the server-resolved timestamp
    const created = await docRef.get();
    return NextResponse.json({ preferences: created.data() });
  } catch (error) {
    console.error("[GET /api/emails/preferences] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email preferences" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/emails/preferences
// ---------------------------------------------------------------------------

/**
 * Update the authenticated user's email preferences.
 *
 * Accepts a partial preferences object. Only recognised boolean and
 * frequency fields are persisted; everything else is ignored.
 */
export async function PUT(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const validation = validateUpdate(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const userId = auth.decodedToken.uid;
    const docRef = adminDb.collection("emailPreferences").doc(userId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      // Create defaults first, then merge the update on top
      const defaults = buildDefaultPreferences(userId);
      await docRef.set(defaults);
    }

    await docRef.update({
      ...validation.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    return NextResponse.json({ preferences: updated.data() });
  } catch (error) {
    console.error("[PUT /api/emails/preferences] Error:", error);
    return NextResponse.json(
      { error: "Failed to update email preferences" },
      { status: 500 },
    );
  }
}
