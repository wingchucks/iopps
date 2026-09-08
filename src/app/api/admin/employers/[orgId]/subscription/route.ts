import { buildAdminSubscriptionOverrideArtifacts, type SubscriptionOverrideBody } from "@/lib/server/admin-subscription-override";
import { NextResponse, type NextRequest } from "next/server";
import { verifySuperAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: unknown): string {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

async function resolveOrganizationRef(orgId: string, employerName: string, employerSlug: string) {
  if (!adminDb) {
    throw new Error("Firestore not initialized");
  }

  const directRef = adminDb.collection("organizations").doc(orgId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  const linkedByEmployerId = await adminDb
    .collection("organizations")
    .where("employerId", "==", orgId)
    .limit(2)
    .get();
  if (linkedByEmployerId.size === 1) return linkedByEmployerId.docs[0].ref;

  if (employerSlug) {
    const linkedBySlug = await adminDb
      .collection("organizations")
      .where("slug", "==", employerSlug)
      .limit(2)
      .get();
    if (linkedBySlug.size === 1) return linkedBySlug.docs[0].ref;
  }

  if (employerName) {
    const linkedByName = await adminDb
      .collection("organizations")
      .where("name", "==", employerName)
      .limit(2)
      .get();
    if (linkedByName.size === 1) return linkedByName.docs[0].ref;

    const normalizedEmployerName = normalizeName(employerName);
    if (normalizedEmployerName) {
      const snapshot = await adminDb.collection("organizations").limit(1000).get();
      const candidates = snapshot.docs.filter((doc) => normalizeName(doc.data().name) === normalizedEmployerName);
      if (candidates.length === 1) return candidates[0].ref;
    }
  }

  return directRef;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await verifySuperAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;
  const body = (await request.json()) as SubscriptionOverrideBody;

  const employerRef = adminDb.collection("employers").doc(orgId);
  const employerSnap = await employerRef.get();
  if (!employerSnap.exists) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const employerData = employerSnap.data() ?? {};
  const employerName =
    text(employerData.name) ||
    text(employerData.organizationName) ||
    text(employerData.companyName);
  const employerSlug = text(employerData.slug);
  const orgRef = await resolveOrganizationRef(orgId, employerName, employerSlug);
  const artifacts = buildAdminSubscriptionOverrideArtifacts(body, {
    orgId,
    employerName,
    employerSlug,
  });

  if ("error" in artifacts) {
    return NextResponse.json({ error: artifacts.error }, { status: 400 });
  }

  await employerRef.set(
    artifacts.employerUpdate,
    { merge: true },
  );

  await orgRef.set(
    artifacts.organizationUpdate,
    { merge: true },
  );

  if (body.createSubscriptionRecord !== false) {
    const existing = await adminDb
      .collection("subscriptions")
      .where("orgId", "==", orgId)
      .where("plan", "==", artifacts.planId)
      .where("billingCycle", "==", artifacts.billingCycle)
      .limit(1)
      .get();

    if (!existing.empty) {
      await existing.docs[0].ref.set(artifacts.subscriptionRecordPayload, { merge: true });
    } else {
      await adminDb.collection("subscriptions").add(artifacts.subscriptionRecordPayload);
    }
  }

  await employerRef.collection("actionHistory").add({
    action: "subscription_override",
    adminId: auth.decodedToken.uid,
    timestamp: new Date().toISOString(),
    details: artifacts.actionHistoryDetails,
  });

  return NextResponse.json({
    success: true,
    orgId,
    planId: artifacts.planId,
    tier: artifacts.tier,
    subscriptionStart: artifacts.subscriptionStartIso,
    subscriptionEnd: artifacts.subscriptionEndIso,
  });
}
