type JsonRecord = Record<string, unknown>;

export type NormalizedPlanTier = "free" | "standard" | "premium" | "school";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    if (candidate === "standard" || candidate === "premium" || candidate === "school") {
      return candidate;
    }
    if (candidate === "free" || candidate === "none" || candidate === "basic") {
      return "free";
    }
  }
  return "free";
}

export function buildSubscriptionState(record: JsonRecord): JsonRecord {
  const subscription = (record.subscription && typeof record.subscription === "object")
    ? (record.subscription as JsonRecord)
    : {};

  const tier = normalizePlanTier(
    record.subscriptionTier,
    record.plan,
    record.tier,
    subscription.tier,
  );

  const status = text(record.subscriptionStatus) || text(subscription.status) || (tier === "free" ? "none" : "active");
  const billingStartAt =
    iso(record.billingStartAt) ||
    iso(subscription.billingStartAt) ||
    iso(record.subscriptionStart) ||
    iso(subscription.subscriptionStart);
  const subscriptionEnd =
    iso(record.subscriptionEnd) ||
    iso(subscription.subscriptionEnd) ||
    iso(record.expiresAt) ||
    iso(subscription.expiresAt);
  const bonusAccessGrantedAt =
    iso(record.bonusAccessGrantedAt) ||
    iso(subscription.bonusAccessGrantedAt) ||
    iso(record.complimentaryAccessGrantedAt) ||
    iso(subscription.complimentaryAccessGrantedAt);
  const bonusAccessEndsAt =
    iso(record.bonusAccessEndsAt) ||
    iso(subscription.bonusAccessEndsAt) ||
    iso(record.complimentaryAccessEndsAt) ||
    iso(subscription.complimentaryAccessEndsAt);
  const bonusAccessReason =
    text(record.bonusAccessReason) ||
    text(subscription.bonusAccessReason) ||
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

  return {
    ...record,
    plan: tier === "free" ? text(record.plan) || null : tier,
    subscriptionTier: tier === "free" ? text(record.subscriptionTier) || undefined : tier,
    tier:
      tier === "premium" || tier === "school" || tier === "standard"
        ? tier
        : record.tier,
    subscription,
  };
}
