import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import {
  hasLinkedOrganization,
  resolveLinkedOrganizationId,
} from "@/lib/account-state";
import { getOrganizationAccessBlockReason } from "@/lib/access-state";
import { AccountAccessError, assertUserCanAccessApp, type AccountAccessDeps } from "@/lib/server/account-access";

export class EmployerApiError extends Error {
  status: number;
  /** Stable machine-readable reason, e.g. "session_expired", for clients that need to react. */
  code?: string;

  constructor(status: number, message: string, code?: string, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
    if (code) this.code = code;
  }
}

export interface EmployerContext {
  uid: string;
  employerId: string;
  orgId: string;
  orgRole: string;
  userData: Record<string, unknown>;
  memberData: Record<string, unknown>;
  employerData: Record<string, unknown>;
  organizationData: Record<string, unknown>;
  emailVerified: boolean;
}

export interface EmployerContextDeps {
  adminAuth?: Pick<Auth, "verifyIdToken" | "getUser">;
  adminDb?: Pick<Firestore, "collection">;
  accountAccessDeps?: AccountAccessDeps;
}

function isOrganizationRole(value: unknown): boolean {
  return (
    value === "employer" ||
    value === "school" ||
    value === "organization"
  );
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new EmployerApiError(401, "Sign in to continue.", "session_missing");
  }
  return authHeader.split("Bearer ")[1];
}

const AUTH_UNAVAILABLE_MESSAGE = "We couldn't confirm your sign-in right now. Please try again in a moment.";
// Token problems the user fixes by signing in again. Public-key fetch and
// transport failures are also reported as argument errors, so those messages
// are excluded and treated as an outage instead.
const REJECTED_SESSION_CODES = new Set(["auth/id-token-expired", "auth/id-token-revoked", "auth/invalid-id-token", "auth/argument-error"]);
const AUTH_TRANSPORT_FAILURE = /error fetching|error while making request|network|timed? ?out|socket|ECONN|ENOTFOUND|EAI_AGAIN/i;

/** Maps a verifyIdToken(token, true) failure to what the user can do about it. */
function sessionVerificationError(error: unknown): EmployerApiError {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (code === "auth/user-disabled") return new EmployerApiError(403, "This account has been disabled.", "account_blocked");
  if (code === "auth/user-not-found") return new EmployerApiError(403, "This account no longer exists.", "account_blocked");
  if (REJECTED_SESSION_CODES.has(code) && !AUTH_TRANSPORT_FAILURE.test(message)) {
    return new EmployerApiError(401, "Your session has expired. Sign in again to continue.", "session_expired");
  }
  return new EmployerApiError(503, AUTH_UNAVAILABLE_MESSAGE, "auth_unavailable", { cause: error });
}

