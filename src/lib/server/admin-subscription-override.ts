import { FieldValue } from "firebase-admin/firestore";
import { normalizePlanTier } from "./subscription-state";

type PlanId = "tier1" | "tier2" | "tier3";

export interface SubscriptionOverrideBody {
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

