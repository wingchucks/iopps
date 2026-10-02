import { newBusinessListingReview } from "@/lib/business-listing-review";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmployerWelcome, sendAdminNewSignup } from "@/lib/email";
import { buildEmailVerificationContinueUrl } from "@/lib/auth-verification-email";
import { verifyAuthToken } from "@/lib/api-auth";
import { verifyAppCheckFromRequest } from "@/lib/server/app-check";
import {
  evaluateEmployerSignupProtection,
  getSignupClientIp,
} from "@/lib/server/signup-protection";
import { conflictingOrganizationLink, ORGANIZATION_LINK_CONFLICT, personalIdentityDefaults } from "@/lib/server/personal-workspace";
import { availableOrganizationSlug } from "@/lib/server/public-organization-resolver";

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
  const organizationRef = adminDb.collection("organizations").doc(uid);
  const employerRef = adminDb.collection("employers").doc(uid);
  const existing = await adminDb.runTransaction(async tx => {
    const [organization, employer] = await tx.getAll(organizationRef, employerRef);
    if (!organization.exists && !employer.exists) return null;
    const data: Record<string, unknown> = organization.data() || employer.data() || {};
    // A legacy signup may have only one mirror. Repair only the missing one
    // from trusted stored data, preserving its plan, credits and visibility.
    // Transaction retries cannot overwrite a concurrently completed profile.
    if (!organization.exists) {
      // Legacy employers store the display name under either of these aliases.
      // Copy only the known name alias into the canonical field; billing,
      // visibility and all existing source fields remain unchanged.
      const name = [data.name, data.organizationName, data.companyName]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (!name) return { data, needsOrganizationName: true };
      const canonical: Record<string, unknown> = { ...data, name: typeof data.name === "string" && data.name.trim() ? data.name : name.trim() };
      tx.create(organizationRef, { ...canonical, updatedAt: FieldValue.serverTimestamp() });
      return { data: canonical, needsOrganizationName: false };
    }
    if (!employer.exists) tx.create(employerRef, { ...data, id: uid, updatedAt: FieldValue.serverTimestamp() });
    return { data, needsOrganizationName: false };
  });
  if (!existing) return null;
  if (existing.needsOrganizationName) return NextResponse.json({
    error: "Your existing employer profile is missing an organization name. Please contact IOPPS to complete account setup.",
  }, { status: 409 });
  return NextResponse.json({
    success: true, alreadyExists: true, orgId: uid,
    slug: typeof existing.data.slug === "string" ? existing.data.slug : "",
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
    return NextResponse.json({ code: "SECURITY_CHECK_FAILED", error: "Security check failed. Please refresh the page and try again." }, { status: 403 });
  }

  // Revoked sessions and suspended, disabled or closed accounts cannot create,
  // repair or relink an organization, or change their role.
  const access = await verifyAuthToken(req, { checkRevoked: true });
  if (!access.success) return access.response;
  const decoded = access.decodedToken;
  const uid = decoded.uid;
  const accountEmail = decoded.email;
  const emailVerified = decoded.email_verified === true;

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

  if (type === "school") return NextResponse.json({ error: "School listings are no longer offered. Contact IOPPS for help with an existing account." }, { status: 400 });
  const [existingUser, existingMember] = await adminDb.getAll(
    adminDb.collection("users").doc(uid),
    adminDb.collection("members").doc(uid),
  );
  if (conflictingOrganizationLink(uid, existingUser.data(), existingMember.data())) {
    return NextResponse.json({ code: "ORGANIZATION_LINK_CONFLICT", error: ORGANIZATION_LINK_CONFLICT }, { status: 409 });
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
    // Deny creation, not the already-authenticated person's account. A false
    // positive must remain recoverable without destroying their member data.
    return NextResponse.json({ code: protection.code, error: protection.message }, { status: protection.status });
  }

  const now = FieldValue.serverTimestamp();
  const signupStatus = emailVerified ? "approved" : "pending";
  const db = adminDb;
  const organizationRef = db.collection("organizations").doc(uid);
  const employerRef = db.collection("employers").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const memberRef = db.collection("members").doc(uid);

  try {
    const created = await db.runTransaction(async tx => {
      const [user, member, organization, employer] = await tx.getAll(userRef, memberRef, organizationRef, employerRef);
      if (organization.exists || employer.exists) return { conflict: "exists" } as const;
      if (conflictingOrganizationLink(uid, user.data(), member.data())) return { conflict: "link" } as const;
      const slug = await availableOrganizationSlug(tx, db, name, uid);

      // 1. organizations/{uid}
      tx.create(organizationRef, {
        name,
        type,
        contactName,
        contactEmail: normalizedContactEmail,
        // Private account contact above; the public email is opt-in and starts blank.
        publicContactEmail: "",
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
        ...(type !== "school" ? { directoryReview: newBusinessListingReview() } : {}),
        emailVerified,
        verified: false,
        ...(emailVerified ? { approvedAt: now } : {}),
        createdAt: now,
        updatedAt: now,
      });

      // 2. employers/{uid}
      tx.create(employerRef, {
        id: uid,
        name,
        slug,
        type,
        businessIdentity,
        contactName,
        contactEmail: normalizedContactEmail,
        publicContactEmail: "",
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
        ...(type !== "school" ? { directoryReview: newBusinessListingReview() } : {}),
        emailVerified,
        verified: false,
        onboardingComplete: profileSubmitted,
        ...(emailVerified ? { approvedAt: now } : {}),
        createdAt: now,
        updatedAt: now,
      });

      // 3. users/{uid} — set employer role (merge to keep existing fields).
      // The person's own name and sign-in email are theirs, not the organization's.
      tx.set(userRef, {
        role: "employer",
        orgRole: "owner",
        employerId: uid,
        orgId: uid,
        ...personalIdentityDefaults(user.data(), { displayName: contactName, email: accountEmail || normalizedContactEmail }),
        emailVerified,
        updatedAt: now,
      }, { merge: true });

      // 4. members/{uid} — org membership + talent search filter. The member
      // profile stays the individual's own profile (used for applications and team lists).
      tx.set(memberRef, {
        ...personalIdentityDefaults(member.data(), { displayName: contactName, email: accountEmail || normalizedContactEmail }),
        orgId: uid,
        orgRole: "owner",
        role: "employer",
        emailVerified,
        ...(member.exists ? {} : { createdAt: now }),
        updatedAt: now,
      }, { merge: true });

      // 5. Admin bell notification so new employer signups are visible in the dashboard
      tx.set(db.collection("adminNotifications").doc(), {
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

      return { slug };
    });
    if ("conflict" in created) {
      if (created.conflict === "link") return NextResponse.json({ code: "ORGANIZATION_LINK_CONFLICT", error: ORGANIZATION_LINK_CONFLICT }, { status: 409 });
      // A concurrent signup finished first; answer as its retry would.
      const existing = await existingSignupResponse(uid);
      if (existing) return existing;
      throw new Error("Organization records changed during signup");
    }
    const { slug } = created;

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