export async function requireEmployerContext(
  req: Request,
  deps: EmployerContextDeps = {},
): Promise<EmployerContext> {
  const adminAuth = deps.adminAuth ?? getAdminAuth();
  const adminDb = deps.adminDb ?? getAdminDb();

  const token = getBearerToken(req);
  let decoded: DecodedIdToken;
  try { decoded = await adminAuth.verifyIdToken(token, true); }
  catch (error) { throw sessionVerificationError(error); }
  try {
    await assertUserCanAccessApp(decoded as Pick<DecodedIdToken, "uid" | "email">, deps.accountAccessDeps ?? {
      auth: adminAuth,
      db: adminDb,
    });
  } catch (error) {
    // Blocked accounts and revoked permissions keep their own status (403/401).
    if (error instanceof AccountAccessError) throw new EmployerApiError(error.status, error.message, error.code);
    throw new EmployerApiError(503, AUTH_UNAVAILABLE_MESSAGE, "auth_unavailable", { cause: error });
  }
  const uid = decoded.uid;

  const [userDoc, memberDoc] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("members").doc(uid).get(),
  ]);

  const userData = (userDoc.data() ?? {}) as Record<string, unknown>;
  const memberData = (memberDoc.data() ?? {}) as Record<string, unknown>;

  const userRole = typeof userData.role === "string" ? userData.role : null;
  const memberRole = typeof memberData.role === "string" ? memberData.role : null;
  const memberOrgId = typeof memberData.orgId === "string" && memberData.orgId
    ? memberData.orgId
    : null;
  const userEmployerId = typeof userData.employerId === "string" && userData.employerId
    ? userData.employerId
    : null;
  const userOrgId = typeof userData.orgId === "string" && userData.orgId
    ? userData.orgId
    : null;
  const orgLinkSources = {
    memberOrgId,
    userOrgId,
    userEmployerId,
  };
  const linkedOrganization = hasLinkedOrganization(orgLinkSources);

  const hasEmployerRole =
    isOrganizationRole(userRole) ||
    isOrganizationRole(memberRole) ||
    linkedOrganization;

  const linkedOrgId = resolveLinkedOrganizationId(orgLinkSources);
  const employerId =
    userEmployerId ||
    userOrgId ||
    memberOrgId ||
    (hasEmployerRole ? uid : null);
  const orgId = linkedOrgId || (hasEmployerRole ? uid : null);

  if (!orgId || !employerId || !hasEmployerRole) {
    throw new EmployerApiError(403, "Not an employer");
  }
  const orgRole =
    typeof memberData.orgRole === "string" && memberData.orgRole
      ? memberData.orgRole
      : typeof userData.orgRole === "string" && userData.orgRole
        ? userData.orgRole
        : orgId === uid || employerId === uid ? "owner" : "member";

  const organizationDocPromise = adminDb.collection("organizations").doc(orgId).get();
  const employerDocPromise = adminDb.collection("employers").doc(employerId).get();
  const [organizationDoc, primaryEmployerDoc] = await Promise.all([
    organizationDocPromise,
    employerDocPromise,
  ]);

  let employerData = (primaryEmployerDoc.data() ?? {}) as Record<string, unknown>;
  let hasEmployerDocument = primaryEmployerDoc.exists;

  if (!primaryEmployerDoc.exists && orgId !== employerId) {
    const orgEmployerDoc = await adminDb.collection("employers").doc(orgId).get();
    if (orgEmployerDoc.exists) {
      employerData = (orgEmployerDoc.data() ?? {}) as Record<string, unknown>;
      hasEmployerDocument = true;
    }
  }

  if (!linkedOrgId && !organizationDoc.exists && !hasEmployerDocument) {
    throw new EmployerApiError(403, "Not an employer");
  }

  const organizationData = (organizationDoc.data() ?? {}) as Record<string, unknown>;
  const organizationBlockReason =
    getOrganizationAccessBlockReason(organizationData) ??
    getOrganizationAccessBlockReason(employerData);

  if (organizationBlockReason) {
    throw new EmployerApiError(403, "Organization access has been removed.");
  }

  return {
    uid,
    employerId,
    orgId,
    orgRole,
    userData,
    memberData,
    employerData,
    organizationData,
    emailVerified: decoded.email_verified === true,
  };
}

/**
 * Posting jobs, events or scholarships needs a verified email (checked by callers) plus an
 * organization name and type. Logo, description and public contact can follow; the public
 * business directory listing asks for them. A completed legacy onboarding still counts.
 */
export function hasCompletedEmployerOnboarding(context: EmployerContext): boolean {
  const org = context.organizationData;
  if (typeof org.name === "string" && org.name.trim() && typeof org.type === "string" && org.type.trim()) return true;
  return (
    context.organizationData.onboardingComplete === true ||
    context.employerData.onboardingComplete === true ||
    context.userData.onboardingComplete === true ||
    context.memberData.onboardingComplete === true
  );
}

export async function requireEmployerPublishingContext(
  req: Request,
  deps: EmployerContextDeps = {},
): Promise<EmployerContext> {
  const context = await requireEmployerContext(req, deps);

  if (!context.emailVerified) {
    throw new EmployerApiError(403, "Verify your email before posting public content.");
  }

  if (!hasCompletedEmployerOnboarding(context)) {
    throw new EmployerApiError(403, "Complete your organization setup before posting public content.");
  }

  return context;
}
