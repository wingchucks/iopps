import { NextRequest, NextResponse } from "next/server";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";

export async function GET(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);

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
    });
  } catch (err: unknown) {
    const status = err instanceof EmployerApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ authorized: false, error: message }, { status });
  }
}
