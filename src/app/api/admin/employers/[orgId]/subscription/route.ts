import type { SubscriptionOverrideBody } from "@/lib/server/admin-subscription-override";
import { applyAdminSubscriptionOverride, SubscriptionOverrideError } from "@/lib/server/admin-subscription-transaction";
import { NextResponse, type NextRequest } from "next/server";
import { verifySuperAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await verifySuperAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  try {
    const { orgId } = await params;
    const body = await request.json() as SubscriptionOverrideBody;
    const result = await applyAdminSubscriptionOverride(adminDb, orgId, body, auth.decodedToken.uid);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SubscriptionOverrideError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    console.error('[admin/subscription] override transaction failed');
    return NextResponse.json({ error: "Subscription update failed; no partial update was committed." }, { status: 500 });
  }
}
