export function resolveSubscriptionExpirationTargets(subscription: {
  employerId?: unknown;
  orgId?: unknown;
  organizationId?: unknown;
}): { employerId: string; organizationId: string } {
  const legacyOrgId = typeof subscription.orgId === "string" ? subscription.orgId : "";
  const employerId = typeof subscription.employerId === "string" && subscription.employerId
    ? subscription.employerId
    : legacyOrgId;
  const organizationId = typeof subscription.organizationId === "string" && subscription.organizationId
    ? subscription.organizationId
    : legacyOrgId;
  return { employerId, organizationId };
}

export function subscriptionMatchesExpirationTargets(
  subscription: { employerId?: unknown; orgId?: unknown; organizationId?: unknown },
  targets: { employerId: string; organizationId: string },
): boolean {
  const targetIds = new Set([targets.employerId, targets.organizationId].filter(Boolean));
  return [subscription.employerId, subscription.orgId, subscription.organizationId]
    .some((value) => typeof value === "string" && targetIds.has(value));
}

export function buildExpiredSubscriptionAccessPatch(now: Date) {
  return {
    plan: "free",
    subscriptionTier: "free",
    subscriptionStatus: "expired",
    subscription: {
      tier: "free",
      status: "expired",
    },
    updatedAt: now,
  };
}
