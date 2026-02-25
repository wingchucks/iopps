import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/employer/upgrade
 * Converts an existing community member account to an employer/org account.
 * User must already be authenticated — sends their ID token.
 *
 * Body: { name, type, website?, location?, description? }
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || "";
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check they're not already an employer
  const userDoc = await adminDb.collection("users").doc(uid).get();
  const userData = userDoc.data();
  if (userData?.role === "employer") {
    return NextResponse.json({ error: "Account is already an employer" }, { status: 400 });
  }

  let body: { name?: string; type?: string; website?: string; location?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type, website, location, description } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields: name, type" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);

  const now = FieldValue.serverTimestamp();

  try {
    const batch = adminDb.batch();

    // 1. Create organizations doc
    batch.set(adminDb.collection("organizations").doc(uid), {
      id: uid,
      employerId: uid,
      name,
      slug,
      type,
      website: website || "",
      location: location || "",
      description: description || "",
      plan: "free",
      verified: false,
      openJobs: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create employers doc
    batch.set(adminDb.collection("employers").doc(uid), {
      id: uid,
      uid,
      email,
      orgName: name,
      slug,
      type,
      website: website || "",
      location: location || "",
      description: description || "",
      plan: "free",
      subscriptionTier: "free",
      status: "approved",
      verified: false,
      openJobs: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Update users doc — flip role
    batch.set(adminDb.collection("users").doc(uid), {
      role: "employer",
      employerId: uid,
      updatedAt: now,
    }, { merge: true });

    // 4. Update members doc
    batch.set(adminDb.collection("members").doc(uid), {
      orgId: uid,
      orgRole: "owner",
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    // Set Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(uid, { role: "employer", employerId: uid });

    // Send welcome email (non-blocking)
    sendEmployerWelcome({ orgName: name, email, contactName: name }).catch(() => {});

    return NextResponse.json({ success: true, slug });
  } catch (err) {
    console.error("employer/upgrade error:", err);
    return NextResponse.json({ error: "Failed to upgrade account" }, { status: 500 });
  }
}
