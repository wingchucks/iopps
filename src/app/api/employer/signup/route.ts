import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/employer/signup
 * Creates all required Firestore documents for a new employer account.
 * Must be called AFTER Firebase Auth account creation (user must send ID token).
 *
 * Body: { name, type, contactName, contactEmail }
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // Verify auth token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse body
  let body: { name?: string; type?: string; contactName?: string; contactEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type, contactName, contactEmail } = body;
  if (!name || !type || !contactName || !contactEmail) {
    return NextResponse.json({ error: "Missing required fields: name, type, contactName, contactEmail" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);

  const now = FieldValue.serverTimestamp();

  try {
    const batch = adminDb.batch();

    // 1. organizations/{uid}
    batch.set(adminDb.collection("organizations").doc(uid), {
      name,
      type,
      contactName,
      contactEmail,
      slug,
      onboardingComplete: false,
      plan: null,
      status: "pending",
      verified: false,
      createdAt: now,
      updatedAt: now,
    });

    // 2. employers/{uid}
    batch.set(adminDb.collection("employers").doc(uid), {
      id: uid,
      name,
      slug,
      type,
      contactName,
      contactEmail,
      plan: "free",
      subscriptionTier: "free",
      status: "pending",
      verified: false,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    });

    // 3. users/{uid} — set employer role (merge to keep existing fields)
    batch.set(adminDb.collection("users").doc(uid), {
      role: "employer",
      employerId: uid,
      displayName: contactName,
      email: contactEmail,
      updatedAt: now,
    }, { merge: true });

    // 4. members/{uid} — org membership + talent search filter
    batch.set(adminDb.collection("members").doc(uid), {
      displayName: name,
      email: contactEmail,
      orgId: uid,
      role: "employer",
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    // Set custom claims so auth token reflects employer role
    await adminAuth.setCustomUserClaims(uid, { role: "employer", employerId: uid });

    // Send welcome email (non-blocking)
    sendEmployerWelcome({ email: contactEmail, contactName, orgName: name }).catch(() => {});

    return NextResponse.json({ success: true, orgId: uid, slug });
  } catch (err) {
    console.error("[employer/signup] Failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
