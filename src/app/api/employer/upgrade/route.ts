import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome, sendAdminNewSignup } from "@/lib/email";
import { verifyAppCheckFromRequest } from "@/lib/server/app-check";
import {
  evaluateEmployerSignupProtection,
  getSignupClientIp,
} from "@/lib/server/signup-protection";
import { newBusinessListingReview } from "@/lib/business-listing-review";
import { conflictingOrganizationLink, ORGANIZATION_LINK_CONFLICT, parseLocationText } from "@/lib/server/personal-workspace";

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

  const appCheckValid = await verifyAppCheckFromRequest(req);
  if (!appCheckValid) {
    return NextResponse.json({ code: "SECURITY_CHECK_FAILED", error: "Security check failed. Please refresh the page and try again." }, { status: 403 });
  }

  let uid: string;
  let email: string;
  let emailVerified = false;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || "";
    emailVerified = decoded.email_verified === true;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check they're not already an employer or a member of another organization.
  // Creating a workspace must never move someone out of an existing team.
  const [userDoc, memberDoc] = await adminDb.getAll(
    adminDb.collection("users").doc(uid),
    adminDb.collection("members").doc(uid),
  );
  const userData = userDoc.data();
  if (userData?.role === "employer") {
    return NextResponse.json({ error: "Account is already an employer" }, { status: 400 });
  }
  if (conflictingOrganizationLink(uid, userData, memberDoc.data())) {
    return NextResponse.json({ code: "ORGANIZATION_LINK_CONFLICT", error: ORGANIZATION_LINK_CONFLICT }, { status: 409 });
  }

  let body: {
    name?: string;
    type?: string;
    website?: string;
    location?: string;
    description?: string;
    honeypot?: string;
    formStartedAt?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type.trim().slice(0, 40) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (type === "school") return NextResponse.json({ error: "School promotion is no longer available. Choose a business or organization account for jobs and community opportunities." }, { status: 400 });
  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields: name, type" }, { status: 400 });
  }
  const websiteInput = typeof body.website === "string" ? body.website.trim().slice(0, 500) : "";
  let website = "";
  if (websiteInput) {
    try {
      const url = new URL(websiteInput);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported protocol");
      website = url.toString();
    } catch {
      return NextResponse.json({ code: "INVALID_WEBSITE", error: "Enter a complete website address that starts with https:// or http://." }, { status: 400 });
    }
  }
  const location = parseLocationText(body.location);
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 600) : "";
  const contactName = typeof userData?.displayName === "string" && userData.displayName.trim() ? userData.displayName.trim() : name;

  const protection = await evaluateEmployerSignupProtection(adminDb, {
    uid,
    kind: "employer_upgrade",
    name,
    contactName,
    contactEmail: email,
    website,
    description,
    honeypot: body.honeypot,
    formStartedAt: body.formStartedAt,
    clientIp: getSignupClientIp(req),
  });

  if (!protection.allow) {
    return NextResponse.json({ code: protection.code, error: protection.message }, { status: protection.status });
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

    // 1. Create organizations doc. create() never overwrites an existing
    // organization, and a new business listing starts in directory review
    // exactly like one created through organization signup.
    batch.create(adminDb.collection("organizations").doc(uid), {
      id: uid,
      employerId: uid,
      name,
      contactName,
      contactEmail: email,
      // Private account contact; the public email is opt-in and starts blank.
      publicContactEmail: "",
      slug,
      type,
      website,
      ...(location ? { location } : {}),
      description,
      plan: "free",
      emailVerified,
      onboardingComplete: false,
      status: signupStatus,
      directoryReview: newBusinessListingReview(),
      verified: false,
      ...(emailVerified ? { approvedAt: now } : {}),
      openJobs: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create employers doc
    batch.create(adminDb.collection("employers").doc(uid), {
      id: uid,
      uid,
      email,
      contactName,
      contactEmail: email,
      name,
      publicContactEmail: "",
      orgName: name,
      slug,
      type,
      website,
      ...(location ? { location } : {}),
      description,
      plan: "free",
      subscriptionTier: "free",
      emailVerified,
      onboardingComplete: false,
      status: signupStatus,
      directoryReview: newBusinessListingReview(),
      verified: false,
      ...(emailVerified ? { approvedAt: now } : {}),
      openJobs: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Update users doc — flip role. Personal profile fields are untouched.
    batch.set(adminDb.collection("users").doc(uid), {
      role: "employer",
      employerId: uid,
      orgId: uid,
      orgRole: "owner",
      emailVerified,
      updatedAt: now,
    }, { merge: true });

    // 4. Update members doc
    batch.set(adminDb.collection("members").doc(uid), {
      orgId: uid,
      orgRole: "owner",
      emailVerified,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    // Set Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(uid, { role: "employer", employerId: uid });

    // Send welcome email (non-blocking)
    sendEmployerWelcome({ orgName: name, email, contactName }).catch(() => {});
    sendAdminNewSignup({ name: contactName, email, orgName: name, type: "upgrade", uid }).catch(() => {});

    return NextResponse.json({ success: true, orgId: uid, slug });
  } catch (err) {
    // ALREADY_EXISTS: an organization record for this account was created elsewhere.
    if (err && typeof err === "object" && "code" in err && err.code === 6) {
      return NextResponse.json({ error: "An organization already exists for this account. Open your organization dashboard to continue." }, { status: 409 });
    }
    console.error("employer/upgrade error:", err);
    return NextResponse.json({ error: "Failed to upgrade account" }, { status: 500 });
  }
}
