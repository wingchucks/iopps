import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import {
  hasLinkedOrganization,
  resolveLinkedOrganizationId,
} from "@/lib/account-state";
import { getOrganizationAccessBlockReason } from "@/lib/access-state";
import { assertUserCanAccessApp, type AccountAccessDeps } from "@/lib/server/account-access";

export class EmployerApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
    throw new EmployerApiError(401, "Unauthorized");
  }
  return authHeader.split("Bearer ")[1];
}

export async function requireEmployerContext(
  req: Request,
  deps: EmployerContextDeps = {},
): Promise<EmployerContext> {
  const adminAuth = deps.adminAuth ?? getAdminAuth();
  const adminDb = deps.adminDb ?? getAdminDb();

  const decoded = await adminAuth.verifyIdToken(getBearerToken(req));
  await assertUserCanAccessApp(decoded as Pick<DecodedIdToken, "uid" | "email">, deps.accountAccessDeps ?? {
    auth: adminAuth,
    db: adminDb,
  });
  const uid = decoded.uid;

  const [userDoc, memberDoc] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("members").doc(uid).get(),
  ]);

  const userData = (userDoc.data() ?? {}) as Record<string, unknown>;
  const memberData = (memberDoc.data() ?? {}) as Record<string, unknown>;

  const userRole = typeof userData.role === "string" ? userData.role : null;
  const memberRole = typeof memberData.role === "string" ? memberData.role : null;
  const claimRole = typeof decoded.role === "string" ? decoded.role : null;
  const claimEmployerFlag = decoded.employer === true;
  const memberOrgId = typeof memberData.orgId === "string" && memberData.orgId
    ? memberData.orgId
    : null;
  const userEmployerId = typeof userData.employerId === "string" && userData.employerId
    ? userData.employerId
    : null;
  const userOrgId = typeof userData.orgId === "string" && userData.orgId
    ? userData.orgId
    : null;
  const claimEmployerId = typeof decoded.employerId === "string" && decoded.employerId
    ? decoded.employerId
    : null;
  const claimOrgId = typeof decoded.orgId === "string" && decoded.orgId
    ? decoded.orgId
    : null;
  const orgLinkSources = {
    memberOrgId,
    userOrgId,
    userEmployerId,
    claimOrgId,
    claimEmployerId,
  };
  const linkedOrganization = hasLinkedOrganization(orgLinkSources);

  const hasEmployerRole =
    isOrganizationRole(userRole) ||
    isOrganizationRole(memberRole) ||
    isOrganizationRole(claimRole) ||
    claimEmployerFlag ||
    linkedOrganization;

  const linkedOrgId = resolveLinkedOrganizationId(orgLinkSources);
  const employerId =
    userEmployerId ||
    userOrgId ||
    claimEmployerId ||
    claimOrgId ||
    memberOrgId ||
    (hasEmployerRole ? uid : null);
  const orgId = linkedOrgId || (hasEmployerRole ? uid : null);

  if (!orgId || !employerId || !hasEmployerRole) {
    throw new EmployerApiError(403, "Not an employer");
  }
  const orgRole =
    typeof memberData.orgRole === "string" && memberData.orgRole
      ? memberData.orgRole
      : hasEmployerRole
        ? "owner"
        : "member";

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

function hasCompletedEmployerOnboarding(context: EmployerContext): boolean {
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
