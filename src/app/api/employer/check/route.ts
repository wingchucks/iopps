import { NextRequest, NextResponse } from "next/server";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { getBusinessProfileReadiness, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";

export async function GET(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    const rawOrganization =
      Object.keys(context.organizationData).length > 0
        ? {
            id: context.orgId,
            ...context.organizationData,
          }
        : {
            id: context.employerId,
            ...context.employerData,
            contactEmail:
              context.employerData.contactEmail ||
              context.employerData.email ||
              context.userData.email ||
              context.memberData.email,
          };
    const org = normalizeOrganizationRecord(rawOrganization as Record<string, unknown>);
    const school = isSchoolOrganization(org);
    const readiness = getBusinessProfileReadiness(org);

    return NextResponse.json({
      authorized: true,
      profile: {
        uid: context.uid,
        email:
          (context.userData.email as string | undefined) ||
          (context.memberData.email as string | undefined) ||
          "",
        displayName:
          (context.userData.displayName as string | undefined) ||
          (context.memberData.displayName as string | undefined) ||
          "",
        orgId: context.orgId,
        orgRole: context.orgRole,
      },
      organizationType: school ? "school" : "business",
      profileReady: readiness.isReady,
      missingProfileFields: readiness.missingFields,
      userRole: (context.userData.role as string | undefined) || null,
    });
  } catch (err: unknown) {
    const status = err instanceof EmployerApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ authorized: false, error: message }, { status });
  }
}
