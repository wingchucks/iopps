type JsonRecord = Record<string, unknown>;

export type NormalizedPlanTier = "free" | "standard" | "premium" | "school";
export type NormalizedSubscriptionStatus = "none" | "active" | "trialing" | "past_due" | "canceled" | "inactive";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  if (typeof value === "object" && value !== null && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export function normalizePlanTier(...values: unknown[]): NormalizedPlanTier {
  for (const value of values) {
    const candidate = text(value).toLowerCase();
    if (candidate === "standard" || candidate === "tier1" || candidate === "essential") {
      return "standard";
    }
    if (candidate === "premium" || candidate === "tier2" || candidate === "professional") {
      return "premium";
    }
    if (candidate === "school" || candidate === "tier3") {
      return "school";
    }
    if (candidate === "free" || candidate === "none" || candidate === "basic") {
      return "free";
    }
  }
  return "free";
}

export function normalizeSubscriptionStatus(...values: unknown[]): NormalizedSubscriptionStatus {
  for (const value of values) {
    const candidate = text(value).toLowerCase();
    if (!candidate) continue;
    if (candidate === "trial" || candidate === "trialing") return "trialing";
    if (candidate === "active" || candidate === "paid") return "active";
    if (candidate === "past_due" || candidate === "past due") return "past_due";
    if (candidate === "canceled" || candidate === "cancelled") return "canceled";
    if (candidate === "inactive" || candidate === "paused") return "inactive";
    if (candidate === "free" || candidate === "none") return "none";
  }

  return "none";
}

function hasSubscriptionEvidence(record: JsonRecord, subscription: JsonRecord): boolean {
  return Boolean(
    text(subscription.status) ||
    text(record.subscriptionStatus) ||
    text(subscription.paymentId) ||
    text(record.paymentId) ||
    numberValue(subscription.amountPaid) !== null ||
    numberValue(record.amountPaid) !== null ||
    numberValue(subscription.amount) !== null ||
    numberValue(record.amount) !== null ||
    numberValue(subscription.totalAmount) !== null ||
    numberValue(record.totalAmount) !== null ||
    iso(subscription.billingStartAt) ||
    iso(record.billingStartAt) ||
    iso(subscription.startAt) ||
    iso(subscription.subscriptionStart) ||
    iso(record.subscriptionStart) ||
    iso(subscription.subscriptionEnd) ||
    iso(record.subscriptionEnd) ||
    iso(subscription.expiresAt) ||
    iso(record.expiresAt) ||
    iso(subscription.bonusAccessGrantedAt) ||
    iso(record.bonusAccessGrantedAt) ||
    iso(subscription.bonusAccessEndsAt) ||
    iso(record.bonusAccessEndsAt) ||
    text(subscription.bonusAccessReason) ||
    text(record.bonusAccessReason)
  );
}

export function buildSubscriptionState(record: JsonRecord): JsonRecord {
  const subscription = (record.subscription && typeof record.subscription === "object")
    ? (record.subscription as JsonRecord)
    : {};

  const tier = normalizePlanTier(
    subscription.tier,
    record.subscriptionTier,
    record.plan,
    record.tier,
  );
  const inferredStatus = tier === "free"
    ? "none"
    : hasSubscriptionEvidence(record, subscription)
      ? "active"
      : "none";

  const status = normalizeSubscriptionStatus(
    subscription.status,
    record.subscriptionStatus,
    inferredStatus,
  );
  const billingStartAt =
    iso(subscription.billingStartAt) ||
    iso(record.billingStartAt) ||
    iso(subscription.startAt) ||
    iso(record.subscriptionStart) ||
    iso(subscription.subscriptionStart);
  const subscriptionEnd =
    iso(subscription.subscriptionEnd) ||
    iso(record.subscriptionEnd) ||
    iso(record.expiresAt) ||
    iso(subscription.expiresAt);
  const bonusAccessGrantedAt =
    iso(subscription.bonusAccessGrantedAt) ||
    iso(record.bonusAccessGrantedAt) ||
    iso(record.complimentaryAccessGrantedAt) ||
    iso(subscription.complimentaryAccessGrantedAt);
  const bonusAccessEndsAt =
    iso(subscription.bonusAccessEndsAt) ||
    iso(record.bonusAccessEndsAt) ||
    iso(record.complimentaryAccessEndsAt) ||
    iso(subscription.complimentaryAccessEndsAt);
  const bonusAccessReason =
    text(subscription.bonusAccessReason) ||
    text(record.bonusAccessReason) ||
    text(record.complimentaryAccessReason) ||
    text(subscription.complimentaryAccessReason);

  return {
    ...subscription,
    tier,
    status,
    ...(billingStartAt ? { billingStartAt } : {}),
    ...(subscriptionEnd ? { subscriptionEnd } : {}),
    ...(bonusAccessGrantedAt ? { bonusAccessGrantedAt } : {}),
    ...(bonusAccessEndsAt ? { bonusAccessEndsAt } : {}),
    ...(bonusAccessReason ? { bonusAccessReason } : {}),
  };
}

export function applyNormalizedSubscriptionState(record: JsonRecord): JsonRecord {
  const subscription = buildSubscriptionState(record);
  const tier = subscription.tier as NormalizedPlanTier;
  const status = subscription.status as NormalizedSubscriptionStatus;

  return {
    ...record,
    plan: tier,
    subscriptionTier: tier === "free" ? undefined : tier,
    subscriptionStatus: status,
    tier,
    subscription,
  };
}
