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

  if (userData.role !== "employer" || typeof userData.employerId !== "string" || !userData.employerId) {
    throw new EmployerApiError(403, "Not an employer");
  }

  const employerId = userData.employerId;
  const orgId = (typeof memberData.orgId === "string" && memberData.orgId) || employerId;

  const [employerDoc, organizationDoc] = await Promise.all([
    adminDb.collection("employers").doc(employerId).get(),
    adminDb.collection("organizations").doc(orgId).get(),
  ]);

  return {
    uid,
    employerId,
    orgId,
    userData,
    memberData,
    employerData: (employerDoc.data() ?? {}) as Record<string, unknown>,
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
