import type { NextRequest } from "next/server";
import { verifySuperAdminToken } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { createAssignmentStore } from "@/lib/server/organization-admin-assignment-firestore";
import { handleAssignmentRequest } from "@/lib/server/organization-admin-assignment-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, {params}: {params:Promise<{orgId:string}>}) {
  const {orgId} = await params;
  return handleAssignmentRequest(request,orgId,{
    authorize: async () => {
      const auth = await verifySuperAdminToken(request);
      return auth.success ? {actor:auth.decodedToken.uid} : {response:auth.response};
    },
    getSecret: () => process.env.ORGANIZATION_ADMIN_REVIEW_SECRET ?? "",
    getStore: desired => createAssignmentStore(getAdminDb(),getAdminAuth(),desired),
  });
}
