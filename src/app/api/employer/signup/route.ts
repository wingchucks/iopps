import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome, sendAdminNewSignup } from "@/lib/email";
import { verifyAppCheckFromRequest } from "@/lib/server/app-check";
import {
  evaluateEmployerSignupProtection,
  getSignupClientIp,
} from "@/lib/server/signup-protection";

export const runtime = "nodejs";

/**
 * POST /api/employer/signup
 * Creates all required Firestore documents for a new employer account.
 * Must be called AFTER Firebase Auth account creation (user must send ID token).
 *
 * Body: { name, type, contactName, contactEmail, businessIdentity? }
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

  const appCheckValid = await verifyAppCheckFromRequest(req);
  if (!appCheckValid) {
    return NextResponse.json({ error: "Security check failed. Please refresh the page and try again." }, { status: 403 });
  }

  let uid: string;
  let emailVerified = false;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    emailVerified = decoded.email_verified === true;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse body
  let body: {
    name?: string;
    type?: string;
    contactName?: string;
    contactEmail?: string;
    businessIdentity?: "indigenous" | "non_indigenous" | "not_specified";
    website?: string;
    description?: string;
    honeypot?: string;
    formStartedAt?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type, contactName, contactEmail, businessIdentity = "not_specified" } = body;
  if (!name || !type || !contactName || !contactEmail) {
    return NextResponse.json({ error: "Missing required fields: name, type, contactName, contactEmail" }, { status: 400 });
  }

  const protection = await evaluateEmployerSignupProtection(adminDb, {
    uid,
    kind: "employer_signup",
    name,
    contactName,
    contactEmail,
    website: body.website,
    description: body.description,
    honeypot: body.honeypot,
    formStartedAt: body.formStartedAt,
    clientIp: getSignupClientIp(req),
  });

  if (!protection.allow) {
    if (protection.hardBlock) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (deleteError) {
        console.error("[employer/signup] Failed to delete blocked auth user:", deleteError);
      }
    }

    return NextResponse.json({ error: protection.message }, { status: protection.status });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);

  const now = FieldValue.serverTimestamp();
  const signupStatus = emailVerified ? "approved" : "pending";

  try {
    const batch = adminDb.batch();

    // 1. organizations/{uid}
    batch.set(adminDb.collection("organizations").doc(uid), {
      name,
      type,
      contactName,
      contactEmail,
      slug,
      businessIdentity,
      onboardingComplete: false,
      plan: null,
      status: signupStatus,
      emailVerified,
      verified: false,
      ...(emailVerified ? { approvedAt: now } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // 2. employers/{uid}
    batch.set(adminDb.collection("employers").doc(uid), {
      id: uid,
      name,
      slug,
      type,
      businessIdentity,
      contactName,
      contactEmail,
      plan: "free",
      subscriptionTier: "free",
      status: signupStatus,
      emailVerified,
      verified: false,
      onboardingComplete: false,
      ...(emailVerified ? { approvedAt: now } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // 3. users/{uid} — set employer role (merge to keep existing fields)
    batch.set(adminDb.collection("users").doc(uid), {
      role: "employer",
      employerId: uid,
      displayName: contactName,
      email: contactEmail,
      emailVerified,
      updatedAt: now,
    }, { merge: true });

    // 4. members/{uid} — org membership + talent search filter
    batch.set(adminDb.collection("members").doc(uid), {
      displayName: name,
      email: contactEmail,
      orgId: uid,
      role: "employer",
      emailVerified,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    // Set custom claims so auth token reflects employer role
    await adminAuth.setCustomUserClaims(uid, { role: "employer", employerId: uid });

    // Send welcome email (non-blocking)
    sendEmployerWelcome({ email: contactEmail, contactName, orgName: name }).catch((err) => {
      console.warn("[email] employer welcome failed", { err: String(err), uid, email: contactEmail, orgName: name });
    });
    sendAdminNewSignup({ name: contactName, email: contactEmail, orgName: name, type: "employer", uid }).catch((err) => {
      console.warn("[email] admin signup notification failed", { err: String(err), uid, email: contactEmail, orgName: name, type: "employer" });
    });

    return NextResponse.json({ success: true, orgId: uid, slug });
  } catch (err) {
    console.error("[employer/signup] Failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
