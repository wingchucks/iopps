import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
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

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;
  const body = (await request.json()) as SubscriptionOverrideBody;

  const normalizedTier = normalizePlanTier(
    body.subscriptionTier,
    body.planId ? PLAN_ID_TO_TIER[body.planId] : undefined,
  );

  if (normalizedTier === "free") {
    return NextResponse.json({ error: "A paid plan tier is required." }, { status: 400 });
  }

  const subscriptionStart = toDateOrNull(body.subscriptionStart || body.billingStartAt);
  const subscriptionEnd = toDateOrNull(body.subscriptionEnd);
  const bonusAccessGrantedAt = toDateOrNull(body.bonusAccessGrantedAt) || new Date();
  const bonusAccessEndsAt = toDateOrNull(body.bonusAccessEndsAt);

  if (!subscriptionStart || !subscriptionEnd) {
    return NextResponse.json(
      { error: "subscriptionStart/billingStartAt and subscriptionEnd are required." },
      { status: 400 },
    );
  }

  const bonusAccessReason = body.bonusAccessReason || "Bonus early access before paid term begins";
  const billingCycle = body.billingCycle || "annual";
  const amount = Number(body.amount ?? (body.planId === "tier3" ? 5500 : body.planId === "tier1" ? 1250 : 2500));
  const gstAmount = Number(body.gstAmount ?? Math.round(amount * 0.05 * 100) / 100);
  const totalAmount = Number(body.totalAmount ?? amount + gstAmount);
  const planId = body.planId || (normalizedTier === "school" ? "tier3" : normalizedTier === "standard" ? "tier1" : "tier2");

  const employerRef = adminDb.collection("employers").doc(orgId);
  const orgRef = adminDb.collection("organizations").doc(orgId);

  const subscriptionPayload = {
    tier: normalizedTier,
    status: "active",
    billingStartAt: subscriptionStart.toISOString(),
    subscriptionEnd: subscriptionEnd.toISOString(),
    bonusAccessGrantedAt: bonusAccessGrantedAt.toISOString(),
    ...(bonusAccessEndsAt ? { bonusAccessEndsAt: bonusAccessEndsAt.toISOString() } : {}),
    bonusAccessReason,
  };

  await employerRef.set(
    {
      plan: normalizedTier,
      subscriptionTier: normalizedTier,
      subscriptionStatus: "active",
      subscriptionStart: subscriptionStart.toISOString(),
      subscriptionEnd: subscriptionEnd.toISOString(),
      billingStartAt: subscriptionStart.toISOString(),
      bonusAccessGrantedAt: bonusAccessGrantedAt.toISOString(),
      ...(bonusAccessEndsAt ? { bonusAccessEndsAt: bonusAccessEndsAt.toISOString() } : {}),
      bonusAccessReason,
      updatedAt: new Date().toISOString(),
      subscription: subscriptionPayload,
    },
    { merge: true },
  );

  await orgRef.set(
    {
      plan: normalizedTier,
      subscriptionTier: normalizedTier,
      tier: normalizedTier,
      billingStartAt: subscriptionStart.toISOString(),
      bonusAccessGrantedAt: bonusAccessGrantedAt.toISOString(),
      ...(bonusAccessEndsAt ? { bonusAccessEndsAt: bonusAccessEndsAt.toISOString() } : {}),
      bonusAccessReason,
      updatedAt: new Date().toISOString(),
      subscription: subscriptionPayload,
    },
    { merge: true },
  );

  if (body.createSubscriptionRecord !== false) {
    const existing = await adminDb
      .collection("subscriptions")
      .where("orgId", "==", orgId)
      .where("plan", "==", planId)
      .where("billingCycle", "==", billingCycle)
      .limit(1)
      .get();

    const payload = {
      orgId,
      plan: planId,
      status: "active",
      amount,
      gstAmount,
      totalAmount,
      billingCycle,
      createdAt: FieldValue.serverTimestamp(),
      startsAt: subscriptionStart,
      expiresAt: subscriptionEnd,
      manualOverride: true,
      bonusAccessGrantedAt,
      ...(bonusAccessEndsAt ? { bonusAccessEndsAt } : {}),
      bonusAccessReason,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existing.empty) {
      await existing.docs[0].ref.set(payload, { merge: true });
    } else {
      await adminDb.collection("subscriptions").add(payload);
    }
  }

  await employerRef.collection("actionHistory").add({
    action: "subscription_override",
    adminId: auth.decodedToken.uid,
    timestamp: new Date().toISOString(),
    details: {
      planId,
      tier: normalizedTier,
      subscriptionStart: subscriptionStart.toISOString(),
      subscriptionEnd: subscriptionEnd.toISOString(),
      bonusAccessGrantedAt: bonusAccessGrantedAt.toISOString(),
      ...(bonusAccessEndsAt ? { bonusAccessEndsAt: bonusAccessEndsAt.toISOString() } : {}),
      bonusAccessReason,
      amount,
      gstAmount,
      totalAmount,
      billingCycle,
    },
  });

  return NextResponse.json({
    success: true,
    orgId,
    planId,
    tier: normalizedTier,
    subscriptionStart: subscriptionStart.toISOString(),
    subscriptionEnd: subscriptionEnd.toISOString(),
  });
}
