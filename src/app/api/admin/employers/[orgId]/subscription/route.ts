import { NextResponse, type NextRequest } from "next/server";
import { verifySuperAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizePlanTier } from "@/lib/server/subscription-state";

export const dynamic = "force-dynamic";

type PlanId = "tier1" | "tier2" | "tier3";

interface SubscriptionOverrideBody {
  planId?: PlanId;
  subscriptionTier?: "standard" | "premium" | "school";
  billingStartAt?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  bonusAccessGrantedAt?: string;
  bonusAccessEndsAt?: string;
  bonusAccessReason?: string;
  amount?: number;
  gstAmount?: number;
  totalAmount?: number;
  billingCycle?: "annual" | "one-time";
  createSubscriptionRecord?: boolean;
}

const PLAN_ID_TO_TIER: Record<PlanId, "standard" | "premium" | "school"> = {
  tier1: "standard",
  tier2: "premium",
  tier3: "school",
};

interface BuildSubscriptionArtifactsOptions {
  orgId: string;
  employerName?: string;
  employerSlug?: string;
  now?: Date;
  createdAtToken?: unknown;
  updatedAtToken?: unknown;
}

export function buildAdminSubscriptionOverrideArtifacts(
  body: SubscriptionOverrideBody,
  options: BuildSubscriptionArtifactsOptions,
) {
  const normalizedTier = normalizePlanTier(
    body.subscriptionTier,
    body.planId ? PLAN_ID_TO_TIER[body.planId] : undefined,
  );

  if (normalizedTier === "free") {
    return { error: "A paid plan tier is required." } as const;
  }

  const now = options.now ?? new Date();
  const subscriptionStart = toDateOrNull(body.subscriptionStart || body.billingStartAt);
  const subscriptionEnd = toDateOrNull(body.subscriptionEnd);
  const bonusAccessGrantedAt = toDateOrNull(body.bonusAccessGrantedAt) || now;
  const bonusAccessEndsAt = toDateOrNull(body.bonusAccessEndsAt);

  if (!subscriptionStart || !subscriptionEnd) {
    return {
      error: "subscriptionStart/billingStartAt and subscriptionEnd are required.",
    } as const;
  }

  const subscriptionStartIso = subscriptionStart.toISOString();
  const subscriptionEndIso = subscriptionEnd.toISOString();
  const bonusAccessGrantedAtIso = bonusAccessGrantedAt.toISOString();
  const bonusAccessEndsAtIso = bonusAccessEndsAt?.toISOString();
  const bonusAccessReason = body.bonusAccessReason || "Bonus early access before paid term begins";
  const billingCycle = body.billingCycle || "annual";
  const planId = body.planId || (normalizedTier === "school" ? "tier3" : normalizedTier === "standard" ? "tier1" : "tier2");
  const defaultAmount =
    normalizedTier === "school"
      ? 5500
      : normalizedTier === "standard"
        ? 1250
        : 2500;
  const amount = Number(body.amount ?? defaultAmount);
  const gstAmount = Number(body.gstAmount ?? Math.round(amount * 0.05 * 100) / 100);
  const totalAmount = Number(body.totalAmount ?? amount + gstAmount);
  const paymentId = amount <= 0 ? `admin-grant-${planId}` : `admin-manual-${planId}`;
  const updatedAt = now.toISOString();

  const subscriptionPayload = {
    tier: normalizedTier,
    status: "active",
    billingStartAt: subscriptionStartIso,
    subscriptionEnd: subscriptionEndIso,
    expiresAt: subscriptionEndIso,
    bonusAccessGrantedAt: bonusAccessGrantedAtIso,
    ...(bonusAccessEndsAtIso ? { bonusAccessEndsAt: bonusAccessEndsAtIso } : {}),
    bonusAccessReason,
    paymentId,
    amountPaid: amount,
    gstAmount,
    totalAmount,
  };

  return {
    planId,
    tier: normalizedTier,
    subscriptionStartIso,
    subscriptionEndIso,
    billingCycle,
    amount,
    gstAmount,
    totalAmount,
    subscriptionPayload,
    employerUpdate: {
      plan: normalizedTier,
      subscriptionTier: normalizedTier,
      subscriptionStatus: "active",
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      billingStartAt: subscriptionStartIso,
      bonusAccessGrantedAt: bonusAccessGrantedAtIso,
      ...(bonusAccessEndsAtIso ? { bonusAccessEndsAt: bonusAccessEndsAtIso } : {}),
      bonusAccessReason,
      updatedAt,
      subscription: subscriptionPayload,
    },
    organizationUpdate: {
      plan: normalizedTier,
      subscriptionTier: normalizedTier,
      subscriptionStatus: "active",
      employerId: options.orgId,
      tier: normalizedTier,
      ...(options.employerName ? { name: options.employerName } : {}),
      ...(options.employerSlug ? { slug: options.employerSlug } : {}),
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      billingStartAt: subscriptionStartIso,
      bonusAccessGrantedAt: bonusAccessGrantedAtIso,
      ...(bonusAccessEndsAtIso ? { bonusAccessEndsAt: bonusAccessEndsAtIso } : {}),
      bonusAccessReason,
      updatedAt,
      subscription: subscriptionPayload,
    },
    subscriptionRecordPayload: {
      orgId: options.orgId,
      plan: planId,
      status: "active",
      amount,
      gstAmount,
      totalAmount,
      billingCycle,
      createdAt: options.createdAtToken ?? FieldValue.serverTimestamp(),
      startsAt: subscriptionStart,
      expiresAt: subscriptionEnd,
      manualOverride: true,
      bonusAccessGrantedAt,
      ...(bonusAccessEndsAt ? { bonusAccessEndsAt } : {}),
      bonusAccessReason,
      updatedAt: options.updatedAtToken ?? FieldValue.serverTimestamp(),
    },
    actionHistoryDetails: {
      planId,
      tier: normalizedTier,
      subscriptionStart: subscriptionStartIso,
      subscriptionEnd: subscriptionEndIso,
      bonusAccessGrantedAt: bonusAccessGrantedAtIso,
      ...(bonusAccessEndsAtIso ? { bonusAccessEndsAt: bonusAccessEndsAtIso } : {}),
      bonusAccessReason,
      amount,
      gstAmount,
      totalAmount,
      billingCycle,
    },
  } as const;
}

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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
