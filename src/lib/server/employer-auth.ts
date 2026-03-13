import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

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

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new EmployerApiError(401, "Unauthorized");
  }
  return authHeader.split("Bearer ")[1];
}

export async function requireEmployerContext(req: Request): Promise<EmployerContext> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  const decoded = await adminAuth.verifyIdToken(getBearerToken(req));
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

  const hasEmployerRole =
    userRole === "employer" ||
    memberRole === "employer" ||
    claimRole === "employer" ||
    claimEmployerFlag;

  const employerId = userEmployerId || userOrgId || claimEmployerId || claimOrgId || memberOrgId;
  const orgId = memberOrgId || userOrgId || claimOrgId || employerId;

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

  if (!primaryEmployerDoc.exists && orgId !== employerId) {
    const orgEmployerDoc = await adminDb.collection("employers").doc(orgId).get();
    if (orgEmployerDoc.exists) {
      employerData = (orgEmployerDoc.data() ?? {}) as Record<string, unknown>;
    }
  }

  return {
    uid,
    employerId,
    orgId,
    orgRole,
    userData,
    memberData,
    employerData,
    organizationData: (organizationDoc.data() ?? {}) as Record<string, unknown>,
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

export async function requireEmployerPublishingContext(req: Request): Promise<EmployerContext> {
  const context = await requireEmployerContext(req);

  if (!context.emailVerified) {
    throw new EmployerApiError(403, "Verify your email before posting public content.");
  }

  if (!hasCompletedEmployerOnboarding(context)) {
    throw new EmployerApiError(403, "Complete your organization setup before posting public content.");
  }

  return context;
}
