import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome, sendAdminNewSignup } from "@/lib/email";
import { buildEmailVerificationContinueUrl } from "@/lib/auth-verification-email";
import { verifyAppCheckFromRequest } from "@/lib/server/app-check";
import {
  evaluateEmployerSignupProtection,
  getSignupClientIp,
} from "@/lib/server/signup-protection";

export const runtime = "nodejs";

function getSiteUrl(req: NextRequest): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) return configuredSiteUrl;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (!host) return "https://www.iopps.ca";

  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  return `${forwardedProto}://${host}`;
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringArray(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .slice(0, maxItems)
    .map((item) => cleanString(item, maxItemLength))
    .filter(Boolean))];
}

function cleanHttpUrl(value: unknown): string {
  const candidate = cleanString(value, 500);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanLocation(value: unknown): { city: string; province: string } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const city = cleanString(input.city, 120);
  const province = cleanString(input.province, 80);
  return city || province ? { city, province } : undefined;
}

async function existingSignupResponse(uid: string) {
  if (!adminDb) return null;
  const [organization, employer] = await Promise.all([
    adminDb.collection("organizations").doc(uid).get(),
    adminDb.collection("employers").doc(uid).get(),
  ]);
  if (!organization.exists && !employer.exists) return null;
  const existing = organization.data() || employer.data() || {};
  return NextResponse.json({
    success: true, alreadyExists: true, orgId: uid,
    slug: typeof existing.slug === "string" ? existing.slug : "",
    confirmationEmailSent: false,
  });
}

/**
 * POST /api/employer/signup
 * Creates all required Firestore documents for a new employer account.
 * Must be called AFTER Firebase Auth account creation (user must send ID token).
 *
 * Body: core organization/contact fields plus optional public profile details,
 * branding, capabilities, services, location, and onboarding completion intent.
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
  let accountEmail: string | undefined;
  let emailVerified = false;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    accountEmail = decoded.email;
    emailVerified = decoded.email_verified === true;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Retrying a completed signup must not reset a profile, plan, credits or role.
  // Check before spam protection, which is intended only for new signups.
  try {
    const existing = await existingSignupResponse(uid);
    if (existing) return existing;
  } catch (error) {
    console.error("[employer/signup] Existing organization lookup failed:", error);
    return NextResponse.json({ error: "Unable to check your organization. Please try again." }, { status: 503 });
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
    location?: { city?: string; province?: string };
    capabilities?: string[];
    services?: string[];
    logoUrl?: string;
    bannerUrl?: string;
    onboardingComplete?: boolean;
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

  const normalizedContactEmail = contactEmail.trim().toLowerCase();
  const confirmationEmail = (accountEmail || normalizedContactEmail).trim().toLowerCase();
  const website = cleanHttpUrl(body.website);
  const description = cleanString(body.description, 600);
  const services = cleanStringArray(body.services, 40, 100);
  const capabilities = cleanStringArray(body.capabilities, 30, 80);
  const location = cleanLocation(body.location);
  const logoUrl = cleanHttpUrl(body.logoUrl);
  const bannerUrl = cleanHttpUrl(body.bannerUrl);
  const profileSubmitted = body.onboardingComplete === true && description.length > 0 && !!location?.city && !!location?.province;

  const protection = await evaluateEmployerSignupProtection(adminDb, {
    uid,
    kind: "employer_signup",
    name,
    contactName,
    contactEmail: normalizedContactEmail,
    website,
    description,
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
    batch.create(adminDb.collection("organizations").doc(uid), {
      name,
      type,
      contactName,
      contactEmail: normalizedContactEmail,
      slug,
      businessIdentity,
      ...(website ? { website } : {}),
      ...(description ? { description } : {}),
      ...(services.length > 0 ? { services } : {}),
      ...(location ? { location } : {}),
      ...(capabilities.length > 0 ? { capabilities } : {}),
      ...(logoUrl ? { logoUrl, logo: logoUrl } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
      onboardingComplete: profileSubmitted,
      plan: null,
      status: signupStatus,
      emailVerified,
      verified: false,
      ...(emailVerified ? { approvedAt: now } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // 2. employers/{uid}
    batch.create(adminDb.collection("employers").doc(uid), {
      id: uid,
      name,
      slug,
      type,
      businessIdentity,
      contactName,
      contactEmail: normalizedContactEmail,
      ...(website ? { website } : {}),
      ...(description ? { description } : {}),
      ...(services.length > 0 ? { services } : {}),
      ...(location ? { location } : {}),
      ...(capabilities.length > 0 ? { capabilities } : {}),
      ...(logoUrl ? { logoUrl, logo: logoUrl } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
      plan: "free",
      subscriptionTier: "free",
      status: signupStatus,
      emailVerified,
      verified: false,
      onboardingComplete: profileSubmitted,
      ...(emailVerified ? { approvedAt: now } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // 3. users/{uid} — set employer role (merge to keep existing fields)
    batch.set(adminDb.collection("users").doc(uid), {
      role: "employer",
      orgRole: "owner",
      employerId: uid,
      orgId: uid,
      displayName: contactName,
      email: normalizedContactEmail,
      emailVerified,
      updatedAt: now,
    }, { merge: true });

    // 4. members/{uid} — org membership + talent search filter
    batch.set(adminDb.collection("members").doc(uid), {
      displayName: name,
      email: normalizedContactEmail,
      orgId: uid,
      orgRole: "owner",
      role: "employer",
      emailVerified,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // 5. Admin bell notification so new employer signups are visible in the dashboard
    batch.set(adminDb.collection("adminNotifications").doc(), {
      title: "New employer signup",
      message: `${name} registered an employer account${emailVerified ? "." : " and needs email confirmation."}`,
      type: "success",
      read: false,
      employerId: uid,
      orgId: uid,
      orgName: name,
      contactName,
      contactEmail: normalizedContactEmail,
      emailVerified,
      createdAt: now,
    });

    await batch.commit();

    // Set custom claims so auth token reflects employer role
    await adminAuth.setCustomUserClaims(uid, { role: "employer", employerId: uid });

    let verificationLink: string | null = null;
    if (!emailVerified) {
      try {
        verificationLink = await adminAuth.generateEmailVerificationLink(confirmationEmail, {
          url: buildEmailVerificationContinueUrl(getSiteUrl(req), "/org/onboarding"),
          handleCodeInApp: false,
        });
      } catch (linkError) {
        console.error("[employer/signup] Failed to generate employer confirmation link:", linkError);
      }
    }

    // Send signup confirmations (non-blocking, but log failures so delivery issues are visible)
    sendEmployerWelcome({
      email: confirmationEmail,
      contactName,
      orgName: name,
      verificationLink,
    }).then((result) => {
      if (!result.success) console.error("[employer/signup] Employer welcome/confirmation failed:", result.error);
    }).catch((error) => {
      console.error("[employer/signup] Employer welcome/confirmation failed:", error);
    });
    sendAdminNewSignup({ name: contactName, email: normalizedContactEmail, orgName: name, type: "employer", uid }).catch((error) => {
      console.error("[employer/signup] Admin signup email failed:", error);
    });

    return NextResponse.json({ success: true, orgId: uid, slug, confirmationEmailSent: true });
  } catch (err) {
    // A concurrent signup may finish after the initial lookup. The create
    // preconditions keep the entire batch from overwriting the winning account.
    if (err && typeof err === "object" && "code" in err && err.code === 6) {
      const existing = await existingSignupResponse(uid);
      if (existing) return existing;
    }
    console.error("[employer/signup] Failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
